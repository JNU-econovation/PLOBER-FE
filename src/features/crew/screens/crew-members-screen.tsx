import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getCrewDetail,
  getCrewMembers,
  removeCrewMember,
  type CrewDetailResponse,
  type CrewMemberListItem,
} from "../api";
import {
  CrewAvatar,
  CrewErrorState,
  CrewLoadingState,
  CrewPrimaryButton,
  CrewScreenHeader,
  HeaderIconButton,
  getApiErrorMessage,
} from "../components/crew-ui";
import { getBlockedCrewUserIds } from "../services/crew-safety";
import { fontFamilies } from "@/src/shared/theme";

export function CrewMembersScreen({ crewId }: { crewId: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [detail, setDetail] = useState<CrewDetailResponse | null>(null);
  const [members, setMembers] = useState<CrewMemberListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [menuMember, setMenuMember] = useState<CrewMemberListItem | null>(null);
  const [menuTop, setMenuTop] = useState(228);
  const [confirmMember, setConfirmMember] =
    useState<CrewMemberListItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<number[]>([]);

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const [nextDetail, response, nextBlockedUserIds] = await Promise.all([
        getCrewDetail({ crewId }),
        getCrewMembers({ crewId }),
        getBlockedCrewUserIds(),
      ]);
      setDetail(nextDetail);
      setMembers(response.members);
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
      void load();
    }, [load])
  );

  const handleRemove = useCallback(async () => {
    if (!confirmMember) return;
    setRemoving(true);
    try {
      await removeCrewMember({
        crewId,
        targetUserId: confirmMember.userId,
      });
      setConfirmMember(null);
      await load(true);
    } catch (error) {
      setConfirmMember(null);
      Alert.alert(
        "강퇴하지 못했어요",
        getApiErrorMessage(
          error,
          "진행 중인 같이줍기 기록을 먼저 완료해야 할 수 있습니다."
        )
      );
      await load(true);
    } finally {
      setRemoving(false);
    }
  }, [confirmMember, crewId, load]);

  return (
    <View style={styles.root}>
      <CrewScreenHeader
        onBack={() => router.back()}
        right={
          detail ? (
            <HeaderIconButton
              icon="share"
              label="초대넘버 공유"
              onPress={() =>
                void Share.share({
                  message: `${detail.name} 크루 초대넘버: ${detail.joinCode}`,
                })
              }
            />
          ) : null
        }
        title="크루원"
        variant="gradient"
      />

      {status === "loading" ? (
        <CrewLoadingState />
      ) : status === "error" ? (
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
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>전체</Text>
            <Text style={styles.countValue}>{members.length}명</Text>
          </View>
          <View style={styles.memberCard}>
            {members.map((member, index) => {
              const blocked = blockedUserIds.includes(member.userId);
              const displayedNickname = blocked
                ? "차단한 사용자"
                : member.nickname;
              return (
                <View
                key={member.userId}
                style={[
                  styles.memberRow,
                  index < members.length - 1 ? styles.memberRowBorder : null,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(`/crews/${crewId}/members/${member.userId}`)
                  }
                  style={({ pressed }) => [
                    styles.memberMain,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <CrewAvatar
                    index={index}
                    nickname={displayedNickname}
                    size={44}
                    uri={blocked ? null : member.profileImageUrl}
                  />
                  <View style={styles.memberNameRow}>
                    <Text numberOfLines={1} style={styles.memberName}>
                      {displayedNickname}
                    </Text>
                    {member.role === "LEADER" ? (
                      <View style={styles.leaderBadge}>
                        <Text style={styles.leaderBadgeText}>크루장</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
                {detail?.myRole === "LEADER" && member.role !== "LEADER" ? (
                  <Pressable
                    accessibilityLabel={`${displayedNickname} 관리`}
                    accessibilityRole="button"
                    accessibilityState={{
                      expanded: menuMember?.userId === member.userId,
                    }}
                    hitSlop={8}
                    onPress={(event) => {
                      setMenuTop(
                        Math.min(
                          windowHeight - insets.bottom - 60,
                          Math.max(insets.top + 8, event.nativeEvent.pageY + 8)
                        )
                      );
                      setMenuMember(member);
                    }}
                    style={styles.moreButton}
                  >
                    <View style={styles.moreIcon}>
                      <View style={styles.moreDot} />
                      <View style={styles.moreDot} />
                      <View style={styles.moreDot} />
                    </View>
                  </Pressable>
                ) : (
                  <View style={styles.morePlaceholder} />
                )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        navigationBarTranslucent
        onRequestClose={() => setMenuMember(null)}
        statusBarTranslucent
        transparent
        visible={menuMember !== null}
      >
        <Pressable
          accessible={false}
          onPress={() => setMenuMember(null)}
          style={styles.menuDim}
        >
          <View style={[styles.menuCard, { top: menuTop }]}>
            <Pressable
              accessibilityLabel={`${menuMember?.nickname ?? "크루원"} 강퇴하기`}
              accessibilityRole="button"
              onPress={(event) => {
                event.stopPropagation();
                setConfirmMember(menuMember);
                setMenuMember(null);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.menuText}>강퇴하기</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        navigationBarTranslucent
        statusBarTranslucent
        transparent
        visible={confirmMember !== null}
      >
        <View style={styles.confirmRoot}>
          <Pressable
            onPress={() => !removing && setConfirmMember(null)}
            style={styles.confirmDim}
          />
          <View style={styles.confirmCard}>
            <Pressable
              hitSlop={8}
              onPress={() => setConfirmMember(null)}
              style={styles.confirmClose}
            >
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-close.svg")}
                style={styles.confirmCloseIcon}
              />
            </Pressable>
            <Text numberOfLines={1} style={styles.confirmTitle}>
              <Text style={styles.confirmName}>{confirmMember?.nickname}</Text>
              <Text>님을 </Text>
              <Text style={styles.confirmAction}>강퇴</Text>
              <Text>하시겠습니까?</Text>
            </Text>
            <View style={styles.confirmButtons}>
              <CrewPrimaryButton
                loading={removing}
                onPress={() => void handleRemove()}
                style={styles.confirmButton}
                title="강퇴"
                tone="danger"
              />
              <CrewPrimaryButton
                disabled={removing}
                onPress={() => setConfirmMember(null)}
                style={styles.confirmButton}
                title="아니오"
                tone="neutral"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmAction: {
    textDecorationLine: "underline",
  },
  confirmButton: {
    flex: 1,
    height: 48,
  },
  confirmButtons: {
    bottom: 16,
    flexDirection: "row",
    gap: 12,
    left: 20,
    position: "absolute",
    right: 20,
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 14px 40px rgba(0,0,0,0.2)",
    elevation: 12,
    height: 184,
    maxWidth: 340,
    width: "100%",
  },
  confirmClose: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 12,
    width: 44,
  },
  confirmCloseIcon: {
    height: 14,
    width: 14,
  },
  confirmDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,18,18,0.35)",
  },
  confirmName: {
    fontFamily: fontFamilies.semiBold,
  },
  confirmRoot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  confirmTitle: {
    color: "#000000",
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    left: 10,
    letterSpacing: -0.36,
    position: "absolute",
    right: 10,
    textAlign: "center",
    top: 59,
  },
  content: {
    paddingBottom: 126,
    paddingHorizontal: 19,
  },
  countLabel: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  countRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  countValue: {
    color: "#2A88CD",
    fontFamily: fontFamilies.extraBold,
    fontSize: 14,
    letterSpacing: -0.28,
    marginLeft: 4,
  },
  leaderBadge: {
    alignItems: "center",
    backgroundColor: "#F2F7FD",
    borderRadius: 6,
    height: 16,
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  leaderBadgeText: {
    color: "#2A88CD",
    fontFamily: fontFamilies.extraBold,
    fontSize: 9.5,
  },
  memberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    boxShadow: "0 0 21.2px rgba(0,0,0,0.07)",
    elevation: 3,
    overflow: "hidden",
  },
  memberMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  memberName: {
    color: "#0A0A0A",
    flexShrink: 1,
    fontFamily: fontFamilies.gothicA1SemiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  memberNameRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    marginLeft: 12,
  },
  memberRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 68,
    paddingHorizontal: 16,
  },
  memberRowBorder: {
    borderBottomColor: "#D3D3D3",
    borderBottomWidth: 1,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6E6E6",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: "0 10px 28px rgba(18,18,18,0.16)",
    elevation: 10,
    overflow: "hidden",
    position: "absolute",
    right: 20,
    width: 136,
  },
  menuDim: {
    ...StyleSheet.absoluteFillObject,
  },
  menuItem: {
    alignItems: "flex-start",
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  menuText: {
    color: "#D92D20",
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  moreButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  moreIcon: {
    alignItems: "center",
    gap: 3,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  moreDot: {
    backgroundColor: "#535353",
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  morePlaceholder: {
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
});
