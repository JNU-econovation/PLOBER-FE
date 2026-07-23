import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getCrewMemberProfile, type CrewMemberProfileResponse } from "../api";
import {
  CrewErrorState,
  CrewLoadingState,
  CrewScreenHeader,
  CrewStatRow,
  formatDistance,
  formatSteps,
  getApiErrorMessage,
} from "../components/crew-ui";
import {
  buildCrewSafetyReportUrl,
  CREW_SAFETY_CONTACT_EMAIL,
  getBlockedCrewUserIds,
  setCrewUserBlocked,
} from "../services/crew-safety";

import { useAuthSession } from "@/src/features/auth";
import { fontFamilies } from "@/src/shared/theme";

export function CrewMemberProfileScreen({
  crewId,
  userId,
}: {
  crewId: number;
  userId: number;
}) {
  const router = useRouter();
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<CrewMemberProfileResponse | null>(
    null,
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [updatingBlock, setUpdatingBlock] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) setRefreshing(true);
      try {
        const [response, blockedUserIds] = await Promise.all([
          getCrewMemberProfile({
            crewId,
            targetUserId: userId,
          }),
          getBlockedCrewUserIds(),
        ]);
        setProfile(response);
        setBlocked(blockedUserIds.includes(userId));
        setStatus("ready");
        setErrorMessage("");
      } catch (error) {
        setStatus("error");
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setRefreshing(false);
      }
    },
    [crewId, userId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const reportUser = useCallback(() => {
    if (!profile) return;
    Alert.alert(
      "사용자 신고",
      "메일에 신고 사유와 문제가 된 화면을 적어 보내주세요. 운영팀이 확인합니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "신고 메일 작성",
          onPress: () => {
            void Linking.openURL(
              buildCrewSafetyReportUrl({
                crewId,
                nickname: profile.nickname,
                userId,
              })
            ).catch(() => {
              Alert.alert(
                "메일 앱을 열 수 없어요",
                CREW_SAFETY_CONTACT_EMAIL
              );
            });
          },
        },
      ]
    );
  }, [crewId, profile, userId]);

  const toggleBlock = useCallback(() => {
    if (!profile || updatingBlock) return;
    const nextBlocked = !blocked;
    Alert.alert(
      nextBlocked ? "사용자 차단" : "차단 해제",
      nextBlocked
        ? "이 사용자의 닉네임·프로필과 공유 사진을 이 기기에서 숨깁니다."
        : "이 사용자의 프로필과 공유 사진을 다시 표시합니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: nextBlocked ? "차단" : "해제",
          style: nextBlocked ? "destructive" : "default",
          onPress: () => {
            setUpdatingBlock(true);
            void setCrewUserBlocked(userId, nextBlocked)
              .then(() => setBlocked(nextBlocked))
              .catch(() =>
                Alert.alert("처리 실패", "잠시 후 다시 시도해주세요.")
              )
              .finally(() => setUpdatingBlock(false));
          },
        },
      ]
    );
  }, [blocked, profile, updatingBlock, userId]);

  return (
    <View style={styles.root}>
      <CrewScreenHeader
        onBack={() => router.back()}
        title="크루원"
        variant="profile"
      />
      {status === "loading" ? (
        <CrewLoadingState />
      ) : status === "error" || !profile ? (
        <CrewErrorState message={errorMessage} onRetry={() => void load()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor="#449DDD"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileRow}>
            <View style={styles.profileImage}>
              {profile.profileImageUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: profile.profileImageUrl }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
            </View>
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.nickname}>
                {profile.nickname}
              </Text>
              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv.{profile.level}</Text>
                </View>
                <Text style={styles.experience}>
                  경험치 {profile.experience.toLocaleString("ko-KR")}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsCard}>
            <CrewStatRow
              items={[
                {
                  label: "플로깅",
                  unit: "회",
                  value: String(profile.ploggingCount),
                },
                {
                  label: "총 누적 걸음",
                  unit: profile.totalStepCount >= 10_000 ? "만보" : "보",
                  value: formatSteps(profile.totalStepCount),
                },
                {
                  label: "총 누적 거리",
                  unit: "km",
                  value: formatDistance(profile.totalDistanceMeters),
                },
              ]}
              variant="profile"
            />
          </View>
          {session?.userId !== userId ? (
            <View style={styles.safetyActions}>
              <Pressable
                accessibilityLabel={`${profile.nickname} 신고하기`}
                accessibilityRole="button"
                onPress={reportUser}
                style={({ pressed }) => [
                  styles.safetyButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.reportText}>신고하기</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={blocked ? "사용자 차단 해제" : "사용자 차단"}
                accessibilityRole="button"
                disabled={updatingBlock}
                onPress={toggleBlock}
                style={({ pressed }) => [
                  styles.safetyButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.blockText}>
                  {blocked ? "차단 해제" : "차단하기"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blockText: {
    color: "#FF5E5E",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  experience: {
    color: "#575E57",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    letterSpacing: -0.26,
    marginLeft: 8,
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderRadius: 17,
    height: 18,
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 5,
  },
  levelText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  nickname: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  profileCopy: {
    flex: 1,
    marginLeft: 20,
    marginTop: 27,
    minWidth: 0,
  },
  profileImage: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 90,
    justifyContent: "center",
    overflow: "hidden",
    width: 90,
  },
  profileRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  pressed: {
    opacity: 0.72,
  },
  reportText: {
    color: "#575E57",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  safetyActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  safetyButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E7E7",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    height: 46,
    justifyContent: "center",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 21.2px rgba(0,0,0,0.07)",
    elevation: 3,
    height: 89,
    justifyContent: "center",
    marginTop: 23,
    paddingHorizontal: 22,
  },
});
