import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  createCrew,
  getMyCrews,
  joinCrew,
  withdrawCrewMember,
  type CrewListItem,
  type CrewResponse,
} from "../api";
import {
  CrewAvatarStack,
  CrewErrorState,
  CrewLoadingState,
  CrewPrimaryButton,
  CrewStatRow,
  formatDistance,
  formatSteps,
  getApiErrorMessage,
  getApiStatus,
} from "../components/crew-ui";
import {
  CREW_CREATE_ICON_URI,
  CREW_JOIN_ICON_URI,
} from "../components/crew-design-assets";
import { hasDisallowedUserGeneratedText } from "../services/crew-safety";

import { fontFamilies } from "@/src/shared/theme";

type AddStep = "choice" | "create" | "created" | "join" | null;

export function CrewListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [crews, setCrews] = useState<CrewListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [addStep, setAddStep] = useState<AddStep>(null);
  const [crewName, setCrewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createdCrew, setCreatedCrew] = useState<CrewResponse | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuCrewId, setMenuCrewId] = useState<number | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const [leaveCrew, setLeaveCrew] = useState<CrewListItem | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const menuCrew =
    menuCrewId === null
      ? null
      : (crews.find((crew) => crew.crewId === menuCrewId) ?? null);

  const loadCrews = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const response = await getMyCrews();
      setCrews(response.crews);
      setErrorMessage("");
      setStatus("ready");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCrews();
    }, [loadCrews])
  );

  const closeModal = useCallback(() => {
    setAddStep(null);
    setCrewName("");
    setJoinCode("");
    setCreatedCrew(null);
    setFormError("");
    setSubmitting(false);
  }, []);

  const submitCreate = useCallback(async () => {
    const name = crewName.trim();
    if (!name || name.length > 20) return;
    if (hasDisallowedUserGeneratedText(name)) {
      setFormError("다른 사용자가 불편할 수 있는 표현은 사용할 수 없습니다.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const response = await createCrew({ name });
      setCreatedCrew(response);
      setAddStep("created");
      await loadCrews(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error, "크루를 생성하지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  }, [crewName, loadCrews]);

  const submitJoin = useCallback(async () => {
    if (!/^\d{6}$/.test(joinCode)) return;
    setSubmitting(true);
    setFormError("");
    try {
      const response = await joinCrew({ joinCode });
      closeModal();
      await loadCrews(true);
      router.push(`/crews/${response.crewId}`);
    } catch (error) {
      if (getApiStatus(error) === 409) {
        setFormError("이미 가입한 크루입니다. 내 크루 목록에서 확인해 주세요.");
        await loadCrews(true);
      } else {
        setFormError(getApiErrorMessage(error, "초대넘버를 다시 확인해 주세요."));
      }
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, joinCode, loadCrews, router]);

  const submitLeave = useCallback(async () => {
    if (!leaveCrew) return;
    const departedName = leaveCrew.name;
    setLeaving(true);
    try {
      await withdrawCrewMember({ crewId: leaveCrew.crewId });
      setLeaveCrew(null);
      setMenuCrewId(null);
      setToastMessage(`${departedName}을 탈퇴했습니다.`);
      setTimeout(() => setToastMessage(""), 2_200);
      await loadCrews(true);
    } catch (error) {
      setLeaveCrew(null);
      Alert.alert(
        "크루를 탈퇴하지 못했어요",
        getApiErrorMessage(
          error,
          "진행 중인 같이줍기 기록을 먼저 완료한 뒤 다시 시도해 주세요."
        )
      );
      await loadCrews(true);
    } finally {
      setLeaving(false);
    }
  }, [leaveCrew, loadCrews]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.listHeader,
          { height: insets.top + 56, paddingTop: insets.top },
        ]}
      >
        <Text style={styles.listHeaderTitle}>크루</Text>
      </View>
      {status === "loading" ? (
        <CrewLoadingState />
      ) : status === "error" ? (
        <CrewErrorState message={errorMessage} onRetry={() => void loadCrews()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          onScrollBeginDrag={() => setMenuCrewId(null)}
          refreshControl={
            <RefreshControl
              onRefresh={() => void loadCrews(true)}
              refreshing={refreshing}
              tintColor="#449DDD"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>내 크루</Text>
            <Text style={styles.sectionCount}>{crews.length}</Text>
          </View>
          <View style={styles.list}>
            {crews.map((crew) => (
              <CrewCard
                crew={crew}
                key={crew.crewId}
                menuVisible={menuCrewId === crew.crewId}
                onOpenMenu={(pageY) => {
                  setMenuTop(
                    Math.min(
                      windowHeight - insets.bottom - 60,
                      Math.max(insets.top + 8, pageY + 8)
                    )
                  );
                  setMenuCrewId((current) =>
                    current === crew.crewId ? null : crew.crewId
                  );
                }}
                onPress={() => router.push(`/crews/${crew.crewId}`)}
              />
            ))}
            <Pressable
              accessibilityLabel="크루 추가하기"
              accessibilityRole="button"
              onPress={() => setAddStep("choice")}
              style={({ pressed }) => [
                styles.addCard,
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-add.svg")}
                style={styles.addIconCircle}
              />
              <Text style={styles.addText}>크루 추가하기</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
      <Modal
        animationType="fade"
        navigationBarTranslucent
        onRequestClose={() => setMenuCrewId(null)}
        statusBarTranslucent
        transparent
        visible={menuCrew !== null}
      >
        <Pressable
          accessible={false}
          onPress={() => setMenuCrewId(null)}
          style={styles.menuDismiss}
        >
          <View style={[styles.cardOptionMenu, { top: menuTop }]}>
            <Pressable
              accessibilityLabel={
                menuCrew?.myRole === "LEADER"
                  ? "크루원 관리하기"
                  : "크루 탈퇴하기"
              }
              accessibilityRole="button"
              onPress={(event) => {
                event.stopPropagation();
                if (!menuCrew) return;
                setMenuCrewId(null);
                if (menuCrew.myRole === "LEADER") {
                  router.push(`/crews/${menuCrew.crewId}/members`);
                } else {
                  setLeaveCrew(menuCrew);
                }
              }}
              style={({ pressed }) => [
                styles.cardOptionButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.cardOptionText,
                  menuCrew?.myRole !== "LEADER"
                    ? styles.cardOptionDangerText
                    : null,
                ]}
              >
                {menuCrew?.myRole === "LEADER"
                  ? "크루원 관리하기"
                  : "크루 탈퇴하기"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <CrewAddModal
        code={joinCode}
        createdCrew={createdCrew}
        errorMessage={formError}
        name={crewName}
        onChangeCode={(value) => {
          setFormError("");
          setJoinCode(value.replace(/\D/g, "").slice(0, 6));
        }}
        onChangeName={(value) => {
          setFormError("");
          setCrewName(value.slice(0, 20));
        }}
        onClose={closeModal}
        onConfirmCreated={() => {
          const crewId = createdCrew?.crewId;
          closeModal();
          if (crewId) router.push(`/crews/${crewId}`);
        }}
        onSelectCreate={() => {
          setFormError("");
          setAddStep("create");
        }}
        onSelectJoin={() => {
          setFormError("");
          setAddStep("join");
        }}
        onSubmitCreate={() => void submitCreate()}
        onSubmitJoin={() => void submitJoin()}
        step={addStep}
        submitting={submitting}
      />
      <LeaveCrewModal
        crew={leaveCrew}
        leaving={leaving}
        onClose={() => setLeaveCrew(null)}
        onConfirm={() => void submitLeave()}
      />
      {toastMessage ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CrewCard({
  crew,
  menuVisible,
  onOpenMenu,
  onPress,
}: {
  crew: CrewListItem;
  menuVisible: boolean;
  onOpenMenu: (pageY: number) => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitleWrap}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {crew.name}
          </Text>
          <Text numberOfLines={1} style={styles.leaderText}>
            크루장 {crew.leaderNickname}
          </Text>
        </View>
        <View style={styles.cardPeople}>
          <CrewAvatarStack
            memberCount={crew.memberCount}
            urls={crew.memberProfileImageUrls}
          />
          <Pressable
            accessibilityLabel={`${crew.name} 더보기`}
            accessibilityRole="button"
            accessibilityState={{ expanded: menuVisible }}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onOpenMenu(event.nativeEvent.pageY);
            }}
            style={styles.moreButton}
          >
            <View style={styles.moreIcon}>
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
              <View style={styles.moreDot} />
            </View>
          </Pressable>
        </View>
      </View>
      <View style={styles.divider} />
      <CrewStatRow
        items={[
          { label: "플로깅", unit: "회", value: String(crew.completedPloggingCount) },
          { label: "누적 거리", unit: "km", value: formatDistance(crew.totalDistanceMeters) },
          {
            label: "누적 걸음",
            unit: crew.totalStepCount >= 10_000 ? "만보" : "보",
            value: formatSteps(crew.totalStepCount),
          },
          {
            label: "누적 시간",
            unit: "시간",
            value: (crew.totalPloggingSeconds / 3_600)
              .toFixed(1)
              .replace(/\.0$/, ""),
          },
        ]}
      />
    </Pressable>
  );
}

function LeaveCrewModal({
  crew,
  leaving,
  onClose,
  onConfirm,
}: {
  crew: CrewListItem | null;
  leaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={crew !== null}
    >
      <View style={styles.confirmRoot}>
        <Pressable
          accessibilityLabel="탈퇴 취소"
          disabled={leaving}
          onPress={onClose}
          style={styles.confirmDim}
        />
        <View style={styles.confirmCard}>
          <Pressable
            accessibilityLabel="닫기"
            disabled={leaving}
            hitSlop={8}
            onPress={onClose}
            style={styles.confirmClose}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/icons/crew-close.svg")}
              style={styles.confirmCloseIcon}
            />
          </Pressable>
          <Text numberOfLines={1} style={styles.confirmTitle}>
            <Text style={styles.confirmName}>{crew?.name}</Text>
            <Text>을 </Text>
            <Text style={styles.confirmAction}>탈퇴</Text>
            <Text>하시겠습니까?</Text>
          </Text>
          <View style={styles.confirmButtons}>
            <CrewPrimaryButton
              loading={leaving}
              onPress={onConfirm}
              style={styles.confirmButton}
              textStyle={styles.confirmPrimaryText}
              title="탈퇴"
            />
            <CrewPrimaryButton
              disabled={leaving}
              onPress={onClose}
              style={styles.confirmButton}
              textStyle={styles.confirmNeutralText}
              title="아니오"
              tone="neutral"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CrewAddModal({
  code,
  createdCrew,
  errorMessage,
  name,
  onChangeCode,
  onChangeName,
  onClose,
  onConfirmCreated,
  onSelectCreate,
  onSelectJoin,
  onSubmitCreate,
  onSubmitJoin,
  step,
  submitting,
}: {
  code: string;
  createdCrew: CrewResponse | null;
  errorMessage: string;
  name: string;
  onChangeCode: (value: string) => void;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onConfirmCreated: () => void;
  onSelectCreate: () => void;
  onSelectJoin: () => void;
  onSubmitCreate: () => void;
  onSubmitJoin: () => void;
  step: AddStep;
  submitting: boolean;
}) {
  const codeInputRef = useRef<TextInput>(null);
  const [codeFocused, setCodeFocused] = useState(false);

  if (!step) return null;

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable
          accessibilityLabel="닫기"
          onPress={onClose}
          style={[styles.dim, step === "choice" ? styles.choiceDim : null]}
        />
        {step === "choice" ? (
          <View style={styles.choiceArea}>
            <View style={styles.choiceCard}>
              <Text style={styles.choicePrompt}>크루를 추가하는 방법을 선택하세요</Text>
              <ChoiceRow
                icon="users"
                label="크루 생성하기"
                onPress={onSelectCreate}
                position="first"
                subtitle="새로운 크루를 만들고 친구를 초대해요"
              />
              <View style={styles.choiceDivider} />
              <ChoiceRow
                icon="link"
                label="크루 들어가기"
                onPress={onSelectJoin}
                position="second"
                subtitle="초대 코드나 링크로 참여해요"
              />
            </View>
            <Pressable onPress={onClose} style={styles.choiceCancel}>
              <Text style={styles.choiceCancelText}>취소</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.sheet,
              step === "join" ? styles.joinSheet : null,
              step === "create" ? styles.createSheet : null,
              step === "created" ? styles.createdSheet : null,
            ]}
          >
            <View style={styles.grabber} />
            <View
              style={[
                styles.sheetContent,
                step === "created" ? styles.createdSheetContent : null,
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {step === "join" ? "크루 들어가기" : "크루 생성하기"}
                </Text>
                <Pressable hitSlop={8} onPress={onClose} style={styles.sheetClose}>
                  <Image
                    contentFit="contain"
                    source={require("@/assets/icons/crew-close.svg")}
                    style={styles.sheetCloseIcon}
                  />
                </Pressable>
              </View>

              {step === "join" ? (
                <View style={styles.codeInputGroup}>
                  <Text style={styles.sheetHint}>
                    전달받은 초대 코드 6자리를 입력하세요
                  </Text>
                  <Pressable
                    onPress={() => codeInputRef.current?.focus()}
                    style={styles.codeRow}
                  >
                    {Array.from({ length: 6 }, (_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.codeCell,
                          codeFocused && index === Math.min(code.length, 5)
                            ? styles.codeCellFocused
                            : null,
                        ]}
                      >
                        <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
                      </View>
                    ))}
                    <TextInput
                      accessibilityLabel="6자리 초대넘버"
                      keyboardType="number-pad"
                      maxLength={6}
                      onBlur={() => setCodeFocused(false)}
                      onChangeText={onChangeCode}
                      onFocus={() => setCodeFocused(true)}
                      ref={codeInputRef}
                      style={styles.hiddenCodeInput}
                      value={code}
                    />
                  </Pressable>
                  {errorMessage ? (
                    <Text style={styles.formError}>{errorMessage}</Text>
                  ) : null}
                </View>
              ) : step === "created" && createdCrew ? (
                <>
                  <View style={styles.createdNameGroup}>
                    <Text style={styles.inputLabel}>크루 이름</Text>
                    <Text numberOfLines={1} style={styles.createdName}>
                      {createdCrew.name}
                    </Text>
                  </View>
                  <View style={styles.createdCodeGroup}>
                    <Text style={styles.inputLabel}>초대넘버</Text>
                    <View style={styles.codeRow}>
                      {createdCrew.joinCode.split("").map((digit, index) => (
                        <View key={`${digit}-${index}`} style={styles.codeCell}>
                          <Text style={styles.codeDigit}>{digit}</Text>
                        </View>
                      ))}
                    </View>
                    <Pressable
                      accessibilityLabel="초대넘버 복사"
                      onPress={() =>
                        void Clipboard.setStringAsync(createdCrew.joinCode)
                      }
                      style={styles.copyCodeButton}
                    >
                      <Feather color="#2A88CD" name="link-2" size={20} />
                      <Text style={styles.copyCodeText}>복사하기</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.nameInputGroup}>
                  <Text style={styles.inputLabel}>크루 이름</Text>
                  <View style={styles.nameInputWrap}>
                    <TextInput
                      maxLength={20}
                      onChangeText={onChangeName}
                      placeholder="크루 이름을 입력하세요"
                      placeholderTextColor="#A7A7A7"
                      style={styles.nameInput}
                      value={name}
                    />
                    <Text style={styles.inputCount}>{name.length} / 20</Text>
                  </View>
                  {errorMessage ? (
                    <Text style={styles.formError}>{errorMessage}</Text>
                  ) : null}
                </View>
              )}

              {step === "join" ? (
                <CrewPrimaryButton
                  disabled={!/^\d{6}$/.test(code)}
                  loading={submitting}
                  onPress={onSubmitJoin}
                  title="가입하기"
                />
              ) : step === "created" ? (
                <CrewPrimaryButton onPress={onConfirmCreated} title="확인" />
              ) : (
                <CrewPrimaryButton
                  disabled={!name.trim() || name.trim().length > 20}
                  loading={submitting}
                  onPress={onSubmitCreate}
                  title="생성하기"
                />
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChoiceRow({
  icon,
  label,
  onPress,
  position,
  subtitle,
}: {
  icon: "link" | "users";
  label: string;
  onPress: () => void;
  position: "first" | "second";
  subtitle: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceRow,
        position === "first" ? styles.choiceRowFirst : styles.choiceRowSecond,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.choiceIcon}>
        <Image
          contentFit="contain"
          source={{
            uri: icon === "users" ? CREW_CREATE_ICON_URI : CREW_JOIN_ICON_URI,
          }}
          style={
            icon === "users" ? styles.choiceUsersIcon : styles.choiceLinkIcon
          }
        />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceText}>{label}</Text>
        <Text style={styles.choiceSubtitle}>{subtitle}</Text>
      </View>
      <Image
        contentFit="contain"
        source={require("@/assets/icons/crew-back.svg")}
        style={styles.choiceArrow}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addCard: {
    alignItems: "center",
    borderColor: "#D7D7DB",
    borderRadius: 22,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 112,
    justifyContent: "center",
  },
  addIconCircle: {
    height: 40,
    width: 40,
  },
  addText: {
    color: "#727272",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    letterSpacing: -0.26,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 10.6px rgba(0,0,0,0.07)",
    elevation: 3,
    height: 145,
    paddingHorizontal: 16,
    paddingTop: 16,
    position: "relative",
  },
  cardOptionButton: {
    alignItems: "flex-start",
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  cardOptionDangerText: {
    color: "#D92D20",
  },
  cardOptionMenu: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6E6E6",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: "0 10px 28px rgba(18,18,18,0.16)",
    elevation: 10,
    overflow: "hidden",
    position: "absolute",
    right: 20,
    width: 144,
  },
  cardOptionText: {
    color: "#121212",
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  cardPeople: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cardTitle: {
    color: "#0A0A0A",
    flexShrink: 1,
    fontFamily: fontFamilies.gothicA1ExtraBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    height: 59,
  },
  choiceArea: {
    bottom: 88,
    gap: 8,
    left: 14,
    position: "absolute",
    right: 14,
  },
  choiceArrow: {
    height: 17.4,
    transform: [{ rotate: "180deg" }],
    width: 10.1,
  },
  choiceCancel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 51,
    justifyContent: "center",
  },
  choiceCancelText: {
    color: "#5A5A5E",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  choiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    boxShadow: "0 14px 40px rgba(0,0,0,0.2)",
    elevation: 12,
    height: 194,
    overflow: "hidden",
    position: "relative",
  },
  choiceCopy: {
    flex: 1,
    marginLeft: 18,
  },
  choiceDim: {
    backgroundColor: "rgba(18,18,18,0.35)",
  },
  choiceDivider: {
    backgroundColor: "#F1F1F1",
    height: 1,
    left: 16,
    position: "absolute",
    right: 16,
    top: 114,
  },
  choiceIcon: {
    alignItems: "center",
    backgroundColor: "#F2F7FD",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  choiceLinkIcon: {
    height: 26,
    width: 24,
  },
  choicePrompt: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.regular,
    fontSize: 12.5,
    left: 16,
    letterSpacing: -0.25,
    position: "absolute",
    top: 16,
  },
  choiceRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
    left: 16,
    position: "absolute",
    right: 16,
  },
  choiceRowFirst: {
    top: 55,
  },
  choiceRowSecond: {
    top: 132,
  },
  choiceSubtitle: {
    color: "#727272",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    letterSpacing: -0.26,
    marginTop: 6,
  },
  choiceText: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  choiceUsersIcon: {
    height: 24,
    width: 24,
  },
  codeCell: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    flex: 1,
    height: 60,
    justifyContent: "center",
  },
  codeCellFocused: {
    borderColor: "#2A88CD",
    borderWidth: 2,
  },
  codeDigit: {
    color: "#121212",
    fontFamily: fontFamilies.extraBold,
    fontSize: 23,
    letterSpacing: -0.46,
  },
  codeInputGroup: {
    gap: 4,
    position: "relative",
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
    position: "relative",
    width: "100%",
  },
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
  confirmNeutralText: {
    fontFamily: fontFamilies.semiBold,
  },
  confirmPrimaryText: {
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
    left: 12,
    letterSpacing: -0.36,
    position: "absolute",
    right: 12,
    textAlign: "center",
    top: 59,
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: 24,
  },
  copyCodeButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    marginTop: 4,
  },
  copyCodeText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
    marginLeft: 2,
    textDecorationLine: "underline",
  },
  createSheet: {
    height: 300,
  },
  createdCodeGroup: {
    gap: 4,
  },
  createdName: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  createdNameGroup: {
    gap: 4,
  },
  createdSheet: {
    height: 378,
  },
  createdSheetContent: {
    marginTop: 3,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,17,24,0.4)",
  },
  divider: {
    backgroundColor: "#FAFAFA",
    height: 1,
    marginBottom: 13,
    marginHorizontal: -16,
  },
  formError: {
    color: "#FF5E5E",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    left: 0,
    lineHeight: 18,
    position: "absolute",
    top: "100%",
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: "#E4E4E7",
    borderRadius: 3,
    height: 5,
    width: 40.5,
  },
  hiddenCodeInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
  },
  inputCount: {
    color: "#B4B4BA",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginRight: 15,
  },
  inputLabel: {
    color: "#727272",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  joinSheet: {
    height: 308,
  },
  leaderText: {
    color: "#727272",
    fontFamily: fontFamilies.gothicA1SemiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    marginTop: 5,
  },
  list: {
    gap: 16,
  },
  listHeader: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  listHeaderTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.semiBold,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  menuDismiss: {
    ...StyleSheet.absoluteFillObject,
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
  nameInput: {
    color: "#0A0A0A",
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    height: 50,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  nameInputGroup: {
    gap: 4,
    position: "relative",
  },
  nameInputWrap: {
    alignItems: "center",
    borderColor: "#2A88CD",
    borderRadius: 14,
    borderWidth: 1.6,
    flexDirection: "row",
    height: 52,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  sectionCount: {
    color: "#2A88CD",
    fontFamily: fontFamilies.extraBold,
    fontSize: 14,
    letterSpacing: -0.28,
    marginLeft: 4,
  },
  sectionLabel: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  sectionLabelRow: {
    flexDirection: "row",
    height: 15,
    marginBottom: 16,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: "0 -8px 20px rgba(0,0,0,0.18)",
    elevation: 14,
    paddingBottom: 64,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetClose: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sheetCloseIcon: {
    height: 14,
    width: 14,
  },
  sheetContent: {
    gap: 28,
    marginTop: 37,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 34,
    justifyContent: "space-between",
  },
  sheetHint: {
    color: "#727272",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  sheetTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 19,
    letterSpacing: -0.38,
  },
  toast: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 32,
    bottom: 132,
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "absolute",
  },
  toastText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
});
