import {
  logout as logoutFromServer,
  saveSession,
  useAuthSession,
} from "@/src/features/auth";
import {
  getPloggingSessions,
  type PloggingSessionSummary,
} from "@/src/features/plogging-history";
import {
  colors,
  fontFamilies,
  getSafeLineHeight,
  shadows,
} from "@/src/shared/theme";
import { BackButton, ScreenRoot, useTabBarHeight } from "@/src/shared/ui";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import type * as ExpoImagePicker from "expo-image-picker";
import { requireOptionalNativeModule } from "expo-modules-core";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { hasDisallowedUserGeneratedText } from "@/src/features/crew/services/crew-safety";

const EXPERIENCE_PROGRESS_UNIT = 720;
const PHOTO_LIBRARY_PERMISSION_ERROR = "사진 접근 권한이 필요합니다.";

type AccountAction = "logout" | "delete" | null;

declare const require: <T = unknown>(moduleName: string) => T;

let imagePickerModule: typeof ExpoImagePicker | null | undefined;

function getImagePickerModule() {
  if (imagePickerModule !== undefined) return imagePickerModule;

  try {
    if (Platform.OS !== "web") {
      const nativeImagePicker = requireOptionalNativeModule(
        "ExponentImagePicker",
      );
      if (!nativeImagePicker) {
        imagePickerModule = null;
        return imagePickerModule;
      }
    }

    imagePickerModule = require<typeof ExpoImagePicker>("expo-image-picker");
  } catch {
    imagePickerModule = null;
  }

  return imagePickerModule;
}

async function ensurePhotoLibraryPermission(
  imagePicker: typeof ExpoImagePicker,
): Promise<boolean> {
  if (Platform.OS === "web" || Platform.OS === "android") return true;

  const currentPermission = await imagePicker.getMediaLibraryPermissionsAsync();
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

  if (!requestedPermission.canAskAgain) showPhotoLibrarySettingsAlert();
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
          Linking.openSettings().catch(() => undefined);
        },
      },
    ],
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { clearAuthSession, session, status } = useAuthSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ploggingStats, setPloggingStats] = useState<MyPloggingStats | null>(
    null,
  );
  const [recentSessions, setRecentSessions] = useState<
    PloggingSessionSummary[]
  >([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [ploggingStatsError, setPloggingStatsError] = useState<string | null>(
    null,
  );
  const [recentSessionsError, setRecentSessionsError] = useState<string | null>(
    null,
  );
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const [profileImageError, setProfileImageError] = useState<string | null>(
    null,
  );
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [accountAction, setAccountAction] = useState<AccountAction>(null);
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      if (status === "loading") return;
      if (status !== "authenticated") {
        setProfile(null);
        setPloggingStats(null);
        setRecentSessions([]);
        setSettingsMenuVisible(false);
        setDeleteConfirmVisible(false);
        return;
      }
      if (!session?.userId) return;

      let mounted = true;
      setLoadingProfile(true);
      setProfileError(null);
      setPloggingStatsError(null);
      setRecentSessionsError(null);

      Promise.allSettled([
        getUserProfile(),
        getMyPloggingStats(),
        getPloggingSessions({
          page: 0,
          size: 3,
          sort: ["startedAt,desc"],
        }),
      ])
        .then(([profileResult, statsResult, sessionsResult]) => {
          if (!mounted) return;

          if (profileResult.status === "fulfilled") {
            setProfile(profileResult.value);
          } else {
            setProfileError(
              getErrorMessage(
                profileResult.reason,
                "프로필 정보를 불러오지 못했습니다.",
              ),
            );
          }

          if (statsResult.status === "fulfilled") {
            setPloggingStats(statsResult.value);
          } else {
            setPloggingStatsError(
              getErrorMessage(
                statsResult.reason,
                "누적 통계를 불러오지 못했습니다.",
              ),
            );
          }

          if (sessionsResult.status === "fulfilled") {
            setRecentSessions(sessionsResult.value.content.slice(0, 3));
          } else {
            setRecentSessionsError(
              getErrorMessage(
                sessionsResult.reason,
                "최근 기록을 불러오지 못했습니다.",
              ),
            );
          }
        })
        .finally(() => {
          if (mounted) setLoadingProfile(false);
        });

      return () => {
        mounted = false;
      };
    }, [session?.userId, status]),
  );

  const displayedProfile: UserProfile = {
    nickname: profile?.nickname ?? session?.nickname ?? "플로버",
    level: profile?.level ?? 1,
    title: profile?.title ?? "",
    profileImageUrl: profile?.profileImageUrl ?? null,
    experience: profile?.experience ?? 0,
  };

  const visibleError =
    accountActionError ??
    profileImageError ??
    profileError ??
    ploggingStatsError ??
    recentSessionsError;

  const openNicknameEditor = () => {
    setNicknameDraft(displayedProfile.nickname);
    setNicknameError(null);
    setSettingsMenuVisible(false);
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
    if (hasDisallowedUserGeneratedText(nextNickname)) {
      setNicknameError("다른 사용자가 불편할 수 있는 표현은 사용할 수 없습니다.");
      return;
    }

    setSavingNickname(true);
    setNicknameError(null);

    try {
      const updatedNickname = await updateMyNickname({
        nickname: nextNickname,
      });
      setProfile((currentProfile) => ({
        experience: currentProfile?.experience ?? displayedProfile.experience,
        level: currentProfile?.level ?? displayedProfile.level,
        nickname: updatedNickname.nickname,
        profileImageUrl:
          currentProfile?.profileImageUrl ?? displayedProfile.profileImageUrl,
        title: currentProfile?.title ?? displayedProfile.title,
      }));

      if (session) {
        await saveSession({ ...session, nickname: updatedNickname.nickname });
      }
      setNicknameModalVisible(false);
    } catch (error) {
      setNicknameError(getErrorMessage(error, "닉네임을 저장하지 못했습니다."));
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
          "프로필 이미지 선택 모듈이 없습니다. 개발 빌드를 다시 빌드해주세요.",
        );
      }

      const hasPermission = await ensurePhotoLibraryPermission(imagePicker);
      if (!hasPermission) throw new Error(PHOTO_LIBRARY_PERMISSION_ERROR);

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
      const uploadTarget = await getProfileImageUploadUrl({ contentType });
      await uploadProfileImageToS3({
        contentType,
        uploadUrl: uploadTarget.uploadUrl,
        uri: imageAsset.uri,
      });
      const updatedProfileImage = await updateMyProfileImage({
        imageUrl: uploadTarget.objectUrl,
      });
      const nextProfileImageUrl =
        updatedProfileImage.profileImageUrl ?? uploadTarget.objectUrl;

      setProfile((currentProfile) => ({
        experience: currentProfile?.experience ?? displayedProfile.experience,
        level: currentProfile?.level ?? displayedProfile.level,
        nickname: currentProfile?.nickname ?? displayedProfile.nickname,
        profileImageUrl: nextProfileImageUrl,
        title: currentProfile?.title ?? displayedProfile.title,
      }));
    } catch (error) {
      setProfileImageError(
        getErrorMessage(error, "프로필 이미지를 저장하지 못했습니다."),
      );
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handleLogout = async () => {
    if (accountAction) return;
    setSettingsMenuVisible(false);
    setAccountAction("logout");
    setAccountActionError(null);

    try {
      if (session) {
        try {
          await logoutFromServer();
        } catch (error) {
          if (__DEV__) {
            console.log("[auth] logout api failed; clearing local session", {
              message: getErrorMessage(error, "unknown logout error"),
            });
          }
        }
      }
      await clearAuthSession();
    } catch (error) {
      setAccountActionError(getErrorMessage(error, "로그아웃하지 못했습니다."));
    } finally {
      setAccountAction(null);
    }
  };

  const performDeleteAccount = async () => {
    if (accountAction) return;
    if (!session?.userId) {
      setDeleteConfirmVisible(false);
      setAccountActionError("로그인 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    setAccountAction("delete");
    setAccountActionError(null);
    try {
      await deleteMyAccount();
      await clearAuthSession();
    } catch (error) {
      setDeleteConfirmVisible(false);
      setAccountActionError(
        getErrorMessage(error, "회원 탈퇴를 처리하지 못했습니다."),
      );
    } finally {
      setAccountAction(null);
    }
  };

  const handleBack = () => {
    router.replace("/");
  };

  return (
    <ScreenRoot>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: tabBarHeight + 24,
            paddingTop: insets.top + 76,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileOverview
          loading={loadingProfile}
          onChangeProfileImage={handleChangeProfileImage}
          onEditNickname={openNicknameEditor}
          profile={displayedProfile}
          uploadingProfileImage={uploadingProfileImage}
        />
        <SummaryStatsCard stats={ploggingStats} />
        <RecentRecords
          onOpenSession={(sessionId) =>
            router.push({
              pathname: "/plogging-sessions/[id]",
              params: { id: String(sessionId) },
            })
          }
          sessions={recentSessions}
        />
        <LegalLinks
          onOpenPrivacy={() => router.push("/privacy")}
          onOpenSupport={() => router.push("/support")}
        />
      </ScrollView>

      {settingsMenuVisible ? (
        <Pressable
          accessibilityLabel="계정 메뉴 닫기"
          onPress={() => setSettingsMenuVisible(false)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <BackButton
        onPress={handleBack}
        style={[styles.profileBackButton, { top: insets.top + 8 }]}
      />
      <Text
        accessibilityRole="header"
        pointerEvents="none"
        style={[styles.profileHeaderTitle, { top: insets.top + 19 }]}
      >
        마이페이지
      </Text>

      <SettingsButton
        busy={accountAction !== null}
        onPress={() => setSettingsMenuVisible((visible) => !visible)}
        top={insets.top + 8}
      />
      {settingsMenuVisible ? (
        <AccountMenu
          onDelete={() => {
            setSettingsMenuVisible(false);
            setDeleteConfirmVisible(true);
          }}
          onLogout={() => void handleLogout()}
          top={insets.top + 60}
        />
      ) : null}

      {visibleError ? (
        <View
          style={[
            styles.errorBanner,
            { bottom: tabBarHeight + 8 },
          ]}
        >
          <Text selectable style={styles.errorText}>
            {visibleError}
          </Text>
        </View>
      ) : null}

      <NicknameEditModal
        errorMessage={nicknameError}
        nickname={nicknameDraft}
        onChangeNickname={setNicknameDraft}
        onClose={closeNicknameEditor}
        onSave={handleSaveNickname}
        saving={savingNickname}
        visible={nicknameModalVisible}
      />
      <DeleteAccountModal
        deleting={accountAction === "delete"}
        onCancel={() => {
          if (accountAction !== "delete") setDeleteConfirmVisible(false);
        }}
        onConfirm={() => void performDeleteAccount()}
        visible={deleteConfirmVisible}
      />
    </ScreenRoot>
  );
}

function SettingsButton({
  busy,
  onPress,
  top,
}: {
  busy: boolean;
  onPress: () => void;
  top: number;
}) {
  return (
    <Pressable
      accessibilityLabel="계정 메뉴"
      accessibilityRole="button"
      disabled={busy}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsButton,
        { top },
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        contentFit="contain"
        source={require("@/assets/icons/profile-settings.svg")}
        style={styles.settingsIcon}
      />
    </Pressable>
  );
}

function AccountMenu({
  onDelete,
  onLogout,
  top,
}: {
  onDelete: () => void;
  onLogout: () => void;
  top: number;
}) {
  return (
    <View style={[styles.accountMenu, { top }]}>
      <Pressable
        accessibilityLabel="로그아웃"
        accessibilityRole="button"
        onPress={onLogout}
        style={({ pressed }) => [
          styles.accountMenuItem,
          styles.accountMenuItemTop,
          pressed ? styles.accountMenuPressed : null,
        ]}
      >
        <Text style={styles.accountMenuText}>로그아웃</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="회원탈퇴"
        accessibilityRole="button"
        onPress={onDelete}
        style={({ pressed }) => [
          styles.accountMenuItem,
          styles.accountMenuItemBottom,
          pressed ? styles.accountMenuPressed : null,
        ]}
      >
        <Text style={styles.accountMenuDeleteText}>회원탈퇴</Text>
      </Pressable>
    </View>
  );
}

function ProfileOverview({
  loading,
  onChangeProfileImage,
  onEditNickname,
  profile,
  uploadingProfileImage,
}: {
  loading: boolean;
  onChangeProfileImage: () => void;
  onEditNickname: () => void;
  profile: UserProfile;
  uploadingProfileImage: boolean;
}) {
  const experienceProgressWidth = `${getExperienceProgressPercent(
    profile.experience,
    profile.level,
  )}%` as const;

  return (
    <View style={styles.profileOverview}>
      <ProfileAvatar
        imageUrl={profile.profileImageUrl}
        onPress={onChangeProfileImage}
        uploading={uploadingProfileImage}
      />
      <View style={styles.profileTextBlock}>
        <Pressable
          accessibilityLabel="닉네임 수정"
          accessibilityRole="button"
          hitSlop={6}
          onPress={onEditNickname}
        >
          <Text numberOfLines={1} style={styles.userName}>
            {profile.nickname}
          </Text>
        </Pressable>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv.{profile.level}</Text>
          </View>
          <Text numberOfLines={1} style={styles.levelTitle}>
            {profile.title}
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} size={12} />
          ) : null}
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
          accessibilityLabel="프로필 이미지"
          contentFit="cover"
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {uploading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <Image
          contentFit="contain"
          source={require("@/assets/icons/profile-edit.svg")}
          style={styles.avatarEditIcon}
        />
      )}
    </Pressable>
  );
}

type SummaryStat = {
  label: string;
  unit: string;
  value: string;
};

function SummaryStatsCard({ stats }: { stats: MyPloggingStats | null }) {
  const summaryStats = getSummaryStats(stats);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryInner}>
        {summaryStats.map((stat, index) => (
          <View
            key={stat.label}
            style={[
              styles.summaryItem,
              index === 0
                ? styles.summaryItemFirst
                : index === 1
                  ? styles.summaryItemSecond
                  : styles.summaryItemThird,
            ]}
          >
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>{stat.value}</Text>
              <Text style={styles.summaryUnit}>{stat.unit}</Text>
            </View>
            <Text style={styles.summaryLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentRecords({
  onOpenSession,
  sessions,
}: {
  onOpenSession: (sessionId: number) => void;
  sessions: PloggingSessionSummary[];
}) {
  return (
    <View style={styles.recentSection}>
      <Text style={styles.recentTitle}>최근 기록</Text>
      <View style={styles.recentList}>
        {sessions.length > 0 ? (
          sessions.map((session, index) => (
            <Pressable
              accessibilityLabel={`${session.placeName || "플로깅"} 기록 상세 보기`}
              accessibilityRole="button"
              key={session.ploggingSessionId}
              onPress={() => onOpenSession(session.ploggingSessionId)}
              style={({ pressed }) => [
                styles.recordCard,
                index === 0
                  ? styles.recordCardFirst
                  : index === 1
                    ? styles.recordCardSecond
                    : styles.recordCardThird,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.recordImagePlaceholder} />
              <View style={styles.recordCopy}>
                <Text numberOfLines={1} style={styles.recordPlace}>
                  {session.placeName || "플로깅 활동"}
                </Text>
                <Text numberOfLines={1} style={styles.recordTime}>
                  {formatSessionTimeRange(
                    session.startedAt,
                    session.finishedAt,
                  )}
                </Text>
              </View>
              <View style={styles.recordDistance}>
                <Text style={styles.recordDistanceValue}>
                  {formatDistanceKilometers(session.distanceMeters)}
                </Text>
                <Text style={styles.recordDistanceUnit}>km</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyRecordsText}>
            최근 플로깅 기록이 없습니다.
          </Text>
        )}
      </View>
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
        accessibilityLabel="개인정보 처리 방침"
        accessibilityRole="link"
        onPress={onOpenPrivacy}
        style={({ pressed }) => [
          styles.legalLink,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.legalLinkText}>개인정보 처리 방침</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="문의 및 지원"
        accessibilityRole="link"
        onPress={onOpenSupport}
        style={({ pressed }) => [
          styles.legalLink,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={styles.legalLinkText}>문의 및 지원</Text>
      </Pressable>
    </View>
  );
}

function DeleteAccountModal({
  deleting,
  onCancel,
  onConfirm,
  visible,
}: {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.deleteOverlay}>
        <View style={styles.deleteCard}>
          <Pressable
            accessibilityLabel="회원 탈퇴 창 닫기"
            accessibilityRole="button"
            disabled={deleting}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.deleteCloseButton,
              pressed && !deleting ? styles.pressed : null,
            ]}
          >
            <Image
              contentFit="contain"
              source={require("@/assets/icons/crew-close.svg")}
              style={styles.deleteCloseIcon}
            />
          </Pressable>
          <Text style={styles.deleteQuestion}>
            <Text style={styles.deleteQuestionStrong}>회원 탈퇴</Text>를
            진행하시겠습니까?
          </Text>
          <Text style={styles.deleteDescription}>
            탈퇴하면 계정·프로필과 연결된 개인 플로깅 기록 삭제를 요청하며
            복구할 수 없습니다. 법령상 보관 의무가 있거나 함께한 크루 기록
            보존에 필요한 정보는 분리 보관 또는 비식별 처리될 수 있습니다.
          </Text>
          <View style={styles.deleteActions}>
            <Pressable
              accessibilityLabel="회원 탈퇴 확인"
              accessibilityRole="button"
              disabled={deleting}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.deleteConfirmButton,
                pressed && !deleting ? styles.pressed : null,
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.deleteConfirmText}>탈퇴</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityLabel="회원 탈퇴 취소"
              accessibilityRole="button"
              disabled={deleting}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.deleteCancelButton,
                pressed && !deleting ? styles.pressed : null,
              ]}
            >
              <Text style={styles.deleteCancelText}>아니오</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.nicknameOverlay}
      >
        <View style={styles.nicknameCard}>
          <Text style={styles.nicknameModalTitle}>닉네임 수정</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
            onChangeText={onChangeNickname}
            onSubmitEditing={onSave}
            placeholder="닉네임"
            placeholderTextColor={colors.subtle}
            returnKeyType="done"
            style={styles.nicknameInput}
            value={nickname}
          />
          {errorMessage ? (
            <Text style={styles.nicknameErrorText}>{errorMessage}</Text>
          ) : null}
          <View style={styles.nicknameActions}>
            <Pressable
              disabled={saving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.nicknameCancelButton,
                pressed && !saving ? styles.pressed : null,
              ]}
            >
              <Text style={styles.nicknameCancelText}>취소</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={onSave}
              style={({ pressed }) => [
                styles.nicknameSaveButton,
                pressed && !saving ? styles.pressed : null,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.nicknameSaveText}>저장</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatNumber(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(
    value,
  );
}

function formatDistanceKilometers(distanceMeters: number) {
  return formatNumber(distanceMeters / 1000, 2);
}

function getExperienceProgressPercent(experience: number, level: number) {
  if (!Number.isFinite(experience) || !Number.isFinite(level)) return 0;
  const completedLevelExperience =
    Math.max(Math.floor(level) - 1, 0) * EXPERIENCE_PROGRESS_UNIT;
  const currentLevelExperience = experience - completedLevelExperience;
  return Math.max(
    0,
    Math.min((currentLevelExperience / EXPERIENCE_PROGRESS_UNIT) * 100, 100),
  );
}

function getSummaryStats(stats: MyPloggingStats | null): SummaryStat[] {
  if (!stats) return [...profileSummaryStats];
  return [
    {
      label: "플로깅",
      unit: "회",
      value: formatNumber(stats.totalPloggingCount, 0),
    },
    {
      label: "총 누적 걸음",
      unit: "만보",
      value: formatNumber(stats.totalStepCount / 10_000, 1),
    },
    {
      label: "총 누적 거리",
      unit: "km",
      value: formatDistanceKilometers(stats.totalDistanceMeters),
    },
  ];
}

function formatSessionTimeRange(startedAt: string, finishedAt: string) {
  const started = new Date(startedAt);
  const finished = new Date(finishedAt);
  if (Number.isNaN(started.getTime()) || Number.isNaN(finished.getTime())) {
    return `${startedAt} - ${finishedAt}`;
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const time = (date: Date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return `${started.getMonth() + 1}월 ${started.getDate()}일 ${weekdays[started.getDay()]} ${time(started)} - ${time(finished)}`;
}

const styles = StyleSheet.create({
  accountMenu: {
    position: "absolute",
    right: 24,
    width: 128,
    zIndex: 13,
    ...shadows.raised,
  },
  accountMenuDeleteText: {
    color: "#FF5E5E",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.36,
    textDecorationLine: "underline",
  },
  accountMenuItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D3D3D3",
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  accountMenuItemBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderTopWidth: 0,
  },
  accountMenuItemTop: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  accountMenuPressed: {
    backgroundColor: "#F5F5F5",
  },
  accountMenuText: {
    color: "#121212",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.36,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 90,
    justifyContent: "center",
    overflow: "hidden",
    width: 90,
  },
  avatarEditIcon: {
    bottom: 8.33,
    height: 12.59,
    position: "absolute",
    right: 9.08,
    width: 12.59,
  },
  content: {
    paddingHorizontal: 24,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 12,
    height: 48,
    left: 20,
    position: "absolute",
    right: 20,
    top: 218,
  },
  deleteCancelButton: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
  },
  deleteCancelText: {
    color: "#727272",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  deleteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 14px 40px rgba(0,0,0,0.20)",
    height: 282,
    maxWidth: 325,
    overflow: "hidden",
    width: "100%",
  },
  deleteCloseButton: {
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
  deleteCloseIcon: {
    height: 14,
    width: 14,
  },
  deleteConfirmButton: {
    alignItems: "center",
    backgroundColor: "#FF5E5E",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
  },
  deleteConfirmText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  deleteDescription: {
    color: "#727272",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    left: 22,
    letterSpacing: -0.26,
    lineHeight: 19,
    position: "absolute",
    right: 22,
    textAlign: "center",
    top: 100,
  },
  deleteOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(18,18,18,0.35)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  deleteQuestion: {
    color: "#000000",
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    left: 20,
    letterSpacing: -0.36,
    lineHeight: 25.2,
    position: "absolute",
    right: 20,
    textAlign: "center",
    top: 59,
  },
  deleteQuestionStrong: {
    fontFamily: fontFamilies.semiBold,
  },
  emptyRecordsText: {
    color: "#737373",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    marginTop: 34,
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 8,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    right: 24,
    zIndex: 30,
    ...shadows.soft,
  },
  errorText: {
    color: "#FF5E5E",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  legalLink: {
    justifyContent: "center",
    minHeight: 44,
  },
  legalLinks: {
    alignItems: "center",
    borderTopColor: "#E6E6E6",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 23,
    justifyContent: "center",
    marginTop: 40,
    paddingTop: 20,
  },
  legalLinkText: {
    color: "#727272",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderRadius: 17,
    height: 18,
    justifyContent: "center",
    minWidth: 40,
    paddingHorizontal: 7,
  },
  levelBadgeText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
    lineHeight: getSafeLineHeight(12, fontFamilies.medium, 14),
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 5,
  },
  levelTitle: {
    color: "#0A0A0A",
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
    lineHeight: 18,
  },
  nicknameActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  nicknameCancelButton: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  nicknameCancelText: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
  },
  nicknameCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    ...shadows.raised,
  },
  nicknameErrorText: {
    color: "#FF5E5E",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  nicknameInput: {
    borderColor: "#E6E6E6",
    borderRadius: 12,
    borderWidth: 1,
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  nicknameModalTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    marginBottom: 16,
  },
  nicknameOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(18,18,18,0.35)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  nicknameSaveButton: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderRadius: 12,
    flex: 1,
    height: 48,
    justifyContent: "center",
  },
  nicknameSaveText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.72,
  },
  profileOverview: {
    alignItems: "flex-start",
    flexDirection: "row",
    height: 90,
  },
  profileBackButton: {
    left: 24,
    position: "absolute",
    zIndex: 12,
  },
  profileHeaderTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    left: 76,
    letterSpacing: -0.36,
    position: "absolute",
    right: 76,
    textAlign: "center",
    zIndex: 11,
  },
  profileTextBlock: {
    flex: 1,
    marginLeft: 21,
    marginTop: 27,
    minWidth: 0,
  },
  progressFill: {
    backgroundColor: "#449DDD",
    height: 8,
    left: -3,
    position: "absolute",
    top: 0,
  },
  progressTrack: {
    backgroundColor: "#E5E5E5",
    borderRadius: 7,
    height: 4,
    marginTop: 10,
    overflow: "hidden",
    width: "100%",
  },
  recentList: {
    marginTop: 9,
    minHeight: 257,
    position: "relative",
  },
  recentSection: {
    marginTop: 23,
  },
  recentTitle: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: getSafeLineHeight(16, fontFamilies.medium, 19),
  },
  recordCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 21.2px rgba(0,0,0,0.07)",
    flexDirection: "row",
    height: 77,
    left: 0,
    position: "absolute",
    right: 0,
  },
  recordCardFirst: {
    top: 0,
  },
  recordCardSecond: {
    top: 89,
  },
  recordCardThird: {
    top: 180,
  },
  recordCopy: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  recordDistance: {
    alignItems: "flex-end",
    flexDirection: "row",
    marginLeft: 8,
    marginRight: 15,
  },
  recordDistanceUnit: {
    color: "#737373",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
    lineHeight: getSafeLineHeight(10, fontFamilies.giantsRegular, 12),
    marginBottom: 1,
    marginLeft: 4,
  },
  recordDistanceValue: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 16,
    letterSpacing: 0.64,
    lineHeight: getSafeLineHeight(16, fontFamilies.giantsRegular, 19),
  },
  recordImagePlaceholder: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 45,
    marginLeft: 16,
    transform: [{ translateY: -1 }],
    width: 45,
  },
  recordPlace: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    letterSpacing: -0.32,
    lineHeight: getSafeLineHeight(16, fontFamilies.semiBold, 19),
  },
  recordTime: {
    color: "#737373",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 16,
    marginTop: 2,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 21.2px rgba(0,0,0,0.07)",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    width: 44,
    zIndex: 12,
  },
  settingsIcon: {
    height: 23.33,
    width: 23.33,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 0 21.2px rgba(0,0,0,0.07)",
    height: 89,
    marginTop: 23,
    overflow: "hidden",
    width: "100%",
  },
  summaryInner: {
    bottom: 0,
    left: 22,
    position: "absolute",
    right: 22,
    top: 0,
  },
  summaryItem: {
    position: "absolute",
    top: 24,
  },
  summaryItemFirst: {
    left: 0,
    width: 80,
  },
  summaryItemSecond: {
    left: 110,
    width: 97,
  },
  summaryItemThird: {
    right: 0,
    width: 65,
  },
  summaryLabel: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    letterSpacing: -0.22,
    lineHeight: getSafeLineHeight(11, fontFamilies.medium, 13),
    marginTop: 5,
  },
  summaryUnit: {
    color: "#737373",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
    lineHeight: getSafeLineHeight(10, fontFamilies.giantsRegular, 12),
    marginBottom: 1,
    marginLeft: 3,
  },
  summaryValue: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 20,
    letterSpacing: 0.8,
    lineHeight: getSafeLineHeight(20, fontFamilies.giantsRegular, 20),
  },
  summaryValueRow: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  userName: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 22,
    letterSpacing: -0.44,
    lineHeight: getSafeLineHeight(22, fontFamilies.medium, 26),
  },
});
