import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { fontFamilies, getSafeLineHeight } from "@/src/shared/theme";
import { PrimaryBottomButton } from "@/src/shared/ui";

import {
  getCrewPloggingRecordDetail,
  getCrewPloggingRecords,
  type CrewPloggingRecordDetail,
  type CrewPloggingRecordSummary,
} from "../api";
import {
  CrewAvatar,
  CrewErrorState,
  CrewLoadingState,
  CrewScreenHeader,
  formatCrewDate,
  formatDistance,
  formatDuration,
  formatTime,
  getApiErrorMessage,
} from "../components/crew-ui";
import { ReportShareSheet } from "../components/crew-report-overlays";
import {
  applyBlockedCrewUsers,
  getBlockedCrewUserIds,
} from "../services/crew-safety";

const PAGE_SIZE = 20;
const DETAIL_CONTENT_HORIZONTAL_PADDING = 24;
const DETAIL_PHOTO_OVERLAP = 4;
const DETAIL_PHOTO_MAX_WIDTH = 91;
const DETAIL_PHOTO_ASPECT_RATIO = 91 / 105;
const FLOATING_SHARE_BUTTON_HEIGHT = 46;
const PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT = 70;

export function CrewRecordsScreen({ crewId }: { crewId: number }) {
  const router = useRouter();
  const [records, setRecords] = useState<CrewPloggingRecordSummary[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirst = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const response = await getCrewPloggingRecords({
        crewId,
        page: 0,
        size: PAGE_SIZE,
      });
      setRecords(response.content);
      setPage(0);
      setHasNext(response.hasNext);
      setStatus("ready");
      setErrorMessage("");
    } catch (error) {
      setStatus("error");
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [crewId]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst])
  );

  const loadMore = useCallback(async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await getCrewPloggingRecords({
        crewId,
        page: nextPage,
        size: PAGE_SIZE,
      });
      setRecords((previous) => [
        ...previous,
        ...response.content.filter(
          (next) =>
            !previous.some(
              (current) =>
                current.crewPloggingSessionId === next.crewPloggingSessionId
            )
        ),
      ]);
      setPage(nextPage);
      setHasNext(response.hasNext);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }, [crewId, hasNext, loadingMore, page]);

  return (
    <View style={styles.root}>
      <CrewScreenHeader onBack={() => router.back()} title="함께한 기록" />
      {status === "loading" ? (
        <CrewLoadingState />
      ) : status === "error" ? (
        <CrewErrorState message={errorMessage} onRetry={() => void loadFirst()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          onMomentumScrollEnd={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              event.nativeEvent;
            if (
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - 120
            ) {
              void loadMore();
            }
          }}
          refreshControl={
            <RefreshControl
              onRefresh={() => void loadFirst(true)}
              refreshing={refreshing}
              tintColor="#449DDD"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listLabelRow}>
            <Text style={styles.listLabel}>전체</Text>
            <Text style={styles.listCount}>{records.length}</Text>
          </View>
          <View style={styles.recordList}>
            {records.map((record) => (
              <RecordListCard
                key={record.crewPloggingSessionId}
                onPress={() =>
                  router.push(
                    `/crews/${crewId}/records/${record.crewPloggingSessionId}`
                  )
                }
                record={record}
              />
            ))}
          </View>
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-empty-users.svg")}
                style={styles.emptyUsersIcon}
              />
              <Text style={styles.emptyTitle}>아직 함께한 기록이 없어요</Text>
            </View>
          ) : null}
          {loadingMore ? (
            <ActivityIndicator color="#449DDD" style={styles.moreLoader} />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

export function CrewRecordDetailScreen({
  crewId,
  sessionId,
}: {
  crewId: number;
  sessionId: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const [record, setRecord] = useState<CrewPloggingRecordDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const [response, blockedUserIds] = await Promise.all([
        getCrewPloggingRecordDetail({ crewId, sessionId }),
        getBlockedCrewUserIds(),
      ]);
      setRecord(applyBlockedCrewUsers(response, blockedUserIds));
      setStatus("ready");
      setErrorMessage("");
    } catch (error) {
      setStatus("error");
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [crewId, sessionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (status === "loading") {
    return (
      <View style={styles.root}>
        <CrewLoadingState />
      </View>
    );
  }

  if (status === "error" || !record) {
    return (
      <View style={styles.root}>
        <CrewErrorState message={errorMessage} onRetry={() => void load()} />
      </View>
    );
  }

  const participantName = record.representativeNickname
    ? `${record.representativeNickname}${
        record.participantCount > 1 ? ` 외 ${record.participantCount - 1}명` : ""
      }`
    : `참여자 ${record.participantCount}명`;
  const shareMessage = `${formatCrewDate(record.startedAt)} 같이줍기 · ${formatDistance(
    record.distanceMeters
  )}km · ${participantName}`;
  const bottomActionHeight =
    PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT + insets.bottom;
  const availablePhotoRowWidth = Math.max(
    0,
    viewportWidth - DETAIL_CONTENT_HORIZONTAL_PADDING * 2
  );
  const detailPhotoWidth = Math.min(
    DETAIL_PHOTO_MAX_WIDTH,
    Math.max(
      0,
      (availablePhotoRowWidth + DETAIL_PHOTO_OVERLAP * 3) / 4
    )
  );
  const detailPhotoHeight = detailPhotoWidth / DETAIL_PHOTO_ASPECT_RATIO;

  const saveRecord = async () => {
    if (saving) return;
    if (Platform.OS === "web") {
      Alert.alert("저장 미지원", "기록 이미지는 모바일 앱에서 저장할 수 있습니다.");
      return;
    }
    if (!scrollRef.current) return;

    setSaving(true);
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

      const imageUri = await captureRef(scrollRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        snapshotContentContainer: true,
      });
      await MediaLibrary.saveToLibraryAsync(imageUri);
      Alert.alert("저장 완료", "같이줍기 기록을 사진 앱에 저장했습니다.");
    } catch (error) {
      Alert.alert(
        "저장 실패",
        error instanceof Error
          ? error.message
          : "같이줍기 기록을 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.detailRoot}>
      <ScrollView
        collapsable={false}
        contentContainerStyle={[
          styles.detailContent,
          { paddingTop: insets.top + 58 },
        ]}
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor="#449DDD"
          />
        }
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tagRow}>
          <View style={styles.modeTag}>
            <Text style={styles.modeTagText}>자유모드</Text>
          </View>
          <View style={styles.modeTag}>
            <Text style={styles.modeTagText}>같이줍기</Text>
          </View>
        </View>
        <Text style={styles.detailTitle}>
          <Text style={styles.detailTitleStrong}>
            {formatCrewDate(record.startedAt)}
          </Text>{" "}
          플로깅
        </Text>
        <View style={styles.detailMetaRow}>
          <Text style={styles.detailMeta}>
            {formatTime(record.startedAt)} - {formatTime(record.endedAt)}
          </Text>
          {record.placeName ? (
            <Text numberOfLines={1} style={styles.detailMeta}>
              {` · ${record.placeName}`}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.summaryCard,
            !record.mapImageUrl ? styles.summaryCardWithoutMap : null,
          ]}
        >
          {record.mapImageUrl ? (
            <Image
              accessibilityLabel="같이줍기 경로 지도"
              contentFit="cover"
              source={{ uri: record.mapImageUrl }}
              style={styles.mapImage}
            />
          ) : null}
          <View style={styles.summaryStats}>
            <SummaryMetric unit="km" value={formatDistance(record.distanceMeters)} />
            <SummaryMetric
              unit="steps"
              value={
                record.stepCount === null
                  ? "-"
                  : record.stepCount.toLocaleString("ko-KR")
              }
            />
            <SummaryMetric unit="H:M" value={formatDuration(record.ploggingSeconds)} />
          </View>
        </View>

        {record.photos.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.photoRow}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.reportPhotoStrip, { height: detailPhotoHeight }]}
          >
            {record.photos.map((photo, index) => (
              <Pressable
                accessibilityLabel={`${photo.uploaderNickname} 인증 사진`}
                accessibilityHint="업로더 프로필에서 신고하거나 차단할 수 있습니다"
                accessibilityRole="button"
                key={photo.photoId}
                onPress={() =>
                  router.push(
                    `/crews/${crewId}/members/${photo.uploaderUserId}`
                  )
                }
                style={[
                  styles.photo,
                  { height: detailPhotoHeight, width: detailPhotoWidth },
                  index > 0 ? styles.photoOverlap : null,
                ]}
              >
                <Image
                  contentFit="cover"
                  source={{ uri: photo.objectUrl }}
                  style={StyleSheet.absoluteFill}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noPhotos}>
            <Image
              contentFit="contain"
              source={require("@/assets/icons/crew-empty-photo.svg")}
              style={styles.noPhotosIcon}
            />
            <Text style={styles.noPhotosText}>공유된 인증 사진이 없어요.</Text>
          </View>
        )}

        <View style={styles.participantsCard}>
          <View style={styles.participantCopy}>
            <View style={styles.participantsTitleRow}>
              <View style={styles.participantTag}>
                <Text style={styles.participantTagText}>참여</Text>
              </View>
              <Text numberOfLines={1} style={styles.participantNames}>
                {participantName}
              </Text>
            </View>
            <Text style={styles.participantsTitle}>
              함께한 크루원 {record.participantCount}명
            </Text>
          </View>
          <View style={styles.participantAvatars}>
            {record.participants.slice(0, 3).map((participant, index) => (
              <Pressable
                accessibilityLabel={`${participant.nickname} 프로필`}
                accessibilityRole="button"
                key={participant.userId}
                onPress={() =>
                  router.push(
                    `/crews/${crewId}/members/${participant.userId}`
                  )
                }
                style={{ marginLeft: index === 0 ? 0 : -14 }}
              >
                <CrewAvatar
                  index={index}
                  nickname={participant.nickname}
                  size={44}
                  uri={participant.profileImageUrl}
                />
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>

      <LinearGradient
        colors={["#FAFAFA", "rgba(250,250,250,0)"]}
        locations={[0.32, 1]}
        pointerEvents="none"
        style={[styles.reportHeaderFade, { height: insets.top + 54 }]}
      />
      <Pressable
        accessibilityLabel="뒤로가기"
        onPress={() => router.back()}
        style={[styles.floatingBack, { top: insets.top + 10 }]}
      >
        <Image
          contentFit="contain"
          source={require("@/assets/icons/crew-back.svg")}
          style={styles.floatingBackIcon}
        />
      </Pressable>
      <View style={[styles.saveControl, { top: insets.top + 10 }] }>
        <Pressable
          accessibilityLabel="기록 저장하기"
          disabled={saving}
          onPress={() => void saveRecord()}
          style={({ pressed }) => [
            styles.saveButton,
            pressed ? styles.pressed : null,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#33363F" size="small" />
          ) : (
            <Image
              contentFit="contain"
              source={require("@/assets/icons/crew-save-header.svg")}
              style={styles.saveIcon}
            />
          )}
        </Pressable>
        <Text style={styles.saveLabel}>저장하기</Text>
      </View>
      <LinearGradient
        colors={["rgba(250,250,250,0)", "#FAFAFA"]}
        pointerEvents="none"
        style={[
          styles.shareFade,
          { bottom: Math.max(bottomActionHeight - 8, 0) },
        ]}
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.shareButtonOverlay,
          { bottom: bottomActionHeight + 16 },
        ]}
      >
        <Pressable
          accessibilityLabel="SNS 공유하기"
          accessibilityRole="button"
          onPress={() => setShareSheetVisible(true)}
          style={({ pressed }) => [
            styles.shareButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            contentFit="contain"
            source={require("@/assets/icons/crew-share.svg")}
            style={styles.shareIcon}
          />
          <Text style={styles.shareText}>SNS 공유하기</Text>
        </Pressable>
      </View>
      <PrimaryBottomButton
        onPress={() => router.replace(`/crews/${crewId}`)}
        title="크루로 돌아가기"
      />
      <ReportShareSheet
        completeTitle="크루로 돌아가기"
        message={shareMessage}
        onClose={() => setShareSheetVisible(false)}
        onComplete={() => {
          setShareSheetVisible(false);
          router.replace(`/crews/${crewId}`);
        }}
        record={record}
        visible={shareSheetVisible}
      />
    </View>
  );
}

function RecordListCard({
  onPress,
  record,
}: {
  onPress: () => void;
  record: CrewPloggingRecordSummary;
}) {
  const participantText = record.representativeNickname
    ? `${record.representativeNickname}${
        record.participantCount > 1 ? ` 외 ${record.participantCount - 1}명` : ""
      }`
    : `참여자 ${record.participantCount}명`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recordCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.recordImage}>
        {record.representativePhotoUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: record.representativePhotoUrl }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Image
            contentFit="contain"
            source={require("@/assets/icons/crew-empty-photo.svg")}
            style={styles.recordPlaceholderIcon}
          />
        )}
      </View>
      <View style={styles.recordCopy}>
        <Text numberOfLines={1} style={styles.recordTitle}>
          {formatCrewDate(record.ploggingDate)} 같이줍기
        </Text>
        <Text numberOfLines={1} style={styles.recordSubtitle}>
          {participantText} · {formatDuration(record.ploggingSeconds)} 진행
        </Text>
      </View>
      <View style={styles.distanceRow}>
        <Text style={styles.distanceValue}>
          {formatDistance(record.distanceMeters)}
        </Text>
        <Text style={styles.distanceUnit}>km</Text>
      </View>
    </Pressable>
  );
}

function SummaryMetric({ unit, value }: { unit: string; value: string }) {
  return (
    <View style={styles.summaryMetric}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailContent: {
    paddingBottom: 260,
    paddingHorizontal: 24,
  },
  detailMeta: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  detailMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  detailRoot: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  detailTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 28,
    letterSpacing: -0.56,
    lineHeight: getSafeLineHeight(28, fontFamilies.regular, 32),
    marginLeft: 2,
    marginTop: 12,
  },
  detailTitleStrong: {
    fontFamily: fontFamilies.semiBold,
  },
  distanceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    marginLeft: 8,
  },
  distanceUnit: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 2,
  },
  distanceValue: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 18,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 100,
  },
  emptyUsersIcon: {
    height: 34,
    width: 34,
  },
  emptyTitle: {
    color: "#727272",
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    marginTop: 14,
  },
  floatingBack: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    boxShadow: "0 0 10.6px rgba(0,0,0,0.07)",
    elevation: 3,
    height: 44,
    justifyContent: "center",
    left: 26,
    position: "absolute",
    width: 44,
    zIndex: 3,
  },
  floatingBackIcon: {
    height: 19,
    width: 11,
  },
  listContent: {
    paddingBottom: 126,
    paddingHorizontal: 24,
    paddingTop: 17,
  },
  listCount: {
    color: "#2A88CD",
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    marginLeft: 4,
  },
  listLabel: {
    color: "#3A3A3E",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
  },
  listLabelRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  mapImage: {
    height: 189,
    width: "100%",
  },
  modeTag: {
    alignItems: "center",
    backgroundColor: "#F2F7FD",
    borderColor: "#E4EFFA",
    borderRadius: 23,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modeTagText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  moreLoader: {
    marginTop: 22,
  },
  noPhotos: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    height: 105,
    justifyContent: "center",
    marginTop: 20,
  },
  noPhotosIcon: {
    height: 24,
    width: 24,
  },
  noPhotosText: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    marginLeft: 9,
  },
  participantAvatars: {
    flexDirection: "row",
  },
  participantNames: {
    color: "#0A0A0A",
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  participantsCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 30.7px rgba(0,0,0,0.1)",
    elevation: 3,
    flexDirection: "row",
    height: 104,
    justifyContent: "space-between",
    marginTop: 20,
    overflow: "hidden",
    paddingHorizontal: 22,
  },
  participantCopy: {
    flex: 1,
    minWidth: 0,
  },
  participantTag: {
    alignItems: "center",
    backgroundColor: "#1FA868",
    borderRadius: 17,
    height: 18,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  participantTagText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
  },
  participantsTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  participantsTitle: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    marginTop: 8,
  },
  photo: {
    borderRadius: 6,
    boxShadow: "0 0 30.7px rgba(0,0,0,0.1)",
    elevation: 2,
  },
  photoOverlap: {
    marginLeft: -4,
  },
  photoRow: {
    paddingRight: 24,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  recordCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    boxShadow: "0 0 8px rgba(0,0,0,0.06)",
    elevation: 2,
    flexDirection: "row",
    height: 80,
    paddingHorizontal: 16,
  },
  recordCopy: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  recordImage: {
    alignItems: "center",
    backgroundColor: "#E6E6E6",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    overflow: "hidden",
    width: 50,
  },
  recordPlaceholderIcon: {
    height: 21,
    width: 21,
  },
  recordList: {
    gap: 12,
  },
  recordSubtitle: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    marginTop: 6,
  },
  recordTitle: {
    color: "#121212",
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  reportHeaderFade: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  reportPhotoStrip: {
    marginTop: 20,
    width: "100%",
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderColor: "#449DDD",
    borderRadius: FLOATING_SHARE_BUTTON_HEIGHT / 2,
    borderWidth: 1,
    boxShadow: "0 0 15.35px rgba(0,0,0,0.1)",
    flexDirection: "row",
    gap: 8,
    height: FLOATING_SHARE_BUTTON_HEIGHT,
    justifyContent: "center",
    width: 184,
  },
  shareButtonOverlay: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 4,
  },
  shareFade: {
    height: 133,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 3,
  },
  shareText: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  shareIcon: {
    height: 20,
    width: 20,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 15.35px rgba(0,0,0,0.1)",
    elevation: 4,
    marginTop: 14,
    overflow: "hidden",
  },
  summaryCardWithoutMap: {
    marginTop: 14,
  },
  summaryMetric: {
    alignItems: "flex-end",
    flexDirection: "row",
    minWidth: 0,
  },
  summaryStats: {
    alignItems: "center",
    flexDirection: "row",
    height: 71,
    justifyContent: "space-between",
    paddingHorizontal: 23,
  },
  summaryUnit: {
    color: "#727272",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 3,
  },
  summaryValue: {
    color: "#121212",
    flexShrink: 1,
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 22,
    letterSpacing: -1.1,
  },
  tagRow: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 2,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    boxShadow: "0 0 10.6px rgba(0,0,0,0.07)",
    elevation: 3,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  saveControl: {
    alignItems: "center",
    position: "absolute",
    right: 24,
    zIndex: 3,
  },
  saveLabel: {
    color: "#121212",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    marginTop: 3,
  },
  saveIcon: {
    height: 24,
    width: 24,
  },
});
