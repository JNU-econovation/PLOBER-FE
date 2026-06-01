import {
  logout as logoutFromServer,
  saveSession,
  useAuthSession,
} from "@/src/features/auth";
import { colors, shadows, typography } from "@/src/shared/theme";
import { ScreenRoot } from "@/src/shared/ui";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type * as ExpoImagePicker from "expo-image-picker";
import { requireOptionalNativeModule } from "expo-modules-core";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteMyAccount,
  getMyPloggingStats,
  getProfileImageUploadUrl,
  getUserProfile,
  updateMyNickname,
  updateMyProfileImage,
  type MyPloggingStats,
  type UserProfile,
} from "../api";
import { profileSummaryStats } from "../data/profile-data";
import {
  resolveProfileImageContentType,
  uploadProfileImageToS3,
} from "../services";

const EXPERIENCE_PROGRESS_UNIT = 720;
const PHOTO_LIBRARY_PERMISSION_ERROR = "사진 접근 권한이 필요합니다.";

type AccountAction = "logout" | "delete" | null;

declare const require: <T = unknown>(moduleName: string) => T;

let imagePickerModule: typeof ExpoImagePicker | null | undefined;

function getImagePickerModule() {
  if (imagePickerModule !== undefined) return imagePickerModule;

  try {
    if (Platform.OS !== "web") {
      const nativeImagePicker =
        requireOptionalNativeModule("ExponentImagePicker");
      if (!nativeImagePicker) {
        imagePickerModule = null;
        return imagePickerModule;
      }
    }

    imagePickerModule =
      require<typeof ExpoImagePicker>("expo-image-picker");
  } catch {
    imagePickerModule = null;
  }

  return imagePickerModule;
}

async function ensurePhotoLibraryPermission(
  imagePicker: typeof ExpoImagePicker
): Promise<boolean> {
  if (Platform.OS === "web") return true;
  // Android 13+ Photo Picker는 READ_MEDIA_IMAGES 없이도 동작하며,
  // 매니페스트에서 해당 권한을 차단했으므로 게이트를 건너뛰고 picker로 위임한다.
  if (Platform.OS === "android") return true;

  const currentPermission =
    await imagePicker.getMediaLibraryPermissionsAsync();
  if (
    currentPermission.granted ||
    currentPermission.accessPrivileges === "limited"
  ) {
    return true;
  }

  if (!currentPermission.canAskAgain) {
    showPhotoLibrarySettingsAlert();
    return false;
  }

  const requestedPermission =
    await imagePicker.requestMediaLibraryPermissionsAsync();
  if (
    requestedPermission.granted ||
    requestedPermission.accessPrivileges === "limited"
  ) {
    return true;
  }

  if (!requestedPermission.canAskAgain) {
    showPhotoLibrarySettingsAlert();
  }

  return false;
}

function showPhotoLibrarySettingsAlert() {
  Alert.alert(
    "사진 접근 권한이 필요합니다",
    "프로필 이미지를 변경하려면 설정에서 사진 접근 권한을 허용해주세요.",
    [
      { style: "cancel", text: "취소" },
      {
        text: "설정 열기",
        onPress: () => {
          Linking.openSettings().catch(() => {
            // 설정 앱 진입 실패는 무시하고 화면 오류 메시지만 유지한다.
          });
        },
      },
    ]
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const contentTopPadding =
    Platform.OS === "ios" ? Math.max(insets.top, 12) + 8 : 8;
  const { clearAuthSession, session, status } = useAuthSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ploggingStats, setPloggingStats] =
    useState<MyPloggingStats | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [ploggingStatsError, setPloggingStatsError] = useState<string | null>(
    null
  );
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const [profileImageError, setProfileImageError] = useState<string | null>(
    null
  );
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [accountAction, setAccountAction] = useState<AccountAction>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setProfile(null);
      setPloggingStats(null);
      return;
    }
    if (!session?.userId) return;

    let mounted = true;
    setLoadingProfile(true);
    setProfileError(null);
    setPloggingStatsError(null);

    Promise.allSettled([
      getUserProfile(session.userId),
      getMyPloggingStats({ userId: session.userId }),
    ])
      .then(([profileResult, ploggingStatsResult]) => {
        if (!mounted) return;

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        } else {
          setProfileError(
            profileResult.reason instanceof Error
              ? profileResult.reason.message
              : "프로필 정보를 불러오지 못했습니다."
          );
        }

        if (ploggingStatsResult.status === "fulfilled") {
          setPloggingStats(ploggingStatsResult.value);
        } else {
          setPloggingStatsError(
            ploggingStatsResult.reason instanceof Error
              ? ploggingStatsResult.reason.message
              : "누적 통계를 불러오지 못했습니다."
          );
        }
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.userId, status]);

  const displayedProfile = {
    nickname: profile?.nickname ?? session?.nickname ?? "플로버",
    level: profile?.level ?? 1,
    title: profile?.title ?? "",
    profileImageUrl: profile?.profileImageUrl ?? null,
    experience: profile?.experience ?? 0,
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
    if (!session?.userId) {
      setNicknameError("로그인이 필요합니다.");
      return;
    }

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
        userId: session.userId,
      });

      setProfile((currentProfile) => ({
        experience: currentProfile?.experience ?? displayedProfile.experience,
        level: currentProfile?.level ?? displayedProfile.level,
        nickname: updatedNickname.nickname,
        title: currentProfile?.title ?? displayedProfile.title,
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
    if (!session?.userId) {
      setProfileImageError("로그인이 필요합니다.");
      return;
    }

    setUploadingProfileImage(true);
    setProfileImageError(null);

    try {
      const imagePicker = getImagePickerModule();
      if (!imagePicker) {
        throw new Error(
          "프로필 이미지 선택 모듈이 없습니다. 개발 빌드를 다시 빌드해주세요."
        );
      }

      const hasPhotoLibraryPermission =
        await ensurePhotoLibraryPermission(imagePicker);
      if (!hasPhotoLibraryPermission) {
        throw new Error(PHOTO_LIBRARY_PERMISSION_ERROR);
      }

      const pickerResult = await imagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (pickerResult.canceled) return;

      const imageAsset = pickerResult.assets[0];
      if (!imageAsset?.uri) {
        throw new Error("선택한 이미지 정보를 가져오지 못했습니다.");
      }

      const contentType = resolveProfileImageContentType({
        fileName: imageAsset.fileName,
        mimeType: imageAsset.mimeType,
        uri: imageAsset.uri,
      });

      if (__DEV__) {
        console.log("[profile-image] selected", {
          contentType,
          fileName: imageAsset.fileName,
          mimeType: imageAsset.mimeType,
          uri: imageAsset.uri,
        });
      }

      const uploadTarget = await getProfileImageUploadUrl({
        contentType,
        userId: session.userId,
      });

      if (__DEV__) {
        console.log("[profile-image] upload url issued", {
          hasObjectUrl: Boolean(uploadTarget.objectUrl),
          hasUploadUrl: Boolean(uploadTarget.uploadUrl),
        });
      }

      await uploadProfileImageToS3({
        contentType,
        uploadUrl: uploadTarget.uploadUrl,
        uri: imageAsset.uri,
      });

      const updatedProfileImage = await updateMyProfileImage({
        imageUrl: uploadTarget.objectUrl,
        userId: session.userId,
      });
      const nextProfileImageUrl =
        updatedProfileImage.profileImageUrl ?? uploadTarget.objectUrl;

      setProfile((currentProfile) => ({
        experience: currentProfile?.experience ?? displayedProfile.experience,
        level: currentProfile?.level ?? displayedProfile.level,
        nickname: currentProfile?.nickname ?? displayedProfile.nickname,
        title: currentProfile?.title ?? displayedProfile.title,
        profileImageUrl: nextProfileImageUrl,
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

  const handleLogout = async () => {
    if (accountAction) return;

    setAccountAction("logout");
    setAccountActionError(null);

    try {
      if (session?.userId) {
        try {
          await logoutFromServer({ userId: session.userId });
        } catch (error) {
          if (__DEV__) {
            console.log("[auth] logout api failed; clearing local session", {
              message:
                error instanceof Error
                  ? error.message
                  : "unknown logout error",
            });
          }
        }
      }

      await clearAuthSession();
    } catch (error) {
      setAccountActionError(
        error instanceof Error
          ? error.message
          : "로그아웃하지 못했습니다."
      );
    } finally {
      setAccountAction(null);
    }
  };

  const performDeleteAccount = async () => {
    if (accountAction) return;
    if (!session?.userId) {
      setAccountActionError("로그인 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    setAccountAction("delete");
    setAccountActionError(null);

    try {
      await deleteMyAccount({ userId: session.userId });
      await clearAuthSession();
    } catch (error) {
      setAccountActionError(
        error instanceof Error
          ? error.message
          : "회원 탈퇴를 처리하지 못했습니다."
      );
    } finally {
      setAccountAction(null);
    }
  };

  const handleDeleteAccount = () => {
    if (accountAction) return;

    Alert.alert(
      "회원 탈퇴",
      "계정과 모든 플로깅 기록이 삭제됩니다. 계속할까요?",
      [
        {
          text: "취소",
          style: "cancel",
        },
        {
          onPress: performDeleteAccount,
          style: "destructive",
          text: "탈퇴",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 118,
            paddingTop: contentTopPadding,
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
        {ploggingStatsError ? (
          <Text selectable style={styles.errorText}>
            {ploggingStatsError}
          </Text>
        ) : null}
        {accountActionError ? (
          <Text selectable style={styles.errorText}>
            {accountActionError}
          </Text>
        ) : null}
        <ProfileOverview
          loading={loadingProfile}
          onChangeProfileImage={handleChangeProfileImage}
          profile={displayedProfile}
          uploadingProfileImage={uploadingProfileImage}
        />
        <SummaryStatsCard stats={ploggingStats} />
        <AccountActions
          busyAction={accountAction}
          disabled={status !== "authenticated"}
          onDeleteAccount={handleDeleteAccount}
          onLogout={handleLogout}
        />
        <LegalLinks
          onOpenPrivacy={() => router.push("/privacy")}
          onOpenSupport={() => router.push("/support")}
        />
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
  const experienceProgressPercent = getExperienceProgressPercent(
    profile.experience,
    profile.level
  );
  const experienceProgressWidth = `${experienceProgressPercent}%` as const;

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
            {profile.title}
          </Text>
          {loading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: experienceProgressWidth }]}
          />
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
          source={{ cache: "reload", uri: imageUrl }}
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

type SummaryStat = {
  label: string;
  unit: string;
  value: string;
};

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDistanceKilometers(distanceMeters: number) {
  const kilometers = distanceMeters / 1000;
  return formatCompactNumber(kilometers);
}

function formatTenThousandSteps(stepCount: number) {
  const tenThousandSteps = stepCount / 10000;
  return formatCompactNumber(tenThousandSteps);
}

function getExperienceProgressPercent(experience: number, level: number) {
  if (!Number.isFinite(experience) || !Number.isFinite(level)) return 0;

  const completedLevelExperience =
    Math.max(Math.floor(level) - 1, 0) * EXPERIENCE_PROGRESS_UNIT;
  const currentLevelExperience = experience - completedLevelExperience;
  const progressPercent =
    (currentLevelExperience / EXPERIENCE_PROGRESS_UNIT) * 100;

  return Math.max(0, Math.min(progressPercent, 100));
}

function getSummaryStats(stats: MyPloggingStats | null): SummaryStat[] {
  if (!stats) return [...profileSummaryStats];

  return [
    {
      label: "플로깅",
      value: formatCompactNumber(stats.totalPloggingCount),
      unit: "회",
    },
    {
      label: "총 누적 걸음",
      value: formatTenThousandSteps(stats.totalStepCount),
      unit: "만보",
    },
    {
      label: "총 누적 거리",
      value: formatDistanceKilometers(stats.totalDistanceMeters),
      unit: "km",
    },
  ];
}

function SummaryStatsCard({ stats }: { stats: MyPloggingStats | null }) {
  const summaryStats = getSummaryStats(stats);

  return (
    <View style={styles.summaryCard}>
      {summaryStats.map((stat) => (
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

function AccountActions({
  busyAction,
  disabled,
  onDeleteAccount,
  onLogout,
}: {
  busyAction: AccountAction;
  disabled: boolean;
  onDeleteAccount: () => void;
  onLogout: () => void;
}) {
  const actionDisabled = disabled || busyAction !== null;

  return (
    <View style={styles.accountActions}>
      <Pressable
        accessibilityLabel="로그아웃"
        accessibilityRole="button"
        disabled={actionDisabled}
        onPress={onLogout}
        style={({ pressed }) => [
          styles.accountButton,
          styles.logoutButton,
          pressed && !actionDisabled ? styles.pressed : null,
          actionDisabled ? styles.disabled : null,
        ]}
      >
        {busyAction === "logout" ? (
          <ActivityIndicator color={colors.icon} size="small" />
        ) : (
          <>
            <Feather color={colors.icon} name="log-out" size={18} />
            <Text selectable style={styles.accountButtonText}>
              로그아웃
            </Text>
          </>
        )}
      </Pressable>
      <Pressable
        accessibilityLabel="회원 탈퇴"
        accessibilityRole="button"
        disabled={actionDisabled}
        onPress={onDeleteAccount}
        style={({ pressed }) => [
          styles.accountButton,
          styles.deleteAccountButton,
          pressed && !actionDisabled ? styles.pressed : null,
          actionDisabled ? styles.disabled : null,
        ]}
      >
        {busyAction === "delete" ? (
          <ActivityIndicator color={colors.danger} size="small" />
        ) : (
          <>
            <Feather color={colors.danger} name="user-x" size={18} />
            <Text selectable style={styles.deleteAccountButtonText}>
              회원 탈퇴
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function LegalLinks({
  onOpenPrivacy,
  onOpenSupport,
}: {
  onOpenPrivacy: () => void;
  onOpenSupport: () => void;
}) {
  return (
    <View style={styles.legalLinks}>
      <Pressable
        accessibilityLabel="개인정보 처리방침"
        accessibilityRole="link"
        onPress={onOpenPrivacy}
        style={({ pressed }) => [
          styles.legalLinkButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Feather color={colors.muted} name="shield" size={16} />
        <Text selectable style={styles.legalLinkText}>
          개인정보 처리방침
        </Text>
      </Pressable>
      <View style={styles.legalDivider} />
      <Pressable
        accessibilityLabel="문의 및 지원"
        accessibilityRole="link"
        onPress={onOpenSupport}
        style={({ pressed }) => [
          styles.legalLinkButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Feather color={colors.muted} name="help-circle" size={16} />
        <Text selectable style={styles.legalLinkText}>
          문의 및 지원
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  accountActions: {
    gap: 10,
    marginTop: 2,
    width: "100%",
  },
  accountButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    width: "100%",
  },
  accountButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
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
  content: {
    gap: 23,
    paddingHorizontal: 24,
  },
  deleteAccountButton: {
    backgroundColor: "#FFF7F8",
    borderColor: "#FFD5DA",
  },
  deleteAccountButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
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
  legalDivider: {
    backgroundColor: colors.line,
    height: 14,
    width: 1,
  },
  legalLinkButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 4,
  },
  legalLinks: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 4,
  },
  legalLinkText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
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
});
