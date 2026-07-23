import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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

import { fontFamilies } from "@/src/shared/theme";
import { PrimaryBottomButton } from "@/src/shared/ui";

import type {
  CrewPloggingPhoto,
  CrewPloggingRecordDetail,
} from "../types";
import {
  CrewAvatar,
  formatDistance,
  formatDuration,
} from "./crew-ui";

const MAX_POSTER_PHOTOS = 4;
const POSTER_WIDTH = 270;
const POSTER_HEIGHT = 480;
const PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT = 70;

type WorkingAction = "share" | "save" | null;

type ReportShareSheetProps = {
  completeDisabled?: boolean;
  completeTitle?: string;
  message: string;
  onClose: () => void;
  onComplete: () => void;
  record: CrewPloggingRecordDetail;
  routeOverlayUri?: string | null;
  selectedPhotoIds?: readonly number[];
  visible: boolean;
};

export function ReportShareSheet({
  completeDisabled = false,
  completeTitle = "플로깅 완료",
  message,
  onClose,
  onComplete,
  record,
  routeOverlayUri = null,
  selectedPhotoIds,
  visible,
}: ReportShareSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const exportRef = useRef<View>(null);
  const capturedImageUriRef = useRef<string | null>(null);
  const preloadPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const [assetsReady, setAssetsReady] = useState(false);
  const [workingAction, setWorkingAction] = useState<WorkingAction>(null);

  const selectedPhotos = useMemo(() => {
    if (!selectedPhotoIds?.length) {
      return record.photos.slice(0, MAX_POSTER_PHOTOS);
    }
    const photosById = new Map(
      record.photos.map((photo) => [photo.photoId, photo] as const)
    );
    return selectedPhotoIds
      .map((photoId) => photosById.get(photoId))
      .filter((photo): photo is CrewPloggingPhoto => Boolean(photo))
      .slice(0, MAX_POSTER_PHOTOS);
  }, [record.photos, selectedPhotoIds]);

  useEffect(() => {
    capturedImageUriRef.current = null;
    if (!visible) {
      setAssetsReady(false);
      preloadPromiseRef.current = Promise.resolve();
      return;
    }

    let active = true;
    setAssetsReady(false);
    const urls = [
      routeOverlayUri,
      ...selectedPhotos.map((photo) => photo.objectUrl),
    ].filter((url): url is string => Boolean(url));

    const preloadTask = (
      urls.length > 0
        ? Image.prefetch(urls, { cachePolicy: "memory-disk" })
        : Promise.resolve(true)
    )
      .catch(() => false)
      .then(async () => {
        await waitForNextPaint();
      });

    preloadPromiseRef.current = preloadTask;
    void preloadTask.then(() => {
      if (active) setAssetsReady(true);
    });

    return () => {
      active = false;
    };
  }, [routeOverlayUri, selectedPhotos, visible]);

  const bottomActionHeight =
    PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT + insets.bottom;
  const sheetHeight = Math.min(
    560,
    Math.max(440, windowHeight - insets.top - bottomActionHeight - 12)
  );
  const previewScale = Math.min(
    0.52,
    Math.max(0.4, (sheetHeight - 205) / POSTER_HEIGHT)
  );
  const previewWidth = POSTER_WIDTH * previewScale;
  const previewHeight = POSTER_HEIGHT * previewScale;
  const busy = workingAction !== null;
  const actionsDisabled = busy || !assetsReady;

  const capturePreview = async (): Promise<string | null> => {
    if (Platform.OS === "web" || !exportRef.current) return null;
    if (capturedImageUriRef.current) return capturedImageUriRef.current;

    await preloadPromiseRef.current;
    await waitForNextPaint();
    const uri = await captureRef(exportRef, {
      format: "png",
      height: 1920,
      quality: 1,
      result: "tmpfile",
      width: 1080,
    });
    capturedImageUriRef.current = uri;
    return uri;
  };

  const sharePreview = async () => {
    if (actionsDisabled) return;
    setWorkingAction("share");
    try {
      const imageUri = await capturePreview();
      await Clipboard.setStringAsync(message).catch(() => undefined);

      if (imageUri) {
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(imageUri, {
              dialogTitle: "같이줍기 인증사진 공유하기",
              mimeType: "image/png",
              UTI: "public.png",
            });
            return;
          }
        } catch {
          // Native sharing can be unavailable in a preview client. Fall back below.
        }
      }

      await Share.share(
        {
          message,
          title: "같이줍기 인증사진",
          ...(imageUri && Platform.OS === "ios" ? { url: imageUri } : {}),
        },
        {
          dialogTitle: "같이줍기 기록 공유하기",
          subject: "같이줍기 인증사진",
        }
      );
    } catch (error) {
      Alert.alert(
        "공유 실패",
        error instanceof Error
          ? error.message
          : "같이줍기 인증사진을 공유하지 못했습니다."
      );
    } finally {
      setWorkingAction(null);
    }
  };

  const savePreview = async () => {
    if (actionsDisabled) return;
    if (Platform.OS === "web") {
      Alert.alert(
        "저장 미지원",
        "인증사진은 모바일 앱에서 사진 앱에 저장할 수 있습니다."
      );
      return;
    }

    setWorkingAction("save");
    try {
      const MediaLibrary = await import("expo-media-library");
      const currentPermission = await MediaLibrary.getPermissionsAsync(true);
      const permission = currentPermission.granted
        ? currentPermission
        : await MediaLibrary.requestPermissionsAsync(true);

      if (!permission.granted) {
        showPhotoPermissionAlert(permission.canAskAgain);
        return;
      }

      const imageUri = await capturePreview();
      if (!imageUri) throw new Error("저장할 인증사진을 만들지 못했습니다.");
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert(
        "저장 완료",
        "고화질 크루 인증사진을 사진 앱에 저장했습니다."
      );
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error
          ? error.message
          : "같이줍기 인증사진을 저장하지 못했습니다."
      );
    } finally {
      setWorkingAction(null);
    }
  };

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={busy ? undefined : onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={shareStyles.modalRoot}>
        <Pressable
          accessibilityLabel="공유 창 닫기"
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={shareStyles.backdrop}
        />

        <View pointerEvents="none" style={shareStyles.exportHost}>
          <CrewReportPoster
            photos={selectedPhotos}
            posterRef={exportRef}
            record={record}
            routeOverlayUri={routeOverlayUri}
          />
        </View>

        <View
          style={[
            shareStyles.sheet,
            { bottom: bottomActionHeight, height: sheetHeight },
          ]}
        >
          <View style={shareStyles.grabber} />
          <View style={shareStyles.sheetHeader}>
            <View>
              <Text style={shareStyles.sheetTitle}>공유하기</Text>
              <Text style={shareStyles.sheetSubtitle}>
                선택한 순서대로 인증 이미지를 만들었어요
              </Text>
            </View>
            <Pressable
              accessibilityLabel="공유 창 닫기"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              hitSlop={4}
              onPress={onClose}
              style={({ pressed }) => [
                shareStyles.closeButton,
                pressed ? shareStyles.pressed : null,
              ]}
            >
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-close.svg")}
                style={shareStyles.closeIcon}
              />
            </Pressable>
          </View>

          <View style={shareStyles.previewArea}>
            <View
              accessibilityLabel={`크루 인증사진 미리보기, 사진 ${selectedPhotos.length}장`}
              accessible
              style={[
                shareStyles.previewFrame,
                { height: previewHeight, width: previewWidth },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  shareStyles.previewScaler,
                  {
                    left: (previewWidth - POSTER_WIDTH) / 2,
                    top: (previewHeight - POSTER_HEIGHT) / 2,
                    transform: [{ scale: previewScale }],
                  },
                ]}
              >
                <CrewReportPoster
                  photos={selectedPhotos}
                  record={record}
                  routeOverlayUri={routeOverlayUri}
                />
              </View>
              {!assetsReady ? (
                <View style={shareStyles.previewLoading}>
                  <ActivityIndicator color="#2A88CD" size="small" />
                  <Text style={shareStyles.previewLoadingText}>
                    이미지 준비 중
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <Text style={shareStyles.shareHint}>
            공유 문구도 함께 복사돼요
          </Text>
          <View style={shareStyles.channelRow}>
            <ShareChannel
              disabled={actionsDisabled}
              icon={require("@/assets/icons/crew-share.svg")}
              label="공유"
              loading={workingAction === "share"}
              onPress={() => void sharePreview()}
              tone="share"
            />
            <ShareChannel
              disabled={actionsDisabled}
              icon={require("@/assets/icons/crew-download.svg")}
              label="이미지 저장"
              loading={workingAction === "save"}
              onPress={() => void savePreview()}
              tone="save"
            />
          </View>
        </View>

        <PrimaryBottomButton
          disabled={busy || completeDisabled}
          onPress={onComplete}
          title={completeTitle}
        />
      </View>
    </Modal>
  );
}

type CrewPhotoComposerProps = {
  onClose: () => void;
  onGenerate: (photoIds: number[]) => void;
  record: CrewPloggingRecordDetail;
  visible: boolean;
};

export function CrewPhotoComposer({
  onClose,
  onGenerate,
  record,
  visible,
}: CrewPhotoComposerProps) {
  const insets = useSafeAreaInsets();
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const participantGroups = useMemo(
    () => buildParticipantPhotoGroups(record),
    [record]
  );
  const selectionLimit = Math.min(MAX_POSTER_PHOTOS, record.photos.length);

  useEffect(() => {
    if (!visible) return;
    setSelectedPhotoIds([]);
  }, [record.photos, selectionLimit, visible]);

  const togglePhoto = (photoId: number) => {
    const isSelected = selectedPhotoIds.includes(photoId);
    if (!isSelected && selectedPhotoIds.length >= MAX_POSTER_PHOTOS) {
      Alert.alert(
        "사진은 최대 4장까지",
        "첫 번째 사진은 크게, 나머지 사진은 아래에 배치돼요."
      );
      return;
    }

    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((selectedId) => selectedId !== photoId)
        : [...current, photoId]
    );
  };

  const generateImage = () => {
    onGenerate([...selectedPhotoIds]);
  };

  const buttonBottom = Math.max(16, insets.bottom + 12);
  const canGenerate = selectedPhotoIds.length > 0;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={composerStyles.root}>
        <ScrollView
          contentContainerStyle={[
            composerStyles.content,
            { paddingTop: insets.top + 92 },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={composerStyles.intro}>
            <Text style={composerStyles.introTitle}>
              인증 이미지에 넣을 사진을 골라주세요
            </Text>
            <Text style={composerStyles.introDescription}>
              최대 4장 · 선택한 순서대로 배치돼요 · 1번 사진은 크게 보여요
            </Text>
          </View>

          {participantGroups.length > 0 ? (
            participantGroups.map((group, groupIndex) => (
              <View key={group.userId} style={composerStyles.participantSection}>
                <View style={composerStyles.participantHeader}>
                  <View style={composerStyles.participantIdentity}>
                    <CrewAvatar
                      index={groupIndex}
                      nickname={group.nickname}
                      size={44}
                      uri={group.profileImageUrl}
                    />
                    <Text
                      numberOfLines={1}
                      style={composerStyles.participantName}
                    >
                      {group.nickname}
                    </Text>
                  </View>
                  <Text style={composerStyles.photoCount}>
                    기록한 사진 {group.photos.length}개
                  </Text>
                </View>

                {group.photos.length > 0 ? (
                  <ScrollView
                    contentContainerStyle={composerStyles.photoStripContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={composerStyles.photoStrip}
                  >
                    {group.photos.map((photo) => {
                      const selectionIndex = selectedPhotoIds.indexOf(
                        photo.photoId
                      );
                      const selected = selectionIndex >= 0;
                      return (
                        <Pressable
                          accessibilityHint="인증 이미지에 포함할 사진을 선택합니다"
                          accessibilityLabel={`${group.nickname} 인증 사진 ${
                            selected
                              ? `선택 순서 ${selectionIndex + 1}번, 선택 해제`
                              : "선택"
                          }`}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          key={photo.photoId}
                          onPress={() => togglePhoto(photo.photoId)}
                          style={({ pressed }) => [
                            composerStyles.photoButton,
                            pressed ? composerStyles.pressed : null,
                          ]}
                        >
                          <Image
                            accessibilityLabel={`${group.nickname}의 인증 사진`}
                            contentFit="cover"
                            source={{ uri: photo.objectUrl }}
                            style={StyleSheet.absoluteFill}
                          />
                          {selected ? (
                            <View style={composerStyles.selectedOverlay}>
                              <View style={composerStyles.selectionOrderBadge}>
                                <Text style={composerStyles.selectionOrderText}>
                                  {selectionIndex + 1}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : (
                  <View style={composerStyles.emptyPhotoStrip}>
                    <Text style={composerStyles.emptyPhotoText}>
                      기록한 사진이 없어요.
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={composerStyles.emptyState}>
              <Text style={composerStyles.emptyStateText}>
                선택할 인증 사진이 없어요.
              </Text>
            </View>
          )}
        </ScrollView>

        <LinearGradient
          colors={["rgba(250,250,250,0)", "#FAFAFA", "#FAFAFA"]}
          locations={[0, 0.26, 1]}
          pointerEvents="none"
          style={composerStyles.bottomFade}
        />
        <View
          accessibilityLabel={`${selectedPhotoIds.length}장 선택됨, 최대 ${selectionLimit}장`}
          style={[
            composerStyles.selectionPill,
            { bottom: buttonBottom + 70 },
          ]}
        >
          <Text style={composerStyles.selectionText}>
            {selectedPhotoIds.length} / {selectionLimit}
          </Text>
        </View>
        <Pressable
          accessibilityHint="선택한 사진으로 공유용 인증 이미지를 만듭니다"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGenerate }}
          disabled={!canGenerate}
          onPress={generateImage}
          style={({ pressed }) => [
            composerStyles.generateButton,
            { bottom: buttonBottom },
            !canGenerate ? composerStyles.generateButtonDisabled : null,
            pressed ? composerStyles.pressed : null,
          ]}
        >
          <Text style={composerStyles.generateButtonText}>이미지 생성하기</Text>
        </Pressable>

        <LinearGradient
          colors={["#FAFAFA", "#FAFAFA", "rgba(250,250,250,0)"]}
          locations={[0, 0.31, 1]}
          pointerEvents="none"
          style={[composerStyles.headerFade, { height: insets.top + 78 }]}
        />
        <Pressable
          accessibilityLabel="크루 인증사진 만들기 닫기"
          accessibilityRole="button"
          hitSlop={6}
          onPress={onClose}
          style={[composerStyles.backButton, { top: insets.top + 22 }]}
        >
          <Image
            contentFit="contain"
            source={require("@/assets/icons/crew-back.svg")}
            style={composerStyles.backIcon}
          />
        </Pressable>
        <Text
          pointerEvents="none"
          style={[composerStyles.headerTitle, { top: insets.top + 29 }]}
        >
          크루 인증사진 만들기
        </Text>
      </View>
    </Modal>
  );
}

function CrewReportPoster({
  photos,
  posterRef,
  record,
  routeOverlayUri,
}: {
  photos: readonly CrewPloggingPhoto[];
  posterRef?: Ref<View>;
  record: CrewPloggingRecordDetail;
  routeOverlayUri?: string | null;
}) {
  const heroPhoto = photos[0];
  const supportingPhotos = photos.slice(1, MAX_POSTER_PHOTOS);

  return (
    <View
      accessibilityLabel="크루 플로깅 인증 이미지"
      collapsable={false}
      ref={posterRef}
      style={shareStyles.poster}
    >
      {heroPhoto ? (
        <Image
          accessibilityLabel={`첫 번째 선택 사진, ${heroPhoto.uploaderNickname}의 인증 사진`}
          contentFit="cover"
          source={{ uri: heroPhoto.objectUrl }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={["#66747F", "#EEF4F8", "#C7D7E3", "#3E4B55"]}
          locations={[0, 0.3, 0.58, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={[
          "rgba(10,20,28,0.34)",
          "rgba(10,20,28,0.03)",
          "rgba(10,20,28,0.78)",
        ]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={shareStyles.posterHeader}>
        <Text style={shareStyles.posterBrand}>PLOVER</Text>
        <Text style={shareStyles.posterDate}>
          {formatPosterDate(record.startedAt)}
        </Text>
      </View>

      {routeOverlayUri ? (
        <Image
          accessibilityLabel="이번 플로깅에서 실제로 이동한 경로"
          contentFit="contain"
          source={{ uri: routeOverlayUri }}
          style={shareStyles.posterRouteOverlay}
        />
      ) : null}

      <View
        style={[
          shareStyles.posterCopy,
          supportingPhotos.length > 0
            ? shareStyles.posterCopyWithPhotos
            : shareStyles.posterCopyWithoutPhotos,
        ]}
      >
        <Text style={shareStyles.posterEyebrow}>CREW PLOGGING</Text>
        <Text numberOfLines={1} style={shareStyles.posterTitle}>
          {record.placeName ? `같이줍기 · ${record.placeName}` : "같이줍기"}
        </Text>
        <Text style={shareStyles.posterParticipants}>
          크루원 {record.participantCount}명과 함께한 기록
        </Text>
        <View style={shareStyles.posterMetricGrid}>
          <PosterMetric
            label="플로깅 시간"
            unit="H:M"
            value={formatDuration(record.ploggingSeconds)}
          />
          <PosterMetric
            label="거리"
            unit="km"
            value={formatDistance(record.distanceMeters)}
          />
          <PosterMetric
            label="걸음 수"
            unit="steps"
            value={record.stepCount?.toLocaleString("ko-KR") ?? "-"}
          />
          <PosterMetric
            label="예상 칼로리"
            unit="kcal"
            value={
              record.caloriesBurned == null
                ? "-"
                : Math.round(record.caloriesBurned).toLocaleString("ko-KR")
            }
          />
        </View>
      </View>

      {supportingPhotos.length > 0 ? (
        <View style={shareStyles.posterPhotos}>
          {supportingPhotos.map((photo, index) => (
            <View
              key={photo.photoId}
              style={[
                shareStyles.posterSecondaryPhoto,
                index > 0 ? shareStyles.posterPhotoSeparator : null,
              ]}
            >
              <Image
                accessibilityLabel={`${index + 2}번째 선택 사진, ${photo.uploaderNickname}의 인증 사진`}
                contentFit="cover"
                source={{ uri: photo.objectUrl }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PosterMetric({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={shareStyles.posterMetric}>
      <Text style={shareStyles.posterMetricLabel}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={shareStyles.posterMetricValue}
      >
        {value} <Text style={shareStyles.posterMetricUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function ShareChannel({
  disabled,
  icon,
  label,
  loading = false,
  onPress,
  tone,
}: {
  disabled: boolean;
  icon: number;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone: "share" | "save";
}) {
  const iconView = loading ? (
    <ActivityIndicator color="#2A88CD" size="small" />
  ) : (
    <Image contentFit="contain" source={icon} style={shareStyles.channelIcon} />
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        shareStyles.channel,
        disabled ? shareStyles.channelDisabled : null,
        pressed ? shareStyles.pressed : null,
      ]}
    >
      <View
        style={[
          shareStyles.channelCircle,
          tone === "share" ? shareStyles.shareCircle : shareStyles.saveCircle,
        ]}
      >
        {iconView}
      </View>
      <Text style={shareStyles.channelLabel}>{label}</Text>
    </Pressable>
  );
}

function buildParticipantPhotoGroups(record: CrewPloggingRecordDetail) {
  const groups = record.participants.map((participant) => ({
    ...participant,
    photos: record.photos.filter(
      (photo) => photo.uploaderUserId === participant.userId
    ),
  }));
  const participantIds = new Set(
    record.participants.map((participant) => participant.userId)
  );

  for (const photo of record.photos) {
    if (participantIds.has(photo.uploaderUserId)) continue;
    const existingGroup = groups.find(
      (group) => group.userId === photo.uploaderUserId
    );
    if (existingGroup) {
      existingGroup.photos.push(photo);
      continue;
    }
    groups.push({
      nickname: photo.uploaderNickname,
      photos: [photo],
      profileImageUrl: photo.uploaderProfileImageUrl,
      userId: photo.uploaderUserId,
    });
  }

  return groups;
}

function formatPosterDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()} · ${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )} · ${String(date.getDate()).padStart(2, "0")}`;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function showPhotoPermissionAlert(canAskAgain: boolean) {
  if (canAskAgain) {
    Alert.alert(
      "사진 추가 권한이 필요해요",
      "인증 이미지를 저장하려면 사진 앱에 추가할 수 있도록 허용해 주세요."
    );
    return;
  }

  Alert.alert(
    "사진 추가 권한이 꺼져 있어요",
    "설정에서 플로버의 사진 추가 권한을 허용한 뒤 다시 시도해 주세요.",
    [
      { style: "cancel", text: "취소" },
      { onPress: () => void Linking.openSettings(), text: "설정 열기" },
    ]
  );
}

const shareStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,17,24,0.48)",
  },
  channel: {
    alignItems: "center",
    gap: 8,
    minHeight: 76,
    minWidth: 64,
  },
  channelCircle: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  channelDisabled: {
    opacity: 0.48,
  },
  channelIcon: {
    height: 26,
    width: 26,
  },
  channelLabel: {
    color: "#5E5E63",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    textAlign: "center",
  },
  channelRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 48,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#F2F3F5",
    borderCurve: "continuous",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeIcon: {
    height: 14,
    width: 14,
  },
  exportHost: {
    left: -POSTER_WIDTH - 20,
    position: "absolute",
    top: 0,
    width: POSTER_WIDTH,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: "#D9DADE",
    borderRadius: 3,
    height: 5,
    marginTop: 10,
    width: 40,
  },
  modalRoot: {
    flex: 1,
  },
  poster: {
    backgroundColor: "#C6D4DE",
    borderCurve: "continuous",
    borderRadius: 22,
    height: POSTER_HEIGHT,
    overflow: "hidden",
    width: POSTER_WIDTH,
  },
  posterBrand: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    letterSpacing: 1.3,
  },
  posterCopy: {
    left: 18,
    position: "absolute",
    right: 18,
  },
  posterCopyWithPhotos: {
    bottom: 90,
  },
  posterCopyWithoutPhotos: {
    bottom: 24,
  },
  posterDate: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: fontFamilies.medium,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  posterEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: fontFamilies.bold,
    fontSize: 8,
    letterSpacing: 0.9,
  },
  posterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 18,
    position: "absolute",
    right: 18,
    top: 18,
  },
  posterMetric: {
    width: 108,
  },
  posterMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  posterMetricLabel: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: fontFamilies.regular,
    fontSize: 8,
  },
  posterMetricUnit: {
    fontFamily: fontFamilies.medium,
    fontSize: 9,
  },
  posterMetricValue: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 21,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.7,
    marginTop: 2,
  },
  posterParticipants: {
    color: "rgba(255,255,255,0.76)",
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    marginTop: 4,
  },
  posterPhotoSeparator: {
    borderLeftColor: "rgba(255,255,255,0.86)",
    borderLeftWidth: 2,
  },
  posterPhotos: {
    bottom: 0,
    flexDirection: "row",
    height: 76,
    left: 0,
    position: "absolute",
    right: 0,
  },
  posterSecondaryPhoto: {
    flex: 1,
    overflow: "hidden",
  },
  posterRouteOverlay: {
    height: 164,
    left: 39,
    position: "absolute",
    top: 58,
    width: 192,
  },
  posterTitle: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  previewArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 190,
  },
  previewFrame: {
    borderCurve: "continuous",
    borderRadius: 12,
    boxShadow: "0 8px 17px rgba(0,0,0,0.22)",
    overflow: "hidden",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(250,250,250,0.9)",
    gap: 8,
    justifyContent: "center",
  },
  previewLoadingText: {
    color: "#5E5E63",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  previewScaler: {
    height: POSTER_HEIGHT,
    position: "absolute",
    width: POSTER_WIDTH,
  },
  saveCircle: {
    backgroundColor: "#F2F7FD",
    borderColor: "#E4EFFA",
    borderWidth: 1,
  },
  shareCircle: {
    backgroundColor: "#F4F5F7",
    borderColor: "#E8E9EC",
    borderWidth: 1,
  },
  shareHint: {
    color: "#727272",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginBottom: 12,
    textAlign: "center",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: "0 -8px 20px rgba(0,0,0,0.2)",
    left: 0,
    paddingBottom: 18,
    position: "absolute",
    right: 0,
    zIndex: 3,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetSubtitle: {
    color: "#727272",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginTop: 5,
  },
  sheetTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
});

const composerStyles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    left: 18,
    position: "absolute",
    width: 44,
    zIndex: 5,
  },
  backIcon: {
    height: 17,
    width: 10,
  },
  bottomFade: {
    bottom: 0,
    height: 190,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  content: {
    gap: 24,
    paddingBottom: 210,
    paddingHorizontal: 24,
  },
  emptyPhotoStrip: {
    alignItems: "center",
    borderColor: "#E6E6E6",
    borderCurve: "continuous",
    borderRadius: 12,
    borderWidth: 1,
    height: 100,
    justifyContent: "center",
    marginTop: 16,
    width: "100%",
  },
  emptyPhotoText: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 88,
  },
  emptyStateText: {
    color: "#727272",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  generateButton: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderCurve: "continuous",
    borderRadius: 14,
    height: 58,
    justifyContent: "center",
    left: 24,
    position: "absolute",
    right: 24,
    zIndex: 4,
  },
  generateButtonDisabled: {
    opacity: 0.42,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  headerFade: {
    boxShadow: "0 0 30px rgba(0,0,0,0.1)",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 3,
  },
  headerTitle: {
    color: "#4D4D52",
    fontFamily: fontFamilies.medium,
    fontSize: 18,
    left: 64,
    letterSpacing: -0.36,
    position: "absolute",
    right: 64,
    textAlign: "center",
    zIndex: 4,
  },
  intro: {
    gap: 6,
  },
  introDescription: {
    color: "#727272",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  introTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
  },
  participantHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  participantIdentity: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 12,
  },
  participantName: {
    color: "#0A0A0A",
    flexShrink: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
  },
  participantSection: {
    gap: 0,
  },
  photoButton: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 0 7px rgba(0,0,0,0.13)",
    height: 96,
    overflow: "hidden",
    width: 84,
  },
  photoCount: {
    color: "#727272",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    textAlign: "right",
  },
  photoStrip: {
    borderColor: "#E6E6E6",
    borderCurve: "continuous",
    borderRadius: 12,
    borderWidth: 1,
    height: 100,
    marginTop: 16,
    overflow: "hidden",
    width: "100%",
  },
  photoStripContent: {
    alignItems: "center",
    gap: 2,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "flex-end",
    backgroundColor: "rgba(228,239,250,0.4)",
    borderColor: "#2A88CD",
    borderWidth: 2,
    justifyContent: "flex-start",
    padding: 6,
  },
  selectionOrderBadge: {
    alignItems: "center",
    backgroundColor: "#2A88CD",
    borderColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  selectionOrderText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  selectionPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#2A88CD",
    borderRadius: 22,
    borderWidth: 2,
    boxShadow: "0 0 15px rgba(0,0,0,0.1)",
    height: 38,
    justifyContent: "center",
    minWidth: 74,
    paddingHorizontal: 18,
    position: "absolute",
    zIndex: 4,
  },
  selectionText: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.34,
  },
});
