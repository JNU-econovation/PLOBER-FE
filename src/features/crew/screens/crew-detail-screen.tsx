import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  createCrewPloggingSession,
  getActiveCrewPloggingSession,
  getCrewDetail,
  type CrewDetailResponse,
  type CrewPloggingRecordSummary,
} from "../api";
import {
  CrewAvatar,
  CrewAvatarStack,
  CrewErrorState,
  CrewLoadingState,
  CrewScreenHeader,
  CrewStatRow,
  formatCrewDate,
  formatDistance,
  formatDuration,
  formatSteps,
  getApiErrorMessage,
} from "../components/crew-ui";
import { getBlockedCrewUserIds } from "../services/crew-safety";

import { fontFamilies } from "@/src/shared/theme";

export function CrewDetailScreen({ crewId }: { crewId: number }) {
  const router = useRouter();
  const [detail, setDetail] = useState<CrewDetailResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<number[]>([]);

  const loadDetail = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const [response, nextBlockedUserIds] = await Promise.all([
        getCrewDetail({ crewId }),
        getBlockedCrewUserIds(),
      ]);
      setDetail(response);
      setBlockedUserIds(nextBlockedUserIds);
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
      let disposed = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const pollActiveSession = async () => {
        try {
          const activeSession = await getActiveCrewPloggingSession({ crewId });
          if (!disposed) {
            setDetail((previous) =>
              previous ? { ...previous, activeSession } : previous
            );
          }
        } catch {
          // 상세 조회 성공 상태는 유지하고 다음 주기에 활성 세션만 다시 확인한다.
        } finally {
          if (!disposed) {
            timeoutId = setTimeout(() => {
              void pollActiveSession();
            }, 3_000);
          }
        }
      };

      void loadDetail().then(() => {
        if (!disposed) void pollActiveSession();
      });

      return () => {
        disposed = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [crewId, loadDetail])
  );

  const leader = useMemo(
    () => detail?.members.find((member) => member.role === "LEADER") ?? null,
    [detail]
  );

  const openSession = useCallback(
    (sessionId: number) => {
      router.push(`/crews/${crewId}/sessions/${sessionId}`);
    },
    [crewId, router]
  );

  const handleSessionPress = useCallback(async () => {
    if (!detail) return;
    if (detail.activeSession) {
      openSession(detail.activeSession.crewPloggingSessionId);
      return;
    }
    if (detail.myRole !== "LEADER") return;

    setCreatingSession(true);
    try {
      const session = await createCrewPloggingSession({ crewId });
      setDetail((previous) =>
        previous ? { ...previous, activeSession: session } : previous
      );
      openSession(session.crewPloggingSessionId);
    } catch (error) {
      Alert.alert("같이줍기를 열지 못했어요", getApiErrorMessage(error));
      await loadDetail(true);
    } finally {
      setCreatingSession(false);
    }
  }, [crewId, detail, loadDetail, openSession]);

  const goToCrewList = useCallback(() => {
    router.replace("/crews");
  }, [router]);

  if (status === "loading") {
    return (
      <View style={styles.root}>
        <CrewScreenHeader onBack={goToCrewList} title="크루" />
        <CrewLoadingState />
      </View>
    );
  }

  if (status === "error" || !detail) {
    return (
      <View style={styles.root}>
        <CrewScreenHeader onBack={goToCrewList} title="크루" />
        <CrewErrorState message={errorMessage} onRetry={() => void loadDetail()} />
      </View>
    );
  }

  const hasActiveSession = detail.activeSession !== null;
  const leaderBlocked = leader
    ? blockedUserIds.includes(leader.userId)
    : false;
  const displayedLeaderNickname = leaderBlocked
    ? "차단한 사용자"
    : (leader?.nickname ?? "크루장");
  const canCreateSession = detail.myRole === "LEADER";
  const sessionTitle = hasActiveSession
    ? detail.activeSession?.status === "RECRUITING"
      ? "모집 중인 같이줍기 보기"
      : "진행 중인 같이줍기 보기"
    : canCreateSession
      ? "같이 플로깅하기"
      : "모집 중인 같이줍기가 없어요";

  return (
    <View style={styles.root}>
      <CrewScreenHeader onBack={goToCrewList} title={detail.name} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void loadDetail(true)}
            refreshing={refreshing}
            tintColor="#449DDD"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.peopleRow}>
          <Pressable
            disabled={!leader}
            onPress={() =>
              leader &&
              router.push(`/crews/${crewId}/members/${leader.userId}`)
            }
            style={({ pressed }) => [
              styles.personCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.personCaption}>크루장</Text>
            <CrewAvatar
              index={1}
              nickname={displayedLeaderNickname}
              size={52}
              uri={leaderBlocked ? null : leader?.profileImageUrl}
            />
            <Text numberOfLines={1} style={styles.personName}>
              {displayedLeaderNickname}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/crews/${crewId}/members`)}
            style={({ pressed }) => [
              styles.personCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.personCaption}>크루원 {detail.memberCount}명</Text>
            <CrewAvatarStack
              memberCount={detail.memberCount}
              size={40}
              urls={detail.members
                .filter((member) => !blockedUserIds.includes(member.userId))
                .map((member) => member.profileImageUrl)
                .filter((value): value is string => Boolean(value))}
            />
            <View style={styles.moreMembersRow}>
              <Text style={styles.moreMembersText}>자세히 보기</Text>
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-back.svg")}
                style={styles.moreMembersArrow}
                tintColor="#2A88CD"
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.statsCard}>
          <CrewStatRow
            items={[
              { label: "플로깅", unit: "회", value: String(detail.completedPloggingCount) },
              { label: "누적 거리", unit: "km", value: formatDistance(detail.totalDistanceMeters) },
              {
                label: "누적 걸음",
                unit: detail.totalStepCount >= 10_000 ? "만보" : "보",
                value: formatSteps(detail.totalStepCount),
              },
              {
                label: "누적 시간",
                unit: "시간",
                value: (detail.totalPloggingSeconds / 3_600)
                  .toFixed(1)
                  .replace(/\.0$/, ""),
              },
            ]}
            variant="detail"
          />
        </View>

        <View style={styles.recordsSection}>
          <View style={styles.recordsTitleRow}>
            <Text style={styles.recordsTitle}>함께한 기록</Text>
            {detail.completedRecords.length > 3 ? (
              <Pressable onPress={() => router.push(`/crews/${crewId}/records`)}>
                <Text style={styles.viewAllText}>전체보기</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!hasActiveSession && !canCreateSession}
            onPress={() => void handleSessionPress()}
            style={({ pressed }) => [
              styles.sessionCard,
              !hasActiveSession && !canCreateSession
                ? styles.sessionCardDisabled
                : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View
              style={[
                styles.sessionPlus,
                !hasActiveSession && !canCreateSession
                  ? styles.sessionPlusDisabled
                  : null,
              ]}
            >
              <Image
                contentFit="contain"
                source={
                  hasActiveSession
                    ? require("@/assets/icons/crew-session-users.svg")
                    : require("@/assets/icons/crew-cta-plus.svg")
                }
                style={
                  hasActiveSession
                    ? styles.sessionActiveIcon
                    : styles.sessionPlusIcon
                }
                tintColor={hasActiveSession ? "#FFFFFF" : undefined}
              />
            </View>
            <Text
              style={[
                styles.sessionText,
                !hasActiveSession && !canCreateSession
                  ? styles.sessionTextDisabled
                  : null,
              ]}
            >
              {creatingSession ? "여는 중..." : sessionTitle}
            </Text>
          </Pressable>
          {detail.completedRecords.slice(0, 3).map((record) => (
            <CrewRecordCard
              key={record.crewPloggingSessionId}
              onPress={() =>
                router.push(
                  `/crews/${crewId}/records/${record.crewPloggingSessionId}`
                )
              }
              record={record}
            />
          ))}
          {detail.completedRecords.length === 0 ? (
            <Text style={styles.emptyRecords}>아직 함께한 기록이 없어요.</Text>
          ) : null}
        </View>
      </ScrollView>

    </View>
  );
}

function CrewRecordCard({
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
        ) : null}
      </View>
      <View style={styles.recordCopy}>
        <Text numberOfLines={1} style={styles.recordTitle}>
          {formatCrewDate(record.ploggingDate)} 같이줍기
        </Text>
        <Text numberOfLines={1} style={styles.recordSubtitle}>
          {participantText} · {formatDuration(record.ploggingSeconds)} 진행
        </Text>
      </View>
      <View style={styles.recordDistanceRow}>
        <Text style={styles.recordDistance}>
          {formatDistance(record.distanceMeters)}
        </Text>
        <Text style={styles.recordDistanceUnit}>km</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 130,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  emptyRecords: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    paddingVertical: 18,
    textAlign: "center",
  },
  moreMembersArrow: {
    height: 10.5,
    marginLeft: 4,
    transform: [{ rotate: "180deg" }],
    width: 6,
  },
  moreMembersRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  moreMembersText: {
    color: "#2A88CD",
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
  },
  peopleRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 27,
  },
  personCaption: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    marginBottom: 10,
  },
  personCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    boxShadow: "0 0 8px rgba(0,0,0,0.06)",
    elevation: 2,
    flex: 1,
    height: 136,
    paddingTop: 16,
  },
  personName: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
    letterSpacing: -0.3,
    marginTop: 8,
    maxWidth: 120,
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
  recordDistance: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  recordDistanceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    marginLeft: 8,
  },
  recordDistanceUnit: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 2,
  },
  recordImage: {
    alignItems: "center",
    backgroundColor: "#D3D3D3",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    overflow: "hidden",
    width: 50,
  },
  recordSubtitle: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    marginTop: 6,
  },
  recordTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  recordsSection: {
    gap: 12,
    marginTop: 28,
  },
  recordsTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  recordsTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  sessionActiveIcon: {
    height: 20,
    width: 20,
  },
  sessionCard: {
    alignItems: "center",
    backgroundColor: "#F2F7FD",
    borderColor: "#C3DEF4",
    borderRadius: 18,
    borderWidth: 2,
    boxShadow: "0 0 8px rgba(0,0,0,0.06)",
    elevation: 2,
    flexDirection: "row",
    height: 80,
    justifyContent: "center",
  },
  sessionCardDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E6E6E6",
  },
  sessionPlus: {
    alignItems: "center",
    backgroundColor: "#2A88CD",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  sessionPlusDisabled: {
    backgroundColor: "#A7A7A7",
  },
  sessionPlusIcon: {
    height: 16,
    width: 16,
  },
  sessionText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
    marginLeft: 12,
  },
  sessionTextDisabled: {
    color: "#727272",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    boxShadow: "0 0 10.6px rgba(0,0,0,0.07)",
    elevation: 3,
    height: 89,
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 23,
  },
  viewAllText: {
    color: "#2A88CD",
    fontFamily: fontFamilies.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
  },
});
