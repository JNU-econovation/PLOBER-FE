import { colors, shadows } from "@/src/shared/theme";
import {
  PrimaryBottomButton,
  ScreenRoot,
  StatNumber,
} from "@/src/shared/ui";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { useAuthSession } from "@/src/features/auth";
import { completePloggingSession } from "@/src/features/plogging-session/api/complete-plogging-session";
import type { CompletePloggingSessionRequest } from "@/src/features/plogging-session/api/types";
import { usePloggingSession } from "@/src/features/plogging-session/hooks/use-plogging-session";
import { uploadMapImage } from "@/src/features/plogging-session/services/upload-map-image";

import { RouteSnapshotMap } from "../components/route-snapshot-map";
import type { ReportMetric } from "../data/report-data";

const PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT = 70;
const FLOATING_SHARE_BUTTON_GAP = 18;
const FLOATING_SHARE_BUTTON_HEIGHT = 43;
const FLOATING_SHARE_BUTTON_SCROLL_GAP = 24;
const FLOATING_SHARE_BUTTON_BOB_DISTANCE = 5;
const SHARE_PREVIEW_WIDTH = 390;

type MapImageCaptureState = "idle" | "capturing" | "captured" | "error";
type MediaLibraryModule = typeof import("expo-media-library");
type PhotoSavePermissionResult = "denied" | "granted" | "unavailable";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateKo(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatHm(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatKilometersForRecord(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatHmDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}:${pad2(minutes)}`;
}

function getRouteSignature(
  points: { latitude: number; longitude: number }[]
): string {
  if (points.length === 0) return "empty";

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  const first = points[0];
  const last = points[points.length - 1];
  return [
    points.length,
    first.latitude.toFixed(6),
    first.longitude.toFixed(6),
    last.latitude.toFixed(6),
    last.longitude.toFixed(6),
    minLat.toFixed(6),
    maxLat.toFixed(6),
    minLng.toFixed(6),
    maxLng.toFixed(6),
  ].join(":");
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function sharePloggingImage({
  message,
  shareImageUri,
}: {
  message: string;
  shareImageUri: string;
}) {
  try {
    const Sharing = await import("expo-sharing");
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(shareImageUri, {
        UTI: "public.png",
        dialogTitle: "플로깅 기록 공유하기",
        mimeType: "image/png",
      });
      return;
    }
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-share] expo-sharing unavailable", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  await Share.share(
    {
      message,
      title: "플로깅 완료",
      url: shareImageUri,
    },
    {
      dialogTitle: "플로깅 기록 공유하기",
      subject: "플로깅 완료",
    }
  );
}

async function requestPhotoSavePermission(): Promise<PhotoSavePermissionResult> {
  const MediaLibrary = await loadMediaLibrary();
  if (!MediaLibrary) return "unavailable";

  const permission = await MediaLibrary.getPermissionsAsync(true);
  if (permission.granted) return "granted";

  const requestedPermission = await MediaLibrary.requestPermissionsAsync(true);
  return requestedPermission.granted ? "granted" : "denied";
}

async function loadMediaLibrary(): Promise<MediaLibraryModule | null> {
  try {
    return await import("expo-media-library");
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-report] media library unavailable", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return null;
  }
}

async function ensureSavablePngFileUri(uri: string): Promise<string> {
  const fileUri = normalizeLocalFileUri(uri);
  if (fileUri.split("?")[0].toLowerCase().endsWith(".png")) return fileUri;

  const baseDirectory =
    FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDirectory) return fileUri;

  const targetUri = `${baseDirectory}plogging-report-${Date.now()}.png`;
  await FileSystem.copyAsync({ from: fileUri, to: targetUri });
  return targetUri;
}

function normalizeLocalFileUri(uri: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) return uri;
  return `file://${uri}`;
}

function buildShareMessage({
  caloriesLabel,
  dateLabel,
  distanceKm,
  mapImageUrl,
  placeName,
  ploggingTimeLabel,
  stepCountLabel,
}: {
  caloriesLabel: string;
  dateLabel: string;
  distanceKm: string;
  mapImageUrl: string | null;
  placeName: string;
  ploggingTimeLabel: string;
  stepCountLabel: string;
}): string {
  const title = [
    dateLabel,
    placeName ? `${placeName}에서` : null,
    "플로깅을 완료했어요.",
  ]
    .filter(Boolean)
    .join(" ");
  const lines = [
    title,
    `거리 ${distanceKm}km · 시간 ${ploggingTimeLabel}`,
    `걸음 ${stepCountLabel}steps · 소모 칼로리 ${caloriesLabel}kcal`,
    "",
    "오늘도 깨끗한 길을 만들었어요.",
  ];

  if (mapImageUrl) {
    lines.push("", `경로 보기: ${mapImageUrl}`);
  }

  return lines.join("\n");
}

export function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const {
    caloriesBurned,
    distanceMeters,
    endCoord,
    finishedAtMs,
    mapImageObjectUrl,
    mapImageUri,
    mode,
    photoObjectUrls,
    photoUris,
    placeName,
    resetSession,
    restSeconds,
    routePoints,
    setMapImageObjectUrl,
    startCoord,
    startedAtMs,
    stepCount,
  } = usePloggingSession();
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [mapImageCaptureState, setMapImageCaptureState] =
    useState<MapImageCaptureState>("idle");
  const [completeButtonWaitingDots, setCompleteButtonWaitingDots] =
    useState("...");
  const submittedRef = useRef(false);
  const sharePreviewRef = useRef<View>(null);
  const shareButtonBottom =
    insets.bottom +
    PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT +
    FLOATING_SHARE_BUTTON_GAP;

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );

      return () => {
        subscription.remove();
      };
    }, [])
  );

  const hasRouteForMap = routePoints.length > 0;
  const mapImageCaptureFailed =
    hasRouteForMap && mapImageUri === null && mapImageCaptureState === "error";
  const completeButtonWaiting =
    hasRouteForMap && mapImageUri === null && !mapImageCaptureFailed;
  const completeButtonDisabled = submitting || completeButtonWaiting;
  const completeButtonTitle = completeButtonWaiting
    ? completeButtonWaitingDots
    : "플로깅 완료";

  useEffect(() => {
    if (!completeButtonWaiting) {
      setCompleteButtonWaitingDots("...");
      return;
    }

    const dotFrames = [".", "..", "..."];
    let frameIndex = 0;
    setCompleteButtonWaitingDots(dotFrames[frameIndex]);

    const intervalId = setInterval(() => {
      frameIndex = (frameIndex + 1) % dotFrames.length;
      setCompleteButtonWaitingDots(dotFrames[frameIndex]);
    }, 380);

    return () => {
      clearInterval(intervalId);
    };
  }, [completeButtonWaiting]);

  // 화면 표시용 값들. 컨텍스트에 값이 없으면 빈 문자열/0으로 떨어진다.
  const dateLabel = formatDateKo(startedAtMs);
  const timeRangeLabel =
    startedAtMs !== null && finishedAtMs !== null
      ? `${formatHm(startedAtMs)} → ${formatHm(finishedAtMs)}`
      : "";
  const modeLabel =
    mode === "RECOMMENDED" ? "AI 추천 · 완료" : "자유모드 · 완료";
  const distanceKm = formatKilometers(distanceMeters);
  const ploggingSecondsForView =
    startedAtMs !== null && finishedAtMs !== null
      ? Math.max(
          0,
          Math.floor((finishedAtMs - startedAtMs) / 1000) - restSeconds
        )
      : 0;
  const stepCountLabel = formatInteger(stepCount);
  const ploggingTimeLabel = formatHmDuration(ploggingSecondsForView);
  const caloriesLabel = formatInteger(caloriesBurned);
  const shareDistanceKm = formatKilometersForRecord(distanceMeters);
  const shareMapImageUri = mapImageUri ?? mapImageObjectUrl;
  const metrics: ReportMetric[] = [
    { label: "걸음 수", unit: "steps", value: stepCountLabel },
    { label: "플로깅 시간", unit: "H:M", value: ploggingTimeLabel },
    { label: "소모 칼로리", unit: "kcal", value: caloriesLabel },
    { label: "휴식", unit: "H:M", value: formatHmDuration(restSeconds) },
  ];

  const handleShare = useCallback(async () => {
    if (sharing) return;

    if (hasRouteForMap && !shareMapImageUri) {
      if (mapImageCaptureFailed) {
        Alert.alert(
          "공유 실패",
          "경로 지도 이미지를 만들지 못했습니다. 지도 영역에서 다시 시도해주세요."
        );
        return;
      }
      Alert.alert(
        "공유 준비 중",
        "경로가 그려진 공유 이미지를 만들고 있어요. 잠시 후 다시 시도해주세요."
      );
      return;
    }

    if (!sharePreviewRef.current) {
      Alert.alert("공유 실패", "공유 이미지를 만들 수 없습니다.");
      return;
    }

    const message = buildShareMessage({
      caloriesLabel,
      dateLabel,
      distanceKm,
      mapImageUrl: mapImageObjectUrl,
      placeName,
      ploggingTimeLabel,
      stepCountLabel,
    });

    setSharing(true);
    try {
      await waitForNextPaint();

      const shareImageUri = await captureRef(sharePreviewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      await sharePloggingImage({ message, shareImageUri });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "공유 이미지를 만들 수 없습니다.";
      Alert.alert("공유 실패", message);
    } finally {
      setSharing(false);
    }
  }, [
    caloriesLabel,
    dateLabel,
    distanceKm,
    hasRouteForMap,
    mapImageCaptureFailed,
    mapImageObjectUrl,
    placeName,
    ploggingTimeLabel,
    shareMapImageUri,
    sharing,
    stepCountLabel,
  ]);

  const handleSaveImage = useCallback(async () => {
    if (savingImage) return;

    if (Platform.OS === "web") {
      Alert.alert(
        "저장 미지원",
        "리포트 이미지는 모바일 앱에서 사진 앱에 저장할 수 있습니다."
      );
      return;
    }

    if (hasRouteForMap && !shareMapImageUri) {
      if (mapImageCaptureFailed) {
        Alert.alert(
          "저장 실패",
          "경로 지도 이미지를 만들지 못했습니다. 지도 영역에서 다시 시도해주세요."
        );
        return;
      }
      Alert.alert(
        "저장 준비 중",
        "경로가 그려진 저장 이미지를 만들고 있어요. 잠시 후 다시 시도해주세요."
      );
      return;
    }

    if (!sharePreviewRef.current) {
      Alert.alert("저장 실패", "저장할 리포트 이미지를 만들 수 없습니다.");
      return;
    }

    setSavingImage(true);
    try {
      const permissionResult = await requestPhotoSavePermission();
      if (permissionResult === "unavailable") {
        Alert.alert(
          "저장 미지원",
          "현재 실행 환경에서는 사진 앱 저장을 사용할 수 없습니다. 개발 빌드나 실제 앱 빌드에서 다시 시도해주세요."
        );
        return;
      }
      if (permissionResult === "denied") {
        Alert.alert(
          "저장 실패",
          "사진 앱에 저장하려면 사진 추가 권한이 필요합니다."
        );
        return;
      }

      await waitForNextPaint();

      const imageUri = await captureRef(sharePreviewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const savableImageUri = await ensureSavablePngFileUri(imageUri);

      const MediaLibrary = await loadMediaLibrary();
      if (!MediaLibrary) {
        Alert.alert(
          "저장 미지원",
          "현재 실행 환경에서는 사진 앱 저장을 사용할 수 없습니다. 개발 빌드나 실제 앱 빌드에서 다시 시도해주세요."
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(savableImageUri);
      Alert.alert(
        "저장 완료",
        "플로깅 리포트 이미지를 사진 앱에 저장했습니다."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "플로깅 리포트 이미지를 저장하지 못했습니다.";
      Alert.alert("저장 실패", message);
    } finally {
      setSavingImage(false);
    }
  }, [hasRouteForMap, mapImageCaptureFailed, savingImage, shareMapImageUri]);

  const handleComplete = useCallback(async () => {
    if (submittedRef.current || submitting || completeButtonWaiting) return;

    if (startedAtMs === null) {
      Alert.alert("저장 실패", "플로깅 시작 정보가 없습니다.");
      return;
    }
    if (!session?.userId) {
      Alert.alert("저장 실패", "로그인 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }
    if (!hasRouteForMap) {
      resetSession();
      router.replace("/");
      Alert.alert(
        "플로깅 취소",
        "경로 정보가 없어 이번 플로깅은 기록하지 않았습니다."
      );
      return;
    }
    if (mapImageCaptureFailed) {
      Alert.alert(
        "저장 실패",
        "경로 지도 이미지를 만들지 못했습니다. 지도 영역에서 다시 시도해주세요."
      );
      return;
    }
    if (!mapImageUri) {
      Alert.alert(
        "잠시만요",
        "경로가 그려진 지도 이미지를 생성하고 있어요. 잠시 후 다시 시도해주세요."
      );
      return;
    }
    const finishedAt = finishedAtMs ?? Date.now();
    const ploggingSeconds = Math.max(
      0,
      Math.floor((finishedAt - startedAtMs) / 1000) - restSeconds
    );
    // 업로드 성공한 사진만 백엔드로 보낸다(로컬 URI는 서버가 접근 불가).
    const photoUrls = photoUris
      .map((uri) => photoObjectUrls[uri])
      .filter((url): url is string => Boolean(url));

    submittedRef.current = true;
    setSubmitting(true);
    try {
      let resolvedMapImageUrl = mapImageObjectUrl;
      if (!resolvedMapImageUrl) {
        const uploadResult = await uploadMapImage(
          mapImageUri,
          session.userId,
          "image/png"
        );
        if (uploadResult.status !== "uploaded") {
          throw new Error(uploadResult.message);
        }
        resolvedMapImageUrl = uploadResult.objectUrl;
        setMapImageObjectUrl(uploadResult.objectUrl);
      }

      const payload: CompletePloggingSessionRequest = {
        mode,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        distanceMeters: Math.round(distanceMeters),
        stepCount: Math.round(stepCount),
        caloriesBurned: Math.round(caloriesBurned),
        ploggingSeconds,
        restSeconds,
        placeName: placeName || "",
        startLatitude: startCoord?.latitude ?? 0,
        startLongitude: startCoord?.longitude ?? 0,
        endLatitude: endCoord?.latitude ?? 0,
        endLongitude: endCoord?.longitude ?? 0,
        routePoints,
        mapImageUrl: resolvedMapImageUrl,
        photoUrls,
      };
      if (__DEV__) {
        console.log("[plogging-complete] requestBody", {
          ...payload,
          mapImageUrl: Boolean(payload.mapImageUrl),
          photoUrls: `${payload.photoUrls.length} photos`,
          routePoints: `${payload.routePoints.length} points`,
        });
      }

      await completePloggingSession({
        payload,
        userId: session.userId,
      });
      resetSession();
      router.replace("/history");
    } catch (error) {
      submittedRef.current = false;
      const message =
        error instanceof Error
          ? error.message
          : "플로깅 기록 저장에 실패했습니다.";
      Alert.alert("저장 실패", message);
    } finally {
      setSubmitting(false);
    }
  }, [
    caloriesBurned,
    completeButtonWaiting,
    distanceMeters,
    endCoord,
    finishedAtMs,
    hasRouteForMap,
    mapImageCaptureFailed,
    mapImageObjectUrl,
    mapImageUri,
    mode,
    photoObjectUrls,
    photoUris,
    placeName,
    resetSession,
    restSeconds,
    routePoints,
    router,
    session?.userId,
    setMapImageObjectUrl,
    startCoord,
    startedAtMs,
    stepCount,
    submitting,
  ]);

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 44) + 16,
            paddingBottom:
              shareButtonBottom +
              FLOATING_SHARE_BUTTON_HEIGHT +
              FLOATING_SHARE_BUTTON_SCROLL_GAP,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ReportHeader
          modeLabel={modeLabel}
          onSave={handleSaveImage}
          saving={savingImage}
        />
        <ReportTitleBlock
          dateLabel={dateLabel}
          placeName={placeName}
          timeRangeLabel={timeRangeLabel}
        />
        <DistanceSummaryCard
          distanceKm={distanceKm}
          onMapImageCaptureStateChange={setMapImageCaptureState}
        />
        <ReportMetricsCard metrics={metrics} />
        <PhotoGallery photoUris={photoUris} />
      </ScrollView>
      <ShareButton
        bottom={shareButtonBottom}
        disabled={sharing}
        onPress={handleShare}
      />
      <PrimaryBottomButton
        accessibilityLabel={
          completeButtonWaiting ? "완료 준비 중" : "플로깅 완료"
        }
        disabled={completeButtonDisabled}
        onPress={handleComplete}
        title={completeButtonTitle}
      />
      {submitting ? <SubmittingOverlay /> : null}
      <View
        ref={sharePreviewRef}
        collapsable={false}
        pointerEvents="none"
        style={styles.sharePreviewHost}
      >
        <SharePreviewCard
          dateLabel={dateLabel}
          distanceKm={shareDistanceKm}
          mapImageUri={shareMapImageUri}
          metrics={metrics}
          modeLabel={modeLabel}
          photoUris={photoUris}
          placeName={placeName}
          timeRangeLabel={timeRangeLabel}
        />
      </View>
    </ScreenRoot>
  );
}

function SubmittingOverlay() {
  return (
    <View
      accessibilityLabel="저장 중"
      accessibilityRole="progressbar"
      style={styles.submittingOverlay}
    >
      <View style={styles.submittingIndicator}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    </View>
  );
}

function ReportHeader({
  modeLabel,
  onSave,
  saving,
}: {
  modeLabel: string;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityLabel={saving ? "저장 중" : "저장하기"}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          hitSlop={8}
          onPress={onSave}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
            saving ? styles.disabled : null,
          ]}
        >
          <Feather color={colors.icon} name="download" size={20} />
        </Pressable>
      </View>
      <View style={styles.statusPill}>
        <Text selectable style={styles.statusText}>
          {modeLabel}
        </Text>
      </View>
    </>
  );
}

function ReportTitleBlock({
  dateLabel,
  placeName,
  timeRangeLabel,
}: {
  dateLabel: string;
  placeName: string;
  timeRangeLabel: string;
}) {
  return (
    <>
      <Text selectable style={styles.reportTitle}>
        <Text style={styles.reportTitleBold}>{dateLabel}</Text> 플로깅
      </Text>
      <Text selectable style={styles.reportSubTitle}>
        {timeRangeLabel}
        {placeName ? (
          <>
            {" · "}
            <Text style={styles.reportSubTitleBold}>{placeName}</Text>
          </>
        ) : null}
      </Text>
    </>
  );
}

function DistanceSummaryCard({
  distanceKm,
  onMapImageCaptureStateChange,
}: {
  distanceKm: string;
  onMapImageCaptureStateChange: (state: MapImageCaptureState) => void;
}) {
  const {
    mapImageUri,
    routePoints,
    setMapImageObjectUrl,
    setMapImageUri,
  } = usePloggingSession();
  // 좌표가 1개라도 있으면 마커로 캡처, 0개일 때만 placeholder.
  const hasRoute = routePoints.length >= 1;
  const [mapImageCaptureState, setMapImageCaptureState] =
    useState<MapImageCaptureState>("idle");
  const [captureRetryKey, setCaptureRetryKey] = useState(0);
  const routeSignature = useMemo(
    () => getRouteSignature(routePoints),
    [routePoints]
  );
  const capturedRouteSignatureRef = useRef<string | null>(
    mapImageUri ? routeSignature : null
  );

  const updateMapImageCaptureState = useCallback(
    (state: MapImageCaptureState) => {
      setMapImageCaptureState(state);
      onMapImageCaptureStateChange(state);
    },
    [onMapImageCaptureStateChange]
  );

  useEffect(() => {
    let nextState: MapImageCaptureState | null = null;

    if (!hasRoute) {
      nextState = "idle";
    } else if (mapImageUri) {
      nextState = "captured";
    } else if (
      mapImageCaptureState !== "capturing" &&
      mapImageCaptureState !== "error"
    ) {
      nextState = "capturing";
    }

    if (nextState !== null && nextState !== mapImageCaptureState) {
      updateMapImageCaptureState(nextState);
    }
  }, [hasRoute, mapImageCaptureState, mapImageUri, updateMapImageCaptureState]);

  const handleMapCaptured = useCallback(
    (uri: string) => {
      capturedRouteSignatureRef.current = routeSignature;
      setMapImageUri(uri);
      updateMapImageCaptureState("captured");
    },
    [routeSignature, setMapImageUri, updateMapImageCaptureState]
  );

  const handleMapCaptureFailed = useCallback(() => {
    updateMapImageCaptureState("error");
  }, [updateMapImageCaptureState]);

  const handleRetryMapCapture = useCallback(() => {
    capturedRouteSignatureRef.current = null;
    setMapImageObjectUrl(null);
    setMapImageUri(null);
    updateMapImageCaptureState("capturing");
    setCaptureRetryKey((key) => key + 1);
  }, [
    setMapImageObjectUrl,
    setMapImageUri,
    updateMapImageCaptureState,
  ]);

  useEffect(() => {
    if (!hasRoute) {
      capturedRouteSignatureRef.current = null;
      return;
    }
    if (
      !mapImageUri ||
      capturedRouteSignatureRef.current === null ||
      capturedRouteSignatureRef.current === routeSignature
    ) {
      return;
    }

    capturedRouteSignatureRef.current = null;
    setMapImageObjectUrl(null);
    setMapImageUri(null);
    updateMapImageCaptureState("capturing");
  }, [
    hasRoute,
    mapImageUri,
    routeSignature,
    setMapImageObjectUrl,
    setMapImageUri,
    updateMapImageCaptureState,
  ]);

  return (
    <View style={styles.distanceCard}>
      <Text selectable style={styles.cardCaption}>
        DISTANCE
      </Text>
      <View style={styles.distanceHeader}>
        <StatNumber size={36} unit="km" value={distanceKm} />
      </View>
      <View style={styles.miniMap}>
        {mapImageUri ? (
          <Image
            accessibilityLabel="플로깅 경로 이미지"
            source={{ uri: mapImageUri }}
            style={styles.miniMapImage}
          />
        ) : hasRoute && mapImageCaptureState === "error" ? (
          <View style={styles.miniMapEmpty}>
            <Text selectable style={styles.miniMapEmptyText}>
              지도 이미지를 만들 수 없습니다.
            </Text>
            <Pressable
              accessibilityLabel="지도 이미지 다시 만들기"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleRetryMapCapture}
              style={({ pressed }) => [
                styles.miniMapRetryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text selectable style={styles.miniMapRetryText}>
                다시 시도
              </Text>
            </Pressable>
          </View>
        ) : hasRoute ? (
          <RouteSnapshotMap
            key={captureRetryKey}
            onCaptured={handleMapCaptured}
            onCaptureFailed={handleMapCaptureFailed}
            routePoints={routePoints}
          />
        ) : (
          <View style={styles.miniMapEmpty}>
            <Text selectable style={styles.miniMapEmptyText}>
              경로 정보가 없습니다.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ReportMetricsCard({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <View style={styles.metricsCard}>
      {metrics.map((metric) => (
        <MetricCell key={metric.label} metric={metric} />
      ))}
    </View>
  );
}

function MetricCell({ metric }: { metric: ReportMetric }) {
  return (
    <View style={styles.metricCell}>
      <Text selectable style={styles.metricLabel}>
        {metric.label}
      </Text>
      <StatNumber size={24} unit={metric.unit} value={metric.value} />
    </View>
  );
}

function SharePreviewCard({
  dateLabel,
  distanceKm,
  mapImageUri,
  metrics,
  modeLabel,
  photoUris,
  placeName,
  timeRangeLabel,
}: {
  dateLabel: string;
  distanceKm: string;
  mapImageUri: string | null;
  metrics: ReportMetric[];
  modeLabel: string;
  photoUris: string[];
  placeName: string;
  timeRangeLabel: string;
}) {
  return (
    <View style={styles.sharePreviewCanvas}>
      <View style={styles.statusPill}>
        <Text selectable style={styles.statusText}>
          {modeLabel}
        </Text>
      </View>

      {dateLabel ? (
        <Text selectable style={styles.reportTitle}>
          <Text style={styles.reportTitleBold}>{dateLabel}</Text> 플로깅
        </Text>
      ) : null}
      {timeRangeLabel ? (
        <Text selectable style={styles.reportSubTitle}>
          {timeRangeLabel}
          {placeName ? (
            <>
              {" · "}
              <Text style={styles.reportSubTitleBold}>{placeName}</Text>
            </>
          ) : null}
        </Text>
      ) : null}

      <View style={styles.distanceCard}>
        <Text selectable style={styles.cardCaption}>
          DISTANCE
        </Text>
        <View style={styles.distanceHeader}>
          <StatNumber size={36} unit="km" value={distanceKm} />
        </View>
        <View style={styles.miniMap}>
          {mapImageUri ? (
            <Image
              accessibilityLabel="플로깅 경로 이미지"
              source={{ uri: mapImageUri }}
              style={styles.miniMapImage}
            />
          ) : (
            <View style={styles.miniMapEmpty}>
              <Text selectable style={styles.miniMapEmptyText}>
                지도 이미지가 없습니다.
              </Text>
            </View>
          )}
        </View>
      </View>

      <ReportMetricsCard metrics={metrics} />
      <SharePreviewPhotoSection photoUris={photoUris} />
    </View>
  );
}

function SharePreviewPhotoSection({ photoUris }: { photoUris: string[] }) {
  if (photoUris.length === 0) return null;

  return (
    <View style={styles.sharePhotoSection}>
      <Text selectable style={styles.sharePhotoSectionTitle}>
        인증샷
      </Text>
      <ScrollView
        contentContainerStyle={styles.sharePhotoStripContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {photoUris.map((uri) => (
          <Image
            key={uri}
            accessibilityLabel="플로깅 인증샷"
            source={{ uri }}
            style={styles.sharePhotoThumb}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// 참고 UI: 인증샷 4장을 한 줄에 균등 배치한 갤러리 섹션.
// 사진이 4장 미만이면 가능한 만큼만 보여주고, 0장이면 섹션 자체를 숨긴다.
function PhotoGallery({ photoUris }: { photoUris: string[] }) {
  if (photoUris.length === 0) return null;

  // 참고 UI는 한 행에 최대 4장이 꽉 차게 배치되어 있다.
  const visiblePhotos = photoUris.slice(0, 4);

  return (
    <View style={styles.photoGallery}>
      {visiblePhotos.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          accessibilityLabel="플로깅 인증샷"
          source={{ uri }}
          style={styles.photoTile}
        />
      ))}
    </View>
  );
}

// 참고 UI: 메모카드 없이 SNS 공유 버튼만 단독으로 배치한다.
function ShareButton({
  bottom,
  disabled,
  onPress,
}: {
  bottom: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const bobTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disabled) {
      bobTranslateY.stopAnimation(() => {
        bobTranslateY.setValue(0);
      });
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bobTranslateY, {
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          toValue: -FLOATING_SHARE_BUTTON_BOB_DISTANCE,
          useNativeDriver: true,
        }),
        Animated.timing(bobTranslateY, {
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.delay(420),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      bobTranslateY.setValue(0);
    };
  }, [bobTranslateY, disabled]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.shareButtonOverlay, { bottom }]}
    >
      <Animated.View style={{ transform: [{ translateY: bobTranslateY }] }}>
        <Pressable
          accessibilityLabel="SNS 공유하기"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={8}
          onPress={onPress}
          style={({ pressed }) => [
            styles.shareButton,
            pressed ? styles.pressed : null,
            disabled ? styles.disabled : null,
          ]}
        >
          <Feather color={colors.icon} name="upload" size={19} />
          <Text selectable style={styles.shareText}>
            SNS 공유하기
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardCaption: {
    color: colors.subtle,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  content: {
    gap: 14,
    paddingBottom: 150,
    paddingHorizontal: 22,
  },
  distanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: 12,
    minHeight: 311,
    padding: 20,
    ...shadows.raised,
  },
  distanceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  disabled: {
    opacity: 0.5,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
    ...shadows.soft,
  },
  metricCell: {
    gap: 8,
    width: "46%",
  },
  metricLabel: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  metricsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
    minHeight: 162,
    paddingHorizontal: 24,
    paddingVertical: 22,
    ...shadows.raised,
  },
  miniMap: {
    borderRadius: 24,
    flex: 1,
    minHeight: 196,
    overflow: "hidden",
    backgroundColor: colors.line,
  },
  miniMapImage: {
    backgroundColor: colors.line,
    height: "100%",
    resizeMode: "contain",
    width: "100%",
  },
  miniMapEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  miniMapEmptyText: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: "500",
  },
  miniMapRetryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  miniMapRetryText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
  },
  // 인증샷 갤러리: 한 행에 4칸이 꽉 차게, 사진 사이는 살짝 간격을 둔다.
  photoGallery: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  photoTile: {
    aspectRatio: 1,
    backgroundColor: colors.line,
    borderRadius: 12,
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  reportSubTitle: {
    color: colors.text,
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 2,
  },
  reportSubTitleBold: {
    fontWeight: "600",
  },
  reportTitle: {
    color: colors.text,
    fontSize: 28,
    letterSpacing: 0,
    marginTop: 8,
  },
  reportTitleBold: {
    fontWeight: "800",
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRadius: 27,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    height: FLOATING_SHARE_BUTTON_HEIGHT,
    paddingHorizontal: 23,
    ...shadows.soft,
  },
  shareButtonOverlay: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  shareText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  sharePhotoSection: {
    gap: 10,
    marginTop: 4,
  },
  sharePhotoSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
  },
  sharePhotoStripContent: {
    gap: 10,
    paddingVertical: 2,
  },
  sharePhotoThumb: {
    backgroundColor: colors.line,
    borderRadius: 16,
    height: 110,
    width: 110,
  },
  sharePreviewCanvas: {
    backgroundColor: colors.background,
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 24,
    width: SHARE_PREVIEW_WIDTH,
  },
  sharePreviewHost: {
    left: -10000,
    position: "absolute",
    top: 0,
    width: SHARE_PREVIEW_WIDTH,
  },
  submittingIndicator: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
    ...shadows.raised,
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(252, 252, 253, 0.32)",
    justifyContent: "center",
    zIndex: 20,
  },
  statusPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
