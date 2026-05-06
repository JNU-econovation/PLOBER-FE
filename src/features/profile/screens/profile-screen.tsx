import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { saveSession, useAuthSession } from "@/src/features/auth";
import { ScreenRoot } from "@/src/shared/ui";
import { colors, shadows, typography } from "@/src/shared/theme";

import {
  getProfileImageUploadUrl,
  getUserProfile,
  updateMyNickname,
  updateMyProfileImage,
  type UserProfile,
} from "../api";
import {
  type CalendarMonth,
  DEFAULT_PROFILE_CALENDAR,
  monthlyActivityDays,
  profileSummaryStats,
} from "../data/profile-data";
import {
  resolveProfileImageContentType,
  uploadProfileImageToS3,
} from "../services";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const DAYS_PER_WEEK = 7;

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const [profileImageError, setProfileImageError] = useState<string | null>(
    null
  );
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

  useEffect(() => {
    if (!session?.userId) return;

    let mounted = true;
    setLoadingProfile(true);
    setProfileError(null);

    getUserProfile(session.userId)
      .then((nextProfile) => {
        if (mounted) setProfile(nextProfile);
      })
      .catch((error) => {
        if (!mounted) return;
        setProfileError(
          error instanceof Error
            ? error.message
            : "프로필 정보를 불러오지 못했습니다."
        );
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.userId]);

  const displayedProfile = profile ?? {
    nickname: session?.nickname ?? "플로버",
    level: 1,
    profileImageUrl: null,
  };

  const openNicknameEditor = () => {
    setNicknameDraft(displayedProfile.nickname);
    setNicknameError(null);
    setNicknameModalVisible(true);
  };

  const closeNicknameEditor = () => {
    if (savingNickname) return;
    setNicknameModalVisible(false);
    setNicknameError(null);
  };

  const handleSaveNickname = async () => {
    const nextNickname = nicknameDraft.trim();
    if (!nextNickname) {
      setNicknameError("닉네임을 입력해주세요.");
      return;
    }

    setSavingNickname(true);
    setNicknameError(null);

    try {
      const updatedNickname = await updateMyNickname({
        nickname: nextNickname,
      });

      setProfile((currentProfile) => ({
        level: currentProfile?.level ?? displayedProfile.level,
        nickname: updatedNickname.nickname,
        profileImageUrl:
          currentProfile?.profileImageUrl ?? displayedProfile.profileImageUrl,
      }));

      if (session) {
        await saveSession({
          ...session,
          nickname: updatedNickname.nickname,
        });
      }

      setNicknameModalVisible(false);
    } catch (error) {
      setNicknameError(
        error instanceof Error
          ? error.message
          : "닉네임을 저장하지 못했습니다."
      );
    } finally {
      setSavingNickname(false);
    }
  };

  const handleChangeProfileImage = async () => {
    if (uploadingProfileImage) return;

    setUploadingProfileImage(true);
    setProfileImageError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("사진 접근 권한이 필요합니다.");
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (pickerResult.canceled) return;

      const imageAsset = pickerResult.assets[0];
      const contentType = resolveProfileImageContentType({
        fileName: imageAsset.fileName,
        mimeType: imageAsset.mimeType,
        uri: imageAsset.uri,
      });
      const uploadTarget = await getProfileImageUploadUrl({ contentType });

      await uploadProfileImageToS3({
        contentType,
        uploadUrl: uploadTarget.uploadUrl,
        uri: imageAsset.uri,
      });

      const updatedProfileImage = await updateMyProfileImage({
        imageUrl: uploadTarget.objectUrl,
      });

      setProfile((currentProfile) => ({
        level: currentProfile?.level ?? displayedProfile.level,
        nickname: currentProfile?.nickname ?? displayedProfile.nickname,
        profileImageUrl: updatedProfileImage.profileImageUrl,
      }));
    } catch (error) {
      setProfileImageError(
        error instanceof Error
          ? error.message
          : "프로필 이미지를 저장하지 못했습니다."
      );
    } finally {
      setUploadingProfileImage(false);
    }
  };

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 118,
            paddingTop: Math.max(insets.top, 44) + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsButton onPress={openNicknameEditor} />
        {profileError ? (
          <Text selectable style={styles.errorText}>
            {profileError}
          </Text>
        ) : null}
        {profileImageError ? (
          <Text selectable style={styles.errorText}>
            {profileImageError}
          </Text>
        ) : null}
        <ProfileOverview
          loading={loadingProfile}
          onChangeProfileImage={handleChangeProfileImage}
          profile={displayedProfile}
          uploadingProfileImage={uploadingProfileImage}
        />
        <SummaryStatsCard />
        <ActivityCalendar />
      </ScrollView>
      <NicknameEditModal
        errorMessage={nicknameError}
        nickname={nicknameDraft}
        onChangeNickname={setNicknameDraft}
        onClose={closeNicknameEditor}
        onSave={handleSaveNickname}
        saving={savingNickname}
        visible={nicknameModalVisible}
      />
    </ScreenRoot>
  );
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="프로필 수정"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Feather color={colors.icon} name="settings" size={25} />
    </Pressable>
  );
}

function NicknameEditModal({
  errorMessage,
  nickname,
  onChangeNickname,
  onClose,
  onSave,
  saving,
  visible,
}: {
  errorMessage: string | null;
  nickname: string;
  onChangeNickname: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text selectable style={styles.modalTitle}>
            닉네임 수정
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
            onChangeText={onChangeNickname}
            placeholder="닉네임"
            placeholderTextColor={colors.subtle}
            returnKeyType="done"
            style={styles.nicknameInput}
            value={nickname}
          />
          {errorMessage ? (
            <Text selectable style={styles.nicknameErrorText}>
              {errorMessage}
            </Text>
          ) : null}
          <View style={styles.modalActions}>
            <Pressable
              accessibilityLabel="닉네임 수정 취소"
              accessibilityRole="button"
              disabled={saving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !saving ? styles.pressed : null,
              ]}
            >
              <Text selectable style={styles.secondaryButtonText}>
                취소
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="닉네임 저장"
              accessibilityRole="button"
              disabled={saving}
              onPress={onSave}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !saving ? styles.pressed : null,
                saving ? styles.disabled : null,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text selectable style={styles.primaryButtonText}>
                  저장
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileOverview({
  loading,
  onChangeProfileImage,
  profile,
  uploadingProfileImage,
}: {
  loading: boolean;
  onChangeProfileImage: () => void;
  profile: UserProfile;
  uploadingProfileImage: boolean;
}) {
  return (
    <View style={styles.profileOverview}>
      <ProfileAvatar
        imageUrl={profile.profileImageUrl}
        onPress={onChangeProfileImage}
        uploading={uploadingProfileImage}
      />
      <View style={styles.profileTextBlock}>
        <Text selectable style={styles.userName}>
          {profile.nickname}
        </Text>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text selectable style={styles.levelBadgeText}>
              Lv.{profile.level}
            </Text>
          </View>
          <Text selectable style={styles.levelTitle}>
            길거리 수호자
          </Text>
          {loading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
        </View>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>
    </View>
  );
}

function ProfileAvatar({
  imageUrl,
  onPress,
  uploading,
}: {
  imageUrl: string | null;
  onPress: () => void;
  uploading: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel="프로필 이미지 수정"
      accessibilityRole="button"
      disabled={uploading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.avatar,
        pressed && !uploading ? styles.pressed : null,
      ]}
    >
      {imageUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: imageUrl }}
          style={styles.avatarImage}
        />
      ) : (
        <>
          <View style={[styles.avatarLeaf, styles.avatarLeafLeft]} />
          <View style={[styles.avatarLeaf, styles.avatarLeafCenter]} />
          <View style={[styles.avatarLeaf, styles.avatarLeafRight]} />
          <Text style={styles.avatarFace}>{">  ·"}</Text>
        </>
      )}
      <View style={styles.avatarCameraBadge}>
        {uploading ? (
          <ActivityIndicator color={colors.surface} size="small" />
        ) : (
          <Feather color={colors.surface} name="camera" size={15} />
        )}
      </View>
    </Pressable>
  );
}

function SummaryStatsCard() {
  return (
    <View style={styles.summaryCard}>
      {profileSummaryStats.map((stat) => (
        <View key={stat.label} style={styles.summaryItem}>
          <Text selectable style={styles.summaryValue}>
            {stat.value}
            <Text style={styles.summaryUnit}> {stat.unit}</Text>
          </Text>
          <Text selectable style={styles.summaryLabel}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ActivityCalendar() {
  const [visibleMonth, setVisibleMonth] = useState(DEFAULT_PROFILE_CALENDAR);
  const monthKey = formatMonthKey(visibleMonth.year, visibleMonth.month);
  const activityDays = monthlyActivityDays[monthKey] ?? [];
  const calendarCells = useMemo(
    () => getCalendarCells(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );

  const handleChangeMonth = (offset: number) => {
    setVisibleMonth((current) => addMonths(current, offset));
  };

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <MonthButton
          label="이전 달"
          name="chevron-left"
          onPress={() => handleChangeMonth(-1)}
        />
        <Text selectable style={styles.calendarTitle}>
          {visibleMonth.year}년 {visibleMonth.month + 1}월
        </Text>
        <MonthButton
          label="다음 달"
          name="chevron-right"
          onPress={() => handleChangeMonth(1)}
        />
      </View>
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((day) => (
          <Text selectable key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarCells.map((cell, index) => (
          <CalendarCell
            active={cell.day ? activityDays.includes(cell.day) : false}
            day={cell.day}
            inactive={!cell.day}
            key={`${monthKey}-${index}`}
          />
        ))}
      </View>
    </View>
  );
}

function MonthButton({
  label,
  name,
  onPress,
}: {
  label: string;
  name: "chevron-left" | "chevron-right";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [
        styles.monthButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Feather color={colors.icon} name={name} size={18} />
    </Pressable>
  );
}

function CalendarCell({
  active = false,
  day,
  inactive = false,
}: {
  active?: boolean;
  day?: number;
  inactive?: boolean;
}) {
  return (
    <View style={[styles.calendarCell, inactive ? styles.calendarCellInactive : null]}>
      {day ? (
        <>
          <Text selectable style={styles.dayText}>
            {day}
          </Text>
          {active ? <View style={styles.activityDot} /> : null}
        </>
      ) : null}
    </View>
  );
}

function addMonths(
  current: CalendarMonth,
  offset: number,
): CalendarMonth {
  const date = new Date(current.year, current.month + offset, 1);

  return {
    month: date.getMonth(),
    year: date.getFullYear(),
  };
}

function getCalendarCells(year: number, month: number) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const prefixDays = (firstDay + 6) % DAYS_PER_WEEK;
  const calendarDays = Array.from({ length: totalDays }, (_, index) => ({
    day: index + 1,
  }));
  const cellCount = Math.ceil((prefixDays + totalDays) / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  const suffixDays = cellCount - prefixDays - totalDays;

  return [
    ...Array.from({ length: prefixDays }, () => ({ day: undefined })),
    ...calendarDays,
    ...Array.from({ length: suffixDays }, () => ({ day: undefined })),
  ];
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  activityDot: {
    backgroundColor: colors.primarySoft,
    borderRadius: 3,
    height: 6,
    marginTop: 13,
    width: 6,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#E9FFBE",
    borderRadius: 16,
    height: 90,
    justifyContent: "center",
    overflow: "hidden",
    width: 90,
  },
  avatarFace: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 24,
    marginTop: 12,
    transform: [{ rotate: "7deg" }],
  },
  avatarLeaf: {
    backgroundColor: "#D9FB8F",
    height: 56,
    position: "absolute",
    top: 6,
    width: 62,
  },
  avatarLeafCenter: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 38,
    left: 16,
    opacity: 0.88,
    transform: [{ rotate: "6deg" }],
  },
  avatarLeafLeft: {
    borderBottomLeftRadius: 34,
    borderTopRightRadius: 34,
    left: -7,
    opacity: 0.78,
    transform: [{ rotate: "-22deg" }],
  },
  avatarLeafRight: {
    borderBottomRightRadius: 34,
    borderTopLeftRadius: 34,
    opacity: 0.82,
    right: -8,
    transform: [{ rotate: "24deg" }],
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarCameraBadge: {
    alignItems: "center",
    backgroundColor: colors.icon,
    borderRadius: 15,
    bottom: 5,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 5,
    width: 30,
  },
  calendarCard: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    minHeight: 352,
    paddingHorizontal: 28,
    paddingBottom: 30,
    paddingTop: 12,
    width: "100%",
    ...shadows.soft,
  },
  calendarCell: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    height: 50,
    paddingTop: 10,
    width: `${100 / 7}%`,
  },
  calendarCellInactive: {
    backgroundColor: "#F9F9F9",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 13,
  },
  calendarTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0,
    minWidth: 54,
    textAlign: "center",
  },
  content: {
    gap: 23,
    paddingHorizontal: 24,
  },
  dayText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "right",
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 17,
    height: 18,
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  levelBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 14,
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 9,
  },
  levelTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
  disabled: {
    opacity: 0.64,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    width: "100%",
    ...shadows.raised,
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.34)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 16,
  },
  monthButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  nicknameErrorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  nicknameInput: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
  },
  profileOverview: {
    alignItems: "center",
    flexDirection: "row",
    gap: 21,
    marginTop: -1,
  },
  profileTextBlock: {
    flex: 1,
    paddingTop: 2,
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: 4,
    width: "78%",
  },
  progressTrack: {
    backgroundColor: colors.line,
    borderRadius: 7,
    height: 4,
    marginTop: 8,
    overflow: "hidden",
    width: "100%",
  },
  settingsButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
    ...shadows.soft,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    height: 96,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    width: "100%",
    ...shadows.soft,
  },
  summaryItem: {
    alignItems: "flex-start",
    minWidth: 76,
  },
  summaryLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0,
    marginTop: 7,
  },
  summaryUnit: {
    color: "#616161",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
    ...typography.number,
  },
  userName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 0,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekday: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0,
    textAlign: "center",
  },
});
