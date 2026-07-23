import { Image as ExpoImage } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import {
  PersonalReportPoster,
  type PersonalReportPosterData,
} from "@/src/features/plogging-report/components/personal-report-poster";
import { PersonalReportShareSheet } from "@/src/features/plogging-report/components/personal-report-share-sheet";
import {
  colors,
  fontFamilies,
  getSafeLineHeight,
  shadows,
} from "@/src/shared/theme";
import { ScreenRoot } from "@/src/shared/ui";

import type { PloggingSessionDetail } from "../api/types";
import { usePloggingSessionDetail } from "../hooks/use-plogging-session-detail";

const icons = {
  back: require("@/assets/icons/figma-route-back.svg"),
  photoClose: require("@/assets/icons/figma-photo-close.svg"),
  photoSave: require("@/assets/icons/figma-photo-save.svg"),
  reportSave: require("@/assets/icons/figma-report-save.svg"),
  share: require("@/assets/icons/crew-share.svg"),
} as const;

const FLOATING_SHARE_BUTTON_HEIGHT = 46;
const FLOATING_SHARE_BUTTON_BOTTOM_GAP = 12;
const FLOATING_SHARE_BUTTON_SCROLL_GAP = 24;
const DETAIL_CONTENT_HORIZONTAL_PADDING = 24;
const DETAIL_PHOTO_GAP = 8;
const DETAIL_PHOTO_MAX_WIDTH = 91;
const DETAIL_PHOTO_ASPECT_RATIO = 91 / 105;

export function PloggingSessionDetailScreen({
  ploggingSessionId,
}: {
  ploggingSessionId: number | null;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = usePloggingSessionDetail(ploggingSessionId);
  const detail = state.status === "success" ? state.detail : null;
  const posterData = detail ? buildPosterData(detail) : null;
  const posterRef = useRef<View>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [photoOverlayVisible, setPhotoOverlayVisible] = useState(false);
  const [photoHintVisible, setPhotoHintVisible] = useState(true);
  const shareButtonBottom =
    Math.max(insets.bottom, 24) + FLOATING_SHARE_BUTTON_BOTTOM_GAP;

  const capturePoster = useCallback(async () => {
    if (!posterRef.current) {
      throw new Error("공유 이미지를 만들 수 없습니다.");
    }
    await waitForNextPaint();
    return captureRef(posterRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!detail || sharing) return;
    const message = buildShareMessage(detail);

    if (Platform.OS === "web") {
      await Share.share({ message });
      return;
    }

    setSharing(true);
    try {
      const imageUri = await capturePoster();
      const Sharing = await import("expo-sharing");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          dialogTitle: "플로깅 기록 공유하기",
          mimeType: "image/png",
          UTI: "public.png",
        });
      } else {
        await Share.share({ message });
      }
    } catch (error) {
      Alert.alert(
        "공유 실패",
        error instanceof Error
          ? error.message
          : "플로깅 기록을 공유하지 못했습니다."
      );
    } finally {
      setSharing(false);
    }
  }, [capturePoster, detail, sharing]);

  const handleSavePoster = useCallback(async () => {
    if (!detail || savingImage) return;
    if (Platform.OS === "web") {
      Alert.alert("저장 미지원", "리포트 이미지는 모바일 앱에서 저장할 수 있습니다.");
      return;
    }

    setSavingImage(true);
    try {
      const MediaLibrary = await import("expo-media-library");
      const currentPermission = await MediaLibrary.getPermissionsAsync(true);
      const permission = currentPermission.granted
        ? currentPermission
        : await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert("저장 실패", "사진 앱에 저장하려면 사진 추가 권한이 필요합니다.");
        return;
      }
      const imageUri = await capturePoster();
      await MediaLibrary.saveToLibraryAsync(normalizeFileUri(imageUri));
      Alert.alert("저장 완료", "플로깅 리포트 이미지를 사진 앱에 저장했습니다.");
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error
          ? error.message
          : "플로깅 리포트 이미지를 저장하지 못했습니다."
      );
    } finally {
      setSavingImage(false);
    }
  }, [capturePoster, detail, savingImage]);

  const handleSaveSelectedPhoto = useCallback(async () => {
    if (!detail || photoViewerIndex === null || savingImage) return;
    const selectedPhoto = detail.photoUrls[photoViewerIndex];
    if (!selectedPhoto) return;
    if (Platform.OS === "web") {
      Alert.alert("저장 미지원", "사진 저장은 모바일 앱에서 사용할 수 있습니다.");
      return;
    }

    setSavingImage(true);
    try {
      const MediaLibrary = await import("expo-media-library");
      const currentPermission = await MediaLibrary.getPermissionsAsync(true);
      const permission = currentPermission.granted
        ? currentPermission
        : await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert("저장 실패", "사진 앱에 저장하려면 사진 추가 권한이 필요합니다.");
        return;
      }
      const localPhotoUri = await ensureLocalImageFile(selectedPhoto);
      await MediaLibrary.saveToLibraryAsync(localPhotoUri);
      Alert.alert("저장 완료", "인증샷을 사진 앱에 저장했습니다.");
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error ? error.message : "사진을 저장하지 못했습니다."
      );
    } finally {
      setSavingImage(false);
    }
  }, [detail, photoViewerIndex, savingImage]);

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              shareButtonBottom +
              FLOATING_SHARE_BUTTON_HEIGHT +
              FLOATING_SHARE_BUTTON_SCROLL_GAP,
            paddingTop: Math.max(insets.top, 47) + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DetailHeader
          disabled={!detail || savingImage}
          onBack={() => router.back()}
          onSave={() => void handleSavePoster()}
          saving={savingImage}
        />

        {state.status === "loading" || state.status === "idle" ? (
          <View style={styles.statusBlock}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : state.status === "error" ? (
          <View style={styles.statusBlock}>
            <Text selectable style={styles.statusMessage}>
              {state.message}
            </Text>
          </View>
        ) : (
          <DetailBody
            detail={state.detail}
            onOpenPhoto={(index) => {
              setPhotoViewerIndex(index);
              setPhotoOverlayVisible(false);
              setPhotoHintVisible(true);
            }}
          />
        )}
      </ScrollView>

      {detail && posterData ? (
        <>
          <ShareButton
            bottom={shareButtonBottom}
            disabled={sharing}
            onPress={() => setShareSheetVisible(true)}
          />
          <View pointerEvents="none" style={styles.posterHost}>
            <PersonalReportPoster data={posterData} ref={posterRef} />
          </View>
          <PersonalReportShareSheet
            data={posterData}
            onClose={() => setShareSheetVisible(false)}
            onSave={() => {
              setShareSheetVisible(false);
              void handleSavePoster();
            }}
            onShare={() => {
              setShareSheetVisible(false);
              void handleShare();
            }}
            saving={savingImage}
            sharing={sharing}
            visible={shareSheetVisible}
          />
          <HistoryPhotoViewer
            dateLabel={formatDateKo(detail.startedAt)}
            distanceKm={formatKilometers(detail.distanceMeters)}
            hintVisible={photoHintVisible}
            mapImageUri={detail.mapImageUrl || null}
            onClose={() => setPhotoViewerIndex(null)}
            onSave={() => void handleSaveSelectedPhoto()}
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
            photoUris={detail.photoUrls}
            selectedIndex={photoViewerIndex}
            stepCountLabel={formatInteger(detail.stepCount)}
            timeLabel={formatHmDuration(detail.ploggingSeconds)}
          />
        </>
      ) : null}
    </ScreenRoot>
  );
}

function DetailHeader({
  disabled,
  onBack,
  onSave,
  saving,
}: {
  disabled: boolean;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [
          styles.headerButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <ExpoImage contentFit="contain" source={icons.back} style={styles.backIcon} />
      </Pressable>
      <View style={styles.saveAction}>
        <Pressable
          accessibilityLabel={saving ? "저장 중" : "저장하기"}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={8}
          onPress={onSave}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
            disabled ? styles.disabled : null,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <ExpoImage
              contentFit="contain"
              source={icons.reportSave}
              style={styles.saveIcon}
            />
          )}
        </Pressable>
        <Text style={styles.saveLabel}>저장하기</Text>
      </View>
    </View>
  );
}

function DetailBody({
  detail,
  onOpenPhoto,
}: {
  detail: PloggingSessionDetail;
  onOpenPhoto: (index: number) => void;
}) {
  const startedAt = new Date(detail.startedAt);
  const finishedAt = new Date(detail.finishedAt);
  const validDates =
    !Number.isNaN(startedAt.getTime()) && !Number.isNaN(finishedAt.getTime());
  const modeLabel = detail.mode === "RECOMMENDED" ? "AI 추천" : "자유모드";

  return (
    <>
      <View style={styles.modePill}>
        <Text selectable style={styles.modeText}>
          {modeLabel}
        </Text>
      </View>
      {validDates ? (
        <>
          <Text selectable style={styles.title}>
            <Text style={styles.titleStrong}>{formatDateKo(detail.startedAt)}</Text>{" "}
            플로깅
          </Text>
          <Text selectable style={styles.subtitle}>
            {formatHm(startedAt)} - {formatHm(finishedAt)}
            {detail.placeName ? (
              <>
                {" · "}
                <Text style={styles.subtitleStrong}>{detail.placeName}</Text>
              </>
            ) : null}
          </Text>
        </>
      ) : null}

      <View style={styles.overviewCard}>
        <View style={styles.map}>
          {detail.mapImageUrl ? (
            <Image
              accessibilityLabel="플로깅 경로 이미지"
              resizeMode="contain"
              source={{ uri: detail.mapImageUrl }}
              style={styles.mapImage}
            />
          ) : (
            <View style={styles.mapEmpty}>
              <Text style={styles.mapEmptyText}>지도 이미지가 없습니다.</Text>
            </View>
          )}
        </View>
        <View style={styles.metrics}>
          <OverviewMetric
            label="이동 거리"
            unit="km"
            value={formatKilometers(detail.distanceMeters)}
          />
          <OverviewMetric
            label="걸음 수"
            unit="steps"
            value={formatInteger(detail.stepCount)}
          />
          <OverviewMetric
            label="플로깅 시간"
            unit="H:M"
            value={formatHmDuration(detail.ploggingSeconds)}
          />
        </View>
      </View>

      <PhotoGallery onSelect={onOpenPhoto} photoUris={detail.photoUrls} />
    </>
  );
}

function OverviewMetric({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={styles.metricValue}
      >
        {value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function PhotoGallery({
  onSelect,
  photoUris,
}: {
  onSelect: (index: number) => void;
  photoUris: string[];
}) {
  const { width: viewportWidth } = useWindowDimensions();
  if (photoUris.length === 0) return null;

  const availableWidth = Math.max(
    0,
    viewportWidth - DETAIL_CONTENT_HORIZONTAL_PADDING * 2
  );
  const tileWidth = Math.min(
    DETAIL_PHOTO_MAX_WIDTH,
    Math.max(0, (availableWidth - DETAIL_PHOTO_GAP * 3) / 4)
  );
  const tileHeight = tileWidth / DETAIL_PHOTO_ASPECT_RATIO;

  return (
    <View style={styles.photoGallery}>
      {photoUris.slice(0, 4).map((uri, index) => (
        <Pressable
          accessibilityLabel={`플로깅 인증샷 ${index + 1} 보기`}
          accessibilityRole="button"
          key={`${uri}-${index}`}
          onPress={() => onSelect(index)}
          style={[
            styles.photoWrap,
            { height: tileHeight, width: tileWidth, zIndex: 4 - index },
          ]}
        >
          <Image source={{ uri }} style={styles.photo} />
        </Pressable>
      ))}
    </View>
  );
}

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
    <View pointerEvents="box-none" style={[styles.shareOverlay, { bottom }]}>
      <Pressable
        accessibilityLabel="SNS 공유하기"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.shareButton,
          pressed ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <ExpoImage contentFit="contain" source={icons.share} style={styles.shareIcon} />
        <Text style={styles.shareText}>SNS 공유하기</Text>
      </Pressable>
    </View>
  );
}

function HistoryPhotoViewer({
  dateLabel,
  distanceKm,
  hintVisible,
  mapImageUri,
  onClose,
  onSave,
  onSelect,
  onToggleOverlay,
  overlayVisible,
  photoUris,
  selectedIndex,
  stepCountLabel,
  timeLabel,
}: {
  dateLabel: string;
  distanceKm: string;
  hintVisible: boolean;
  mapImageUri: string | null;
  onClose: () => void;
  onSave: () => void;
  onSelect: (index: number) => void;
  onToggleOverlay: () => void;
  overlayVisible: boolean;
  photoUris: string[];
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
      <View style={styles.viewerRoot}>
        <StatusBar backgroundColor="#1A1A1A" style="light" />
        <View style={[styles.viewerHeader, { paddingTop: viewerInsets.top }]}>
          <View style={styles.viewerHeaderRow}>
            <View style={styles.viewerHeaderSide} />
            <Text numberOfLines={1} style={styles.viewerTitle}>
              {dateLabel} 플로깅
            </Text>
            <Pressable
              accessibilityLabel="사진 닫기"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.viewerClose,
                pressed ? styles.pressed : null,
              ]}
            >
              <ExpoImage
                contentFit="contain"
                source={icons.photoClose}
                style={styles.viewerCloseIcon}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.viewerBody}>
          {selectedPhoto ? (
            <Pressable
              accessibilityLabel="사진 기록 표시 전환"
              accessibilityRole="button"
              onPress={onToggleOverlay}
              style={styles.viewerImageWrap}
            >
              <Image source={{ uri: selectedPhoto }} style={styles.viewerImage} />
              {overlayVisible ? (
                <View style={StyleSheet.absoluteFill}>
                  {mapImageUri ? (
                    <ExpoImage
                      contentFit="contain"
                      source={{ uri: mapImageUri }}
                      style={styles.viewerRoute}
                    />
                  ) : null}
                  <View style={styles.viewerMetrics}>
                    <OverlayMetric unit="km" value={distanceKm} />
                    <OverlayMetric unit="steps" value={stepCountLabel} />
                    <OverlayMetric unit="H:M" value={timeLabel} />
                  </View>
                </View>
              ) : null}
              {hintVisible ? (
                <View style={styles.viewerHint}>
                  <Text style={styles.viewerHintText}>
                    사진을 터치하여 기록을 띄워보세요!
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          <View style={styles.viewerThumbs}>
            {photoUris.slice(0, 4).map((uri, index) => (
              <Pressable
                accessibilityLabel={`사진 ${index + 1} 보기`}
                accessibilityRole="button"
                key={`${uri}-${index}`}
                onPress={() => onSelect(index)}
                style={[
                  styles.viewerThumbWrap,
                  index === selectedIndex ? styles.viewerThumbSelected : null,
                ]}
              >
                <Image source={{ uri }} style={styles.viewerThumb} />
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={[
            styles.viewerFooter,
            { paddingBottom: Math.max(viewerInsets.bottom, 16) },
          ]}
        >
          <Pressable
            accessibilityLabel="사진 저장하기"
            accessibilityRole="button"
            onPress={onSave}
            style={({ pressed }) => [
              styles.viewerSave,
              pressed ? styles.pressed : null,
            ]}
          >
            <ExpoImage
              contentFit="contain"
              source={icons.photoSave}
              style={styles.viewerSaveIcon}
            />
            <Text style={styles.viewerSaveText}>저장하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function OverlayMetric({ unit, value }: { unit: string; value: string }) {
  return (
    <Text style={styles.viewerMetricValue}>
      {value} <Text style={styles.viewerMetricUnit}>{unit}</Text>
    </Text>
  );
}

function buildPosterData(detail: PloggingSessionDetail): PersonalReportPosterData {
  return {
    caloriesLabel: formatInteger(detail.caloriesBurned),
    dateValue: detail.startedAt,
    distanceKm: formatKilometers(detail.distanceMeters),
    modeLabel: detail.mode === "RECOMMENDED" ? "AI 추천" : "자유모드",
    photoUris: detail.photoUrls,
    placeName: detail.placeName,
    ploggingTimeLabel: formatHmDuration(detail.ploggingSeconds),
    routeImageUri: detail.mapImageUrl || null,
    stepCountLabel: formatInteger(detail.stepCount),
  };
}

function buildShareMessage(detail: PloggingSessionDetail): string {
  const startedAt = new Date(detail.startedAt);
  const finishedAt = new Date(detail.finishedAt);
  const validDates =
    !Number.isNaN(startedAt.getTime()) && !Number.isNaN(finishedAt.getTime());
  const lines = [
    `${formatDateKo(detail.startedAt)} 플로깅`,
    validDates
      ? `${formatHm(startedAt)} - ${formatHm(finishedAt)}${
          detail.placeName ? ` · ${detail.placeName}` : ""
        }`
      : detail.placeName,
    `거리 ${formatKilometers(detail.distanceMeters)} km`,
    `걸음 수 ${formatInteger(detail.stepCount)} steps`,
    `플로깅 시간 ${formatHmDuration(detail.ploggingSeconds)} H:M`,
    `소모 칼로리 ${formatInteger(detail.caloriesBurned)} kcal`,
  ].filter(Boolean);
  return lines.join("\n");
}

function formatDateKo(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function formatHmDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function normalizeFileUri(uri: string): string {
  if (uri.startsWith("file://") || uri.startsWith("content://")) return uri;
  return `file://${uri}`;
}

async function ensureLocalImageFile(uri: string): Promise<string> {
  if (uri.startsWith("file://") || uri.startsWith("content://")) return uri;
  if (!FileSystem.cacheDirectory) {
    throw new Error("사진을 저장할 임시 폴더를 사용할 수 없습니다.");
  }
  const extension = getImageExtension(uri);
  const destination = `${FileSystem.cacheDirectory}plover-record-${Date.now()}.${extension}`;
  const result = await FileSystem.downloadAsync(uri, destination);
  return normalizeFileUri(result.uri);
}

function getImageExtension(uri: string): "jpg" | "png" | "webp" {
  const path = uri.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "png";
  if (path.endsWith(".webp")) return "webp";
  return "jpg";
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

const styles = StyleSheet.create({
  backIcon: {
    height: 24,
    width: 24,
  },
  content: {
    paddingHorizontal: 24,
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
  headerButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...shadows.soft,
  },
  map: {
    backgroundColor: colors.line,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: 189,
    overflow: "hidden",
    width: "100%",
  },
  mapEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  mapEmptyText: {
    color: colors.subtle,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  mapImage: {
    height: "100%",
    width: "100%",
  },
  metric: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  metricLabel: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  metrics: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: "row",
    gap: 16,
    height: 71,
    paddingHorizontal: 17,
    paddingTop: 14,
  },
  metricUnit: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  metricValue: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  modePill: {
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
  modeText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  overviewCard: {
    borderRadius: 12,
    height: 260,
    marginTop: 22,
    overflow: "hidden",
    ...shadows.raised,
  },
  photo: {
    backgroundColor: colors.line,
    borderRadius: 6,
    height: "100%",
    width: "100%",
  },
  photoGallery: {
    flexDirection: "row",
    gap: DETAIL_PHOTO_GAP,
    marginTop: 21,
    width: "100%",
  },
  photoWrap: {
    borderRadius: 6,
    ...shadows.raised,
  },
  posterHost: {
    left: -10000,
    position: "absolute",
    top: 0,
    width: 140,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  saveAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
  },
  saveIcon: {
    height: 24,
    width: 24,
  },
  saveLabel: {
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    letterSpacing: -0.2,
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
  shareIcon: {
    height: 20,
    width: 20,
  },
  shareOverlay: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 3,
  },
  shareText: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  statusBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 120,
  },
  statusMessage: {
    color: colors.muted,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: "center",
  },
  subtitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    letterSpacing: -0.24,
    lineHeight: getSafeLineHeight(12, fontFamilies.regular, 12),
    marginTop: 8,
  },
  subtitleStrong: {
    fontFamily: fontFamilies.medium,
  },
  title: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 28,
    letterSpacing: -0.56,
    lineHeight: getSafeLineHeight(28, fontFamilies.regular, 28),
    marginTop: 12,
  },
  titleStrong: {
    fontFamily: fontFamilies.semiBold,
  },
  viewerClose: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  viewerCloseIcon: {
    height: 24,
    width: 24,
  },
  viewerBody: {
    flex: 1,
    gap: 12,
    minHeight: 0,
    paddingVertical: 12,
  },
  viewerFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  viewerHeader: {
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 2,
    ...shadows.raised,
  },
  viewerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 56,
    paddingHorizontal: 12,
  },
  viewerHeaderSide: {
    width: 44,
  },
  viewerHint: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 32,
    bottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "absolute",
  },
  viewerHintText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  viewerImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  viewerImageWrap: {
    backgroundColor: "#101010",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    ...shadows.raised,
  },
  viewerMetrics: {
    bottom: 24,
    gap: 10,
    left: 24,
    position: "absolute",
  },
  viewerMetricUnit: {
    color: "#E6E6E6",
    fontSize: 18,
  },
  viewerMetricValue: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 32,
    letterSpacing: -0.64,
    lineHeight: getSafeLineHeight(32, fontFamilies.giantsRegular, 36),
  },
  viewerRoute: {
    height: 120,
    position: "absolute",
    right: 16,
    top: 16,
    width: 116,
  },
  viewerRoot: {
    backgroundColor: "#1A1A1A",
    flex: 1,
  },
  viewerSave: {
    alignItems: "center",
    backgroundColor: "#404040",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    height: 54,
    justifyContent: "center",
  },
  viewerSaveIcon: {
    height: 24,
    width: 24,
  },
  viewerSaveText: {
    color: "#FAFAFA",
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
    letterSpacing: -0.34,
  },
  viewerThumb: {
    height: 61,
    resizeMode: "cover",
    width: 52,
  },
  viewerThumbSelected: {
    borderColor: "#F29B38",
    borderWidth: 3,
  },
  viewerThumbs: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 61,
  },
  viewerThumbWrap: {
    height: 61,
    overflow: "hidden",
    width: 52,
    ...shadows.raised,
  },
  viewerTitle: {
    color: "#FAFAFA",
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
    textAlign: "center",
  },
});
