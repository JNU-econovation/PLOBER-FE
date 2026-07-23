import {
  colors,
  fontFamilies,
  getSafeLineHeight,
  shadows,
} from "@/src/shared/theme";
import { PrimaryBottomButton, ScreenRoot } from "@/src/shared/ui";
import { Image as ExpoImage } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { useAuthSession } from "@/src/features/auth";
import { getCrewPloggingSession } from "@/src/features/crew/api";
import {
  CrewPhotoComposer,
  ReportShareSheet,
} from "@/src/features/crew/components/crew-report-overlays";
import type { CrewPloggingRouteContext } from "@/src/features/crew/model";
import type { CrewPloggingRecordDetail } from "@/src/features/crew/types";
import { getUserProfile, type UserProfile } from "@/src/features/profile/api";
import { completePloggingSession } from "@/src/features/plogging-session/api/complete-plogging-session";
import type { CompletePloggingSessionRequest } from "@/src/features/plogging-session/api/types";
import { usePloggingSession } from "@/src/features/plogging-session/hooks/use-plogging-session";
import { uploadMapImage } from "@/src/features/plogging-session/services/upload-map-image";
import { uploadPloggingPhoto } from "@/src/features/plogging-session/services/upload-plogging-photo";
import { ApiError } from "@/src/shared/api";
import { useDeviceLocation } from "@/src/shared/location";

import {
  PersonalReportPoster,
  type PersonalReportPosterData,
} from "../components/personal-report-poster";
import { PersonalReportShareSheet } from "../components/personal-report-share-sheet";
import { RouteSnapshotMap } from "../components/route-snapshot-map";
import type { ReportMetric } from "../data/report-data";

const PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT = 70;
const FLOATING_SHARE_BUTTON_GAP = 16;
const FLOATING_SHARE_BUTTON_HEIGHT = 46;
const FLOATING_SHARE_BUTTON_SCROLL_GAP = 24;
const REPORT_CONTENT_HORIZONTAL_PADDING = 24;
const REPORT_PHOTO_GAP = 8;
const REPORT_PHOTO_MAX_WIDTH = 91;
const REPORT_PHOTO_ASPECT_RATIO = 91 / 105;

const reportIcons = {
  back: require("@/assets/icons/figma-route-back.svg"),
  crewAdd: require("@/assets/icons/crew-cta-plus.svg"),
  photoClose: require("@/assets/icons/figma-photo-close.svg"),
  photoSave: require("@/assets/icons/figma-photo-save.svg"),
  reportSave: require("@/assets/icons/figma-report-save.svg"),
  share: require("@/assets/icons/crew-share.svg"),
} as const;

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

function buildRouteOverlaySvgUri(
  points: { latitude: number; longitude: number }[]
): string | null {
  const validPoints = points.filter(
    (point) =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );
  if (validPoints.length < 2) return null;

  const maxRenderedPoints = 500;
  const renderedPoints =
    validPoints.length <= maxRenderedPoints
      ? validPoints
      : Array.from({ length: maxRenderedPoints }, (_, index) =>
          validPoints[
            Math.round(
              (index * (validPoints.length - 1)) / (maxRenderedPoints - 1)
            )
          ]
        );
  const viewWidth = 192;
  const viewHeight = 164;
  const padding = 12;
  const averageLatitude =
    renderedPoints.reduce((sum, point) => sum + point.latitude, 0) /
    renderedPoints.length;
  const longitudeScale = Math.max(
    0.01,
    Math.cos((averageLatitude * Math.PI) / 180)
  );
  const projectedPoints = renderedPoints.map((point) => ({
    x: point.longitude * longitudeScale,
    y: point.latitude,
  }));
  const projectedXs = projectedPoints.map((point) => point.x);
  const projectedYs = projectedPoints.map((point) => point.y);
  const minX = Math.min(...projectedXs);
  const maxX = Math.max(...projectedXs);
  const minY = Math.min(...projectedYs);
  const maxY = Math.max(...projectedYs);
  const xRange = maxX - minX;
  const yRange = maxY - minY;
  if (xRange < Number.EPSILON && yRange < Number.EPSILON) return null;

  const availableWidth = viewWidth - padding * 2;
  const availableHeight = viewHeight - padding * 2;
  const scale = Math.min(
    xRange > Number.EPSILON ? availableWidth / xRange : Infinity,
    yRange > Number.EPSILON ? availableHeight / yRange : Infinity
  );
  const renderedWidth = xRange * scale;
  const renderedHeight = yRange * scale;
  const offsetX = (viewWidth - renderedWidth) / 2;
  const offsetY = (viewHeight - renderedHeight) / 2;
  const routeCoordinates = projectedPoints.map((point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (maxY - point.y) * scale,
  }));
  const path = routeCoordinates
    .map((point, index) => {
      const { x, y } = point;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const start = routeCoordinates[0];
  const end = routeCoordinates[routeCoordinates.length - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth}" height="${viewHeight}" viewBox="0 0 ${viewWidth} ${viewHeight}"><path d="${path}" fill="none" stroke="#FFFFFF" stroke-opacity="0.82" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#2A88CD" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${start.x.toFixed(2)}" cy="${start.y.toFixed(2)}" r="5" fill="#FFFFFF" stroke="#2A88CD" stroke-width="3"/><circle cx="${end.x.toFixed(2)}" cy="${end.y.toFixed(2)}" r="6" fill="#2A88CD" stroke="#FFFFFF" stroke-width="3"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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

function getPhotoContentType(
  uri: string
): "image/avif" | "image/heic" | "image/heif" | "image/jpeg" | "image/png" | "image/webp" {
  const path = uri.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".heic")) return "image/heic";
  if (path.endsWith(".heif")) return "image/heif";
  if (path.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

function hasSubmissionDeadlinePassed(value: string | null): boolean {
  if (!value) return false;
  const deadlineMs = new Date(value).getTime();
  return Number.isFinite(deadlineMs) && Date.now() >= deadlineMs;
}

function isValidCoordinate(
  point: { latitude: number; longitude: number } | null | undefined,
): point is { latitude: number; longitude: number } {
  return Boolean(
    point &&
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180 &&
      !(point.latitude === 0 && point.longitude === 0),
  );
}

function shouldVerifyCrewSubmission(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 409 || error.status === undefined || error.status === 0)
  );
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

export function ReportScreen({
  crewContext = null,
}: {
  crewContext?: CrewPloggingRouteContext | null;
} = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const { position } = useDeviceLocation();
  const {
    addPhotoObjectUrl,
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
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [crewPhotoComposerVisible, setCrewPhotoComposerVisible] =
    useState(false);
  const [crewShareSheetVisible, setCrewShareSheetVisible] = useState(false);
  const [crewSharePhotoIds, setCrewSharePhotoIds] = useState<
    number[] | undefined
  >();
  const [crewParticipantCount, setCrewParticipantCount] = useState<
    number | null
  >(null);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [photoOverlayVisible, setPhotoOverlayVisible] = useState(false);
  const [photoHintVisible, setPhotoHintVisible] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }

    let disposed = false;
    getUserProfile()
      .then((nextProfile) => {
        if (!disposed) setProfile(nextProfile);
      })
      .catch(() => {
        if (!disposed) setProfile(null);
      });

    return () => {
      disposed = true;
    };
  }, [session]);

  useEffect(() => {
    const crewSessionId = crewContext?.sessionId;
    if (!crewSessionId) {
      setCrewParticipantCount(null);
      return;
    }

    let disposed = false;
    getCrewPloggingSession({ sessionId: crewSessionId })
      .then((crewSession) => {
        if (!disposed) {
          setCrewParticipantCount(Math.max(1, crewSession.participantCount));
        }
      })
      .catch(() => {
        if (!disposed) setCrewParticipantCount(null);
      });

    return () => {
      disposed = true;
    };
  }, [crewContext?.sessionId]);

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
    ? `기록 준비 중${completeButtonWaitingDots}`
    : "플로깅 완료";

  const navigateAfterCrewSubmission = useCallback(() => {
    if (!crewContext) return;
    router.replace({
      pathname: "/crews/[crewId]/sessions/[sessionId]",
      params: {
        crewId: String(crewContext.crewId),
        role: crewContext.role,
        sessionId: String(crewContext.sessionId),
      },
    });
  }, [crewContext, router]);

  const navigateToCrewRecord = useCallback(() => {
    if (!crewContext) return;
    router.replace({
      pathname: "/crews/[crewId]/records/[sessionId]",
      params: {
        crewId: String(crewContext.crewId),
        sessionId: String(crewContext.sessionId),
      },
    });
  }, [crewContext, router]);

  const handleBack = useCallback(() => {
    if (submitting) return;

    Alert.alert(
      "기록을 저장하지 않고 나갈까요?",
      "지금 나가면 이번 플로깅 기록이 저장되지 않습니다.",
      [
        { style: "cancel", text: "계속 작성" },
        {
          onPress: () => {
            resetSession();
            if (crewContext) {
              router.replace({
                pathname: "/crews/[crewId]",
                params: { crewId: String(crewContext.crewId) },
              });
              return;
            }
            router.replace("/");
          },
          style: "destructive",
          text: "나가기",
        },
      ],
    );
  }, [crewContext, resetSession, router, submitting]);

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
      ? `${formatHm(startedAtMs)} - ${formatHm(finishedAtMs)}`
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
  const shareDistanceKm = formatKilometers(distanceMeters);
  const shareMapImageUri = mapImageUri ?? mapImageObjectUrl;
  const photoRouteOverlayUri = useMemo(
    () => buildRouteOverlaySvgUri(routePoints),
    [routePoints]
  );
  const overviewMetrics: ReportMetric[] = [
    { label: "이동 거리", unit: "km", value: distanceKm },
    { label: "걸음 수", unit: "steps", value: stepCountLabel },
    { label: "플로깅 시간", unit: "H:M", value: ploggingTimeLabel },
  ];
  const posterData: PersonalReportPosterData = {
    caloriesLabel,
    dateValue: startedAtMs,
    distanceKm: shareDistanceKm,
    modeLabel: mode === "RECOMMENDED" ? "AI 추천" : "자유모드",
    photoUris,
    placeName,
    ploggingTimeLabel,
    routeImageUri: photoRouteOverlayUri,
    stepCountLabel,
  };
  const crewReportRecord = useMemo<CrewPloggingRecordDetail | null>(() => {
    if (!crewContext) return null;

    const startedAt = new Date(startedAtMs ?? Date.now()).toISOString();
    const endedAt = new Date(finishedAtMs ?? Date.now()).toISOString();
    const uploaderUserId = session?.userId ?? 0;
    const uploaderNickname = profile?.nickname ?? session?.nickname ?? "나";

    return {
      caloriesBurned: Math.round(caloriesBurned),
      crewPloggingSessionId: crewContext.sessionId,
      distanceMeters: Math.round(distanceMeters),
      endedAt,
      mapImageUrl: null,
      mode: "FREE",
      participantCount: Math.max(1, crewParticipantCount ?? 1),
      participants: [
        {
          nickname: uploaderNickname,
          profileImageUrl: profile?.profileImageUrl ?? null,
          userId: uploaderUserId,
        },
      ],
      photos: photoUris.map((uri, index) => ({
        objectUrl: uri,
        photoId: index + 1,
        registeredAt: endedAt,
        uploaderNickname,
        uploaderProfileImageUrl: profile?.profileImageUrl ?? null,
        uploaderUserId,
      })),
      placeName: placeName || null,
      ploggingSeconds: ploggingSecondsForView,
      representativeNickname: uploaderNickname,
      representativeUserId: uploaderUserId,
      startedAt,
      stepCount: Math.round(stepCount),
    };
  }, [
    caloriesBurned,
    crewContext,
    crewParticipantCount,
    distanceMeters,
    finishedAtMs,
    photoUris,
    placeName,
    ploggingSecondsForView,
    profile,
    session,
    startedAtMs,
    stepCount,
  ]);
  const crewShareMessage = buildShareMessage({
    caloriesLabel,
    dateLabel,
    distanceKm,
    mapImageUrl: mapImageObjectUrl,
    placeName,
    ploggingTimeLabel,
    stepCountLabel,
  });

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

  const handleSaveSelectedPhoto = useCallback(async () => {
    if (savingImage || photoViewerIndex === null) return;
    const selectedPhoto = photoUris[photoViewerIndex];
    if (!selectedPhoto) return;

    if (Platform.OS === "web") {
      Alert.alert("저장 미지원", "사진 저장은 모바일 앱에서 사용할 수 있습니다.");
      return;
    }

    setSavingImage(true);
    try {
      const permissionResult = await requestPhotoSavePermission();
      if (permissionResult !== "granted") {
        Alert.alert(
          "저장 실패",
          permissionResult === "denied"
            ? "사진 앱에 저장하려면 사진 추가 권한이 필요합니다."
            : "현재 실행 환경에서는 사진 앱 저장을 사용할 수 없습니다."
        );
        return;
      }

      const MediaLibrary = await loadMediaLibrary();
      if (!MediaLibrary) {
        Alert.alert("저장 미지원", "현재 실행 환경에서는 사진 앱 저장을 사용할 수 없습니다.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(normalizeLocalFileUri(selectedPhoto));
      Alert.alert("저장 완료", "인증샷을 사진 앱에 저장했습니다.");
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error ? error.message : "사진을 저장하지 못했습니다."
      );
    } finally {
      setSavingImage(false);
    }
  }, [photoUris, photoViewerIndex, savingImage]);

  const openPhotoViewer = useCallback((index: number) => {
    setPhotoViewerIndex(index);
    setPhotoOverlayVisible(false);
    setPhotoHintVisible(true);
  }, []);

  const handleComplete = useCallback(async () => {
    if (submittedRef.current || submitting || completeButtonWaiting) return;

    if (startedAtMs === null) {
      Alert.alert("저장 실패", "플로깅 시작 정보가 없습니다.");
      return;
    }
    if (!session) {
      Alert.alert("저장 실패", "로그인 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }
    if (!hasRouteForMap && !crewContext) {
      resetSession();
      router.replace("/");
      Alert.alert(
        "플로깅 취소",
        "경로 정보가 없어 이번 플로깅은 기록하지 않았습니다."
      );
      return;
    }
    if (mapImageCaptureFailed && !crewContext) {
      Alert.alert(
        "저장 실패",
        "경로 지도 이미지를 만들지 못했습니다. 지도 영역에서 다시 시도해주세요."
      );
      return;
    }
    if (hasRouteForMap && !mapImageUri) {
      Alert.alert(
        "잠시만요",
        "경로가 그려진 지도 이미지를 생성하고 있어요. 잠시 후 다시 시도해주세요."
      );
      return;
    }
    const fallbackCoord = isValidCoordinate(position) ? position : null;
    const resolvedStartCoord = isValidCoordinate(startCoord)
      ? startCoord
      : routePoints.find(isValidCoordinate) ?? fallbackCoord;
    const resolvedEndCoord = isValidCoordinate(endCoord)
      ? endCoord
      : [...routePoints].reverse().find(isValidCoordinate) ?? fallbackCoord;
    if (!resolvedStartCoord || !resolvedEndCoord) {
      Alert.alert(
        "저장 실패",
        "유효한 위치 정보가 없어 기록을 제출할 수 없습니다. 위치 권한을 허용하고 현재 위치가 확인된 뒤 다시 시도해주세요.",
      );
      return;
    }
    const resolvedRoutePoints = routePoints.some(isValidCoordinate)
      ? routePoints.filter(isValidCoordinate)
      : [resolvedStartCoord];
    const finishedAt = finishedAtMs ?? Date.now();
    const ploggingSeconds = Math.max(
      0,
      Math.floor((finishedAt - startedAtMs) / 1000) - restSeconds
    );
    submittedRef.current = true;
    setSubmitting(true);
    try {
      // 촬영 직후 종료해도 진행 중이던 업로드 Promise를 함께 기다린다.
      // 실패한 업로드는 이 지점에서 한 번 재시도하며, 한 장이라도 실패하면
      // 사용자 확인 없이 사진을 조용히 누락해 제출하지 않는다.
      const photoUploadResults = await Promise.all(
        photoUris.map(async (uri) => {
          const uploadedUrl = photoObjectUrls[uri];
          if (uploadedUrl) return { status: "uploaded" as const, objectUrl: uploadedUrl };
          const result = await uploadPloggingPhoto(uri, getPhotoContentType(uri));
          if (result.status === "uploaded") {
            addPhotoObjectUrl(uri, result.objectUrl);
          }
          return result;
        })
      );
      const failedPhoto = photoUploadResults.find(
        (result) => result.status === "error"
      );
      if (failedPhoto?.status === "error") {
        throw new Error(`인증 사진 업로드 실패: ${failedPhoto.message}`);
      }
      const photoUrls = photoUploadResults
        .filter(
          (result): result is { status: "uploaded"; objectUrl: string } =>
            result.status === "uploaded"
        )
        .map((result) => result.objectUrl);

      let resolvedMapImageUrl = mapImageObjectUrl;
      if (!resolvedMapImageUrl && mapImageUri) {
        const uploadResult = await uploadMapImage(
          mapImageUri,
          "image/png"
        );
        if (uploadResult.status !== "uploaded") {
          throw new Error(uploadResult.message);
        }
        resolvedMapImageUrl = uploadResult.objectUrl;
        setMapImageObjectUrl(uploadResult.objectUrl);
      }

      const payload: CompletePloggingSessionRequest = {
        mode: crewContext ? "FREE" : mode,
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        distanceMeters: Math.round(distanceMeters),
        stepCount: Math.round(stepCount),
        caloriesBurned: Math.round(caloriesBurned),
        ploggingSeconds,
        restSeconds,
        placeName: placeName || "",
        startLatitude: resolvedStartCoord.latitude,
        startLongitude: resolvedStartCoord.longitude,
        endLatitude: resolvedEndCoord.latitude,
        endLongitude: resolvedEndCoord.longitude,
        routePoints: resolvedRoutePoints,
        mapImageUrl: resolvedMapImageUrl ?? undefined,
        photoUrls,
        crewPloggingSessionId: crewContext?.sessionId,
      };
      if (__DEV__) {
        console.log("[plogging-complete] requestBody", {
          ...payload,
          mapImageUrl: Boolean(payload.mapImageUrl),
          photoUrls: `${payload.photoUrls.length} photos`,
          routePoints: `${payload.routePoints.length} points`,
        });
      }

      await completePloggingSession(payload);
      if (crewContext) {
        // 제출 완료 대기 화면은 방금 측정한 지도와 통계를 그대로 보여준다.
        // 측정 구독은 이미 종료됐으며, 세션 완료/홈 이동 시점에 초기화한다.
        navigateAfterCrewSubmission();
      } else {
        resetSession();
        router.replace("/history");
      }
    } catch (error) {
      if (crewContext && shouldVerifyCrewSubmission(error)) {
        try {
          const currentSession = await getCrewPloggingSession({
            sessionId: crewContext.sessionId,
          });
          if (
            currentSession.recordSubmittedByMe ||
            currentSession.participantStatus === "SUBMITTED"
          ) {
            navigateAfterCrewSubmission();
            return;
          }
          if (
            currentSession.status === "COMPLETED" ||
            currentSession.participantStatus === "NOT_SUBMITTED"
          ) {
            resetSession();
            navigateToCrewRecord();
            return;
          }
          if (
            currentSession.status === "COMPLETING" &&
            hasSubmissionDeadlinePassed(currentSession.submissionDeadlineAt)
          ) {
            submittedRef.current = false;
            resetSession();
            router.replace({
              pathname: "/crews/[crewId]/sessions/[sessionId]",
              params: {
                crewId: String(crewContext.crewId),
                role: crewContext.role,
                sessionId: String(crewContext.sessionId),
              },
            });
            Alert.alert(
              "제출 마감",
              "기록 제출 시간이 종료되었습니다. 서버의 최종 처리를 기다려주세요."
            );
            return;
          }
        } catch {
          // 원래 완료 요청 오류를 표시한다.
        }
      }

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
    addPhotoObjectUrl,
    caloriesBurned,
    completeButtonWaiting,
    distanceMeters,
    endCoord,
    finishedAtMs,
    hasRouteForMap,
    crewContext,
    mapImageCaptureFailed,
    mapImageObjectUrl,
    mapImageUri,
    mode,
    navigateAfterCrewSubmission,
    navigateToCrewRecord,
    photoObjectUrls,
    photoUris,
    placeName,
    resetSession,
    restSeconds,
    routePoints,
    position,
    router,
    session,
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
            paddingTop: Math.max(insets.top, 47) + 10,
            paddingBottom:
              shareButtonBottom +
              FLOATING_SHARE_BUTTON_HEIGHT +
              FLOATING_SHARE_BUTTON_SCROLL_GAP,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ReportHeader
          backDisabled={submitting}
          onBack={handleBack}
          onSave={handleSaveImage}
          saving={savingImage}
        />
        <View style={styles.statusPill}>
          <Text selectable style={styles.statusText}>
            {modeLabel.replace(" · 완료", "")}
          </Text>
        </View>
        <ReportTitleBlock
          dateLabel={dateLabel}
          placeName={placeName}
          timeRangeLabel={timeRangeLabel}
        />
        <DistanceSummaryCard
          metrics={overviewMetrics}
          onMapImageCaptureStateChange={setMapImageCaptureState}
        />
        <PhotoGallery onSelect={openPhotoViewer} photoUris={photoUris} />
        <ExperienceCard profile={profile} />
        {crewContext ? (
          <CrewCertificationPhotoButton
            disabled={submitting || photoUris.length === 0}
            onPress={() => setCrewPhotoComposerVisible(true)}
          />
        ) : null}
      </ScrollView>
      <ShareButton
        bottom={shareButtonBottom}
        disabled={sharing}
        onPress={() => setShareSheetVisible(true)}
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
      <View pointerEvents="none" style={styles.sharePreviewHost}>
        <PersonalReportPoster data={posterData} ref={sharePreviewRef} />
      </View>
      <PersonalReportShareSheet
        completeDisabled={completeButtonDisabled}
        completeTitle={completeButtonTitle}
        data={posterData}
        onClose={() => setShareSheetVisible(false)}
        onComplete={() => {
          setShareSheetVisible(false);
          void handleComplete();
        }}
        onSave={() => {
          setShareSheetVisible(false);
          void handleSaveImage();
        }}
        onShare={() => {
          setShareSheetVisible(false);
          void handleShare();
        }}
        saving={savingImage}
        sharing={sharing}
        visible={shareSheetVisible}
      />
      {crewReportRecord ? (
        <>
          <CrewPhotoComposer
            onClose={() => setCrewPhotoComposerVisible(false)}
            onGenerate={(photoIds) => {
              setCrewPhotoComposerVisible(false);
              setCrewSharePhotoIds(photoIds);
              setCrewShareSheetVisible(true);
            }}
            record={crewReportRecord}
            visible={crewPhotoComposerVisible}
          />
          <ReportShareSheet
            completeDisabled={completeButtonDisabled}
            completeTitle={completeButtonTitle}
            message={crewShareMessage}
            onClose={() => setCrewShareSheetVisible(false)}
            onComplete={() => {
              setCrewShareSheetVisible(false);
              void handleComplete();
            }}
            record={crewReportRecord}
            routeOverlayUri={photoRouteOverlayUri}
            selectedPhotoIds={crewSharePhotoIds}
            visible={crewShareSheetVisible}
          />
        </>
      ) : null}
      <PhotoViewer
        dateLabel={dateLabel}
        distanceKm={shareDistanceKm}
        hintVisible={photoHintVisible}
        onClose={() => setPhotoViewerIndex(null)}
        onSave={() => {
          void handleSaveSelectedPhoto();
        }}
        onSelect={(index) => {
          setPhotoViewerIndex(index);
          setPhotoOverlayVisible(false);
          setPhotoHintVisible(false);
        }}
        onToggleOverlay={() => {
          setPhotoHintVisible(false);
          setPhotoOverlayVisible((visible) => !visible);
        }}
        overlayVisible={photoOverlayVisible}
        photoUris={photoUris}
        routeOverlayUri={photoRouteOverlayUri}
        selectedIndex={photoViewerIndex}
        stepCountLabel={stepCountLabel}
        timeLabel={ploggingTimeLabel}
      />
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
  backDisabled,
  onBack,
  onSave,
  saving,
}: {
  backDisabled: boolean;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        accessibilityState={{ disabled: backDisabled }}
        disabled={backDisabled}
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [
          styles.headerButton,
          pressed ? styles.pressed : null,
          backDisabled ? styles.disabled : null,
        ]}
      >
        <ExpoImage contentFit="contain" source={reportIcons.back} style={styles.headerBackIcon} />
      </Pressable>
      <View style={styles.headerSaveAction}>
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
          <ExpoImage contentFit="contain" source={reportIcons.reportSave} style={styles.headerSaveIcon} />
        </Pressable>
        <Text style={styles.headerSaveLabel}>저장하기</Text>
      </View>
    </View>
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
  metrics,
  onMapImageCaptureStateChange,
}: {
  metrics: ReportMetric[];
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
    <View style={styles.overviewCard}>
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
      <View style={styles.overviewMetrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.overviewMetric}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.overviewMetricValue}
            >
              {metric.value}
              <Text style={styles.overviewMetricUnit}> {metric.unit}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 참고 UI: 인증샷 4장을 한 줄에 균등 배치한 갤러리 섹션.
// 사진이 4장 미만이면 가능한 만큼만 보여주고, 0장이면 섹션 자체를 숨긴다.
function PhotoGallery({
  onSelect,
  photoUris,
}: {
  onSelect: (index: number) => void;
  photoUris: string[];
}) {
  const { width: viewportWidth } = useWindowDimensions();
  if (photoUris.length === 0) return null;

  const visiblePhotos = photoUris.slice(0, 4);
  const availableWidth = Math.max(
    0,
    viewportWidth - REPORT_CONTENT_HORIZONTAL_PADDING * 2
  );
  const tileWidth = Math.min(
    REPORT_PHOTO_MAX_WIDTH,
    Math.max(
      0,
      (availableWidth - REPORT_PHOTO_GAP * 3) / 4
    )
  );
  const tileHeight = tileWidth / REPORT_PHOTO_ASPECT_RATIO;

  return (
    <View style={styles.photoGallery}>
      {visiblePhotos.map((uri, index) => (
        <Pressable
          key={`${uri}-${index}`}
          accessibilityLabel={`플로깅 인증샷 ${index + 1} 보기`}
          accessibilityRole="button"
          onPress={() => onSelect(index)}
          style={[
            styles.photoTileWrap,
            { height: tileHeight, width: tileWidth, zIndex: 4 - index },
          ]}
        >
          <Image source={{ uri }} style={styles.photoTile} />
        </Pressable>
      ))}
    </View>
  );
}

function ExperienceCard({ profile }: { profile: UserProfile | null }) {
  const level = profile?.level ?? 1;
  const experience = profile?.experience ?? 0;
  const currentLevelExperience = Math.max(0, experience - (level - 1) * 1000);
  const remainingExperience = Math.max(0, 1000 - currentLevelExperience);
  const progress = `${Math.min(
    100,
    (currentLevelExperience / 1000) * 100
  )}%` as const;

  return (
    <View style={styles.experienceCard}>
      <View style={styles.experienceLevelBadge}>
        <Text style={styles.experienceLevelText}>Lv.{level}</Text>
      </View>
      <Text style={styles.experienceTitle}>{profile?.title ?? "초보 플로거"}</Text>
      <Text style={styles.experienceRemaining}>
        <Text style={styles.experienceRemainingMuted}>다음 레벨까지 </Text>
        {remainingExperience.toLocaleString("ko-KR")} XP
      </Text>
      <View style={styles.experienceTrack}>
        <View style={[styles.experienceProgress, { width: progress }]} />
      </View>
      <View pointerEvents="none" style={styles.experienceMarkerTrack}>
        <Text style={[styles.experienceMarker, { left: progress }]}>▲</Text>
      </View>
      <View style={styles.experienceCharacter}>
        <ExpoImage
          contentFit="cover"
          source={require("@/assets/images/plover-experience.png")}
          style={styles.experienceCharacterImage}
        />
      </View>
    </View>
  );
}

function PhotoViewer({
  dateLabel,
  distanceKm,
  hintVisible,
  onClose,
  onSave,
  onSelect,
  onToggleOverlay,
  overlayVisible,
  photoUris,
  routeOverlayUri,
  selectedIndex,
  stepCountLabel,
  timeLabel,
}: {
  dateLabel: string;
  distanceKm: string;
  hintVisible: boolean;
  onClose: () => void;
  onSave: () => void;
  onSelect: (index: number) => void;
  onToggleOverlay: () => void;
  overlayVisible: boolean;
  photoUris: string[];
  routeOverlayUri: string | null;
  selectedIndex: number | null;
  stepCountLabel: string;
  timeLabel: string;
}) {
  const selectedPhoto = selectedIndex === null ? null : photoUris[selectedIndex];
  const viewerInsets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      visible={selectedPhoto !== null}
    >
      <View style={styles.photoViewerRoot}>
        <StatusBar backgroundColor="#1A1A1A" style="light" />
        <View style={[styles.photoViewerHeader, { paddingTop: viewerInsets.top }]}>
          <View style={styles.photoViewerHeaderRow}>
            <View style={styles.photoViewerHeaderSide} />
            <Text numberOfLines={1} style={styles.photoViewerTitle}>
              {dateLabel} 플로깅
            </Text>
            <Pressable
              accessibilityLabel="사진 닫기"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.photoViewerClose,
                pressed ? styles.pressed : null,
              ]}
            >
              <ExpoImage
                contentFit="contain"
                source={reportIcons.photoClose}
                style={styles.photoViewerCloseIcon}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.photoViewerBody}>
          {selectedPhoto ? (
            <Pressable
              accessibilityLabel="사진 기록 표시 전환"
              accessibilityRole="button"
              onPress={onToggleOverlay}
              style={styles.photoViewerImageWrap}
            >
              <Image source={{ uri: selectedPhoto }} style={styles.photoViewerImage} />
              {overlayVisible ? (
                <View style={StyleSheet.absoluteFill}>
                  {routeOverlayUri ? (
                    <ExpoImage
                      contentFit="contain"
                      source={{ uri: routeOverlayUri }}
                      style={styles.photoViewerRoute}
                    />
                  ) : null}
                  <View style={styles.photoViewerMetrics}>
                    <PhotoOverlayMetric unit="km" value={distanceKm} />
                    <PhotoOverlayMetric unit="steps" value={stepCountLabel} />
                    <PhotoOverlayMetric unit="H:M" value={timeLabel} />
                  </View>
                </View>
              ) : null}
              {hintVisible ? (
                <View style={styles.photoViewerHint}>
                  <Text style={styles.photoViewerHintText}>
                    사진을 터치하여 기록을 띄워보세요!
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          <View style={styles.photoViewerThumbs}>
            {photoUris.slice(0, 4).map((uri, index) => (
              <Pressable
                accessibilityLabel={`사진 ${index + 1} 보기`}
                accessibilityRole="button"
                key={`${uri}-${index}`}
                onPress={() => onSelect(index)}
                style={[
                  styles.photoViewerThumbWrap,
                  index === selectedIndex
                    ? styles.photoViewerThumbSelected
                    : null,
                ]}
              >
                <Image source={{ uri }} style={styles.photoViewerThumb} />
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={[
            styles.photoViewerFooter,
            { paddingBottom: Math.max(viewerInsets.bottom, 16) },
          ]}
        >
          <Pressable
            accessibilityLabel="사진 저장하기"
            accessibilityRole="button"
            onPress={onSave}
            style={({ pressed }) => [
              styles.photoViewerSave,
              pressed ? styles.pressed : null,
            ]}
          >
            <ExpoImage
              contentFit="contain"
              source={reportIcons.photoSave}
              style={styles.photoViewerSaveIcon}
            />
            <Text style={styles.photoViewerSaveText}>저장하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PhotoOverlayMetric({ unit, value }: { unit: string; value: string }) {
  return (
    <Text style={styles.photoViewerMetricValue}>
      {value} <Text style={styles.photoViewerMetricUnit}>{unit}</Text>
    </Text>
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
  return (
    <View
      pointerEvents="box-none"
      style={[styles.shareButtonOverlay, { bottom }]}
    >
      <Pressable
        accessibilityLabel="공유하기"
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
        <ExpoImage contentFit="contain" source={reportIcons.share} style={styles.shareIcon} />
        <Text selectable style={styles.shareText}>
          공유하기
        </Text>
      </Pressable>
    </View>
  );
}

function CrewCertificationPhotoButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={
        disabled
          ? "완료리포트에 인증샷이 있어야 만들 수 있습니다"
          : "완료리포트의 인증샷을 골라 크루 공유 이미지를 만듭니다"
      }
      accessibilityLabel="크루 인증사진 만들기"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.crewPhotoButton,
        disabled ? styles.crewPhotoButtonDisabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.crewPhotoButtonIconCircle}>
        <ExpoImage
          contentFit="contain"
          source={reportIcons.crewAdd}
          style={styles.crewPhotoButtonIcon}
        />
      </View>
      <View style={styles.crewPhotoButtonCopy}>
        <Text style={styles.crewPhotoButtonTitle}>크루 인증사진 만들기</Text>
        <Text style={styles.crewPhotoButtonDescription}>
          {disabled ? "인증샷을 추가하면 만들 수 있어요" : "최대 4장의 사진으로 만들어요"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardCaption: {
    color: colors.subtle,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  content: {
    paddingBottom: 180,
    paddingHorizontal: 24,
  },
  crewPhotoButton: {
    alignItems: "center",
    backgroundColor: "#E4EFFA",
    borderColor: "#8DC3EC",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: "100%",
  },
  crewPhotoButtonCopy: {
    flex: 1,
    gap: 3,
  },
  crewPhotoButtonDescription: {
    color: "#4E7390",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  crewPhotoButtonDisabled: {
    opacity: 0.5,
  },
  crewPhotoButtonIcon: {
    height: 16,
    width: 16,
  },
  crewPhotoButtonIconCircle: {
    alignItems: "center",
    backgroundColor: "#2A88CD",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  crewPhotoButtonTitle: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  distanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: 10,
    padding: 16,
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
    height: 60,
    justifyContent: "space-between",
  },
  headerBackIcon: {
    height: 24,
    width: 24,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadows.soft,
  },
  headerSaveAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
  },
  headerSaveIcon: {
    height: 24,
    width: 24,
  },
  headerSaveLabel: {
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  miniMap: {
    backgroundColor: colors.line,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: 189,
    overflow: "hidden",
    width: "100%",
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
    fontFamily: fontFamilies.medium,
    fontSize: 13,
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
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
  },
  overviewCard: {
    borderRadius: 12,
    height: 260,
    marginTop: 22,
    overflow: "hidden",
    ...shadows.raised,
  },
  overviewMetric: {
    justifyContent: "center",
    minWidth: 0,
  },
  overviewMetricUnit: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  overviewMetricValue: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  overviewMetrics: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: "row",
    height: 71,
    justifyContent: "space-between",
    paddingLeft: 23,
    paddingRight: 18,
  },
  photoGallery: {
    flexDirection: "row",
    gap: REPORT_PHOTO_GAP,
    marginTop: 21,
    width: "100%",
  },
  photoTile: {
    backgroundColor: colors.line,
    borderRadius: 6,
    height: "100%",
    width: "100%",
  },
  photoTileWrap: {
    borderRadius: 6,
    ...shadows.raised,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  reportSubTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    letterSpacing: -0.24,
    lineHeight: getSafeLineHeight(12, fontFamilies.regular, 12),
    marginTop: 8,
  },
  reportSubTitleBold: {
    fontFamily: fontFamilies.medium,
  },
  reportTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 28,
    letterSpacing: -0.56,
    lineHeight: getSafeLineHeight(28, fontFamilies.regular, 28),
    marginTop: 12,
  },
  reportTitleBold: {
    fontFamily: fontFamilies.semiBold,
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRadius: FLOATING_SHARE_BUTTON_HEIGHT / 2,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: FLOATING_SHARE_BUTTON_HEIGHT,
    justifyContent: "center",
    width: 184,
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
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  shareIcon: {
    height: 20,
    width: 20,
  },
  sharePreviewHost: {
    left: -10000,
    position: "absolute",
    top: 0,
    width: 140,
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
    backgroundColor: "#F2F7FD",
    borderColor: "#E4EFFA",
    borderRadius: 23,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  statusText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  experienceCharacter: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 74,
    overflow: "hidden",
    position: "absolute",
    right: 20,
    top: 14,
    width: 74,
  },
  experienceCharacterImage: {
    height: 94,
    left: -10,
    position: "absolute",
    top: -8,
    transform: [{ rotate: "-8.51deg" }],
    width: 98,
  },
  experienceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 104,
    marginTop: 20,
    position: "relative",
    ...shadows.raised,
  },
  experienceLevelBadge: {
    alignItems: "center",
    backgroundColor: "#1FA868",
    borderRadius: 17,
    height: 18,
    justifyContent: "center",
    left: 22,
    position: "absolute",
    top: 19,
    width: 40,
  },
  experienceLevelText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  experienceProgress: {
    backgroundColor: "#1FA868",
    borderRadius: 26,
    height: 5,
  },
  experienceMarker: {
    color: "#1FA868",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    marginLeft: -5,
    position: "absolute",
    top: 0,
  },
  experienceMarkerTrack: {
    height: 12,
    left: 22,
    position: "absolute",
    top: 70,
    width: 209,
  },
  experienceRemaining: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    left: 22,
    letterSpacing: -0.2,
    position: "absolute",
    top: 44,
  },
  experienceRemainingMuted: {
    color: "#A3A3A3",
  },
  experienceTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    left: 68,
    letterSpacing: -0.28,
    position: "absolute",
    top: 21,
  },
  experienceTrack: {
    backgroundColor: "#E5E5E5",
    borderRadius: 7,
    height: 5,
    left: 22,
    overflow: "hidden",
    position: "absolute",
    top: 64,
    width: 209,
  },
  photoViewerClose: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 44,
  },
  photoViewerCloseIcon: {
    height: 24,
    width: 24,
  },
  photoViewerBody: {
    flex: 1,
    gap: 12,
    minHeight: 0,
    paddingVertical: 12,
  },
  photoViewerFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  photoViewerHeader: {
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 2,
    ...shadows.raised,
  },
  photoViewerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 56,
    paddingHorizontal: 12,
  },
  photoViewerHeaderSide: {
    width: 44,
  },
  photoViewerHint: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 32,
    bottom: 16,
    paddingHorizontal: 19,
    paddingVertical: 8,
    position: "absolute",
  },
  photoViewerHintText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  photoViewerImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  photoViewerImageWrap: {
    backgroundColor: "#101010",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  photoViewerMetricUnit: {
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 18,
  },
  photoViewerMetricValue: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 32,
    letterSpacing: -0.64,
  },
  photoViewerMetrics: {
    bottom: 24,
    gap: 10,
    left: 24,
    position: "absolute",
  },
  photoViewerRoot: {
    backgroundColor: "#1A1A1A",
    flex: 1,
  },
  photoViewerRoute: {
    height: 120,
    position: "absolute",
    right: 16,
    top: 16,
    width: 116,
  },
  photoViewerSave: {
    alignItems: "center",
    backgroundColor: "#404040",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    height: 54,
    justifyContent: "center",
  },
  photoViewerSaveIcon: {
    height: 24,
    width: 24,
  },
  photoViewerSaveText: {
    color: "#FAFAFA",
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
    letterSpacing: -0.34,
  },
  photoViewerThumb: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  photoViewerThumbSelected: {
    borderColor: "#FF8A00",
    borderWidth: 3,
  },
  photoViewerThumbWrap: {
    borderRadius: 3,
    height: 61,
    overflow: "hidden",
    width: 52,
  },
  photoViewerThumbs: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 61,
  },
  photoViewerTitle: {
    color: "#FAFAFA",
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
    textAlign: "center",
  },
});
