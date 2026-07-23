import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Fragment, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontFamilies } from "@/src/shared/theme";

const AVATAR_COLORS = ["#F29B38", "#75B6E5", "#85C884", "#A58BE1"];
const DETAIL_STAT_WIDTHS = [43, 62, 50, 51] as const;

export function CrewScreenHeader({
  title,
  onBack,
  right,
  variant = "compact",
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  variant?: "compact" | "gradient" | "profile";
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        variant === "gradient"
          ? styles.headerGradient
          : variant === "profile"
            ? styles.headerProfile
            : styles.headerCompact,
        { paddingTop: insets.top },
      ]}
    >
      <View
        style={[
          styles.headerRow,
          variant === "gradient" ? styles.headerRowGradient : null,
          variant === "profile" ? styles.headerRowProfile : null,
        ]}
      >
        <View style={styles.headerSide}>
          {onBack ? (
            <Pressable
              accessibilityLabel="뒤로가기"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [
                styles.headerBackIcon,
                variant === "profile" ? styles.headerBackIconProfile : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-back.svg")}
                style={styles.headerBackGlyph}
              />
            </Pressable>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.headerTitle,
            variant === "gradient" ? styles.headerTitleGradient : null,
            variant === "profile" ? styles.headerTitleProfile : null,
          ]}
        >
          {title}
        </Text>
        <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
      </View>
    </View>
  );
}

export function HeaderIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerIcon,
        pressed ? styles.pressed : null,
      ]}
    >
      {icon === "share" ? (
        <Image
          contentFit="contain"
          source={require("@/assets/icons/crew-share.svg")}
          style={styles.headerShareGlyph}
        />
      ) : (
        <Feather color="#33363F" name={icon} size={22} />
      )}
    </Pressable>
  );
}

export function CrewAvatar({
  index = 0,
  nickname,
  size = 44,
  uri,
  style,
  textStyle,
}: {
  index?: number;
  nickname?: string;
  size?: number;
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          accessibilityLabel={nickname ? `${nickname} 프로필` : "크루원 프로필"}
          contentFit="cover"
          source={{ uri }}
          style={{ height: size, width: size }}
        />
      ) : nickname ? (
        <Text style={[styles.avatarInitial, { fontSize: size * 0.36 }]}>
          {nickname.slice(0, 1)}
        </Text>
      ) : null}
    </View>
  );
}

export function CrewAvatarStack({
  memberCount,
  urls,
  size = 30,
}: {
  memberCount: number;
  urls?: string[];
  size?: number;
}) {
  const safeUrls = urls ?? [];
  const shownCount = Math.min(3, memberCount);
  const visibleMembers = Array.from({ length: shownCount }, (_, index) =>
    safeUrls[index] ? { uri: safeUrls[index] } : { uri: undefined },
  );
  const remaining = Math.max(0, memberCount - shownCount);
  const avatarsWidth = shownCount > 0 ? size + (shownCount - 1) * 18 : 0;
  const stackWidth = avatarsWidth + (remaining > 0 ? 29 : 0);

  return (
    <View style={[styles.avatarStack, { height: size, width: stackWidth }]}>
      {visibleMembers.map((member, index) => (
        <CrewAvatar
          index={index}
          key={`${member.uri ?? "fallback"}-${index}`}
          size={size}
          style={{ left: index * 18, position: "absolute", zIndex: 4 - index }}
          uri={member.uri}
        />
      ))}
      {remaining > 0 ? (
        <Text
          numberOfLines={1}
          style={[
            styles.avatarMore,
            { left: avatarsWidth + 5, lineHeight: size },
          ]}
        >
          +{remaining}
        </Text>
      ) : null}
    </View>
  );
}

export function CrewStatRow({
  items,
  variant = "list",
}: {
  items: { label: string; unit?: string; value: string }[];
  variant?: "detail" | "list" | "profile";
}) {
  const isDetail = variant === "detail";
  const isProfile = variant === "profile";

  return (
    <View
      style={[
        styles.statRow,
        isDetail ? styles.detailStatRow : null,
        isProfile ? styles.profileStatRow : null,
      ]}
    >
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          <View
            style={[
              styles.statItem,
              isDetail ? styles.detailStatItem : null,
              isDetail ? { width: DETAIL_STAT_WIDTHS[index] } : null,
              isProfile ? styles.profileStatItem : null,
              isProfile
                ? index === 0
                  ? styles.profileStatItemFirst
                  : index === 1
                    ? styles.profileStatItemSecond
                    : styles.profileStatItemThird
                : null,
            ]}
          >
            <View
              style={[
                styles.statValueRow,
                isDetail ? styles.detailStatValueRow : null,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                numberOfLines={1}
                style={[
                  styles.statValue,
                  isDetail ? styles.detailStatValue : null,
                  isProfile ? styles.profileStatValue : null,
                ]}
              >
                {item.value}
              </Text>
              {item.unit ? (
                <Text
                  style={[
                    styles.statUnit,
                    isDetail ? styles.detailStatUnit : null,
                    isProfile ? styles.profileStatUnit : null,
                  ]}
                >
                  {item.unit}
                </Text>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.statLabel,
                isDetail ? styles.detailStatLabel : null,
                isProfile ? styles.profileStatLabel : null,
              ]}
            >
              {item.label}
            </Text>
          </View>
          {isDetail && index < items.length - 1 ? (
            <View style={styles.detailStatDivider} />
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

export function CrewPrimaryButton({
  disabled = false,
  loading = false,
  onPress,
  title,
  tone = "primary",
  style,
  textStyle,
}: {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  title: string;
  tone?: "primary" | "danger" | "neutral";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const backgroundColor = disabled
    ? "#E6E6E6"
    : tone === "danger"
      ? "#FF5E5E"
      : tone === "neutral"
        ? "#F5F5F5"
        : "#449DDD";
  const textColor = disabled || tone === "neutral" ? "#727272" : "#FFFFFF";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor },
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={[styles.primaryButtonText, { color: textColor }, textStyle]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function CrewLoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color="#449DDD" />
    </View>
  );
}

export function CrewErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateTitle}>정보를 불러오지 못했어요</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "잠시 후 다시 시도해 주세요.",
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getApiStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }
  return null;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "-";
  return (meters / 1_000).toFixed(meters >= 10_000 ? 1 : 2).replace(/\.0$/, "");
}

export function formatSteps(steps: number | null | undefined): string {
  if (steps === null || steps === undefined) return "-";
  if (steps >= 10_000) return (steps / 10_000).toFixed(1).replace(/\.0$/, "");
  return steps.toLocaleString("ko-KR");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatCrewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.bold,
    marginLeft: -1,
  },
  avatarMore: {
    color: "#535353",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    position: "absolute",
  },
  avatarStack: {
    position: "relative",
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    zIndex: 20,
  },
  headerCompact: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    elevation: 3,
  },
  headerGradient: {
    backgroundColor: "#FAFAFA",
  },
  headerProfile: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    elevation: 3,
  },
  headerBackGlyph: {
    height: 19,
    width: 11,
  },
  headerBackIcon: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerBackIconProfile: {
    marginLeft: 0,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerShareGlyph: {
    height: 24,
    width: 24,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  headerRowGradient: {
    height: 56,
  },
  headerRowProfile: {
    height: 56,
  },
  headerSide: {
    width: 44,
  },
  headerTitle: {
    color: "#0A0A0A",
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
    textAlign: "center",
  },
  headerTitleGradient: {
    fontFamily: fontFamilies.gothicA1ExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  headerTitleProfile: {
    fontFamily: fontFamilies.gothicA1Bold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 12,
    height: 47,
    justifyContent: "center",
    width: "100%",
  },
  primaryButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  retryButton: {
    backgroundColor: "#449DDD",
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
  },
  stateMessage: {
    color: colors.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  stateTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 17,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    marginTop: 6,
  },
  statRow: {
    alignSelf: "center",
    flexDirection: "row",
    width: 280,
  },
  statUnit: {
    color: "#737373",
    fontFamily: fontFamilies.gothicA1SemiBold,
    fontSize: 11,
    marginBottom: 2,
    marginLeft: 2,
  },
  statValue: {
    color: "#0A0A0A",
    flexShrink: 1,
    fontFamily: fontFamilies.gothicA1ExtraBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  statValueRow: {
    alignItems: "flex-end",
    flexDirection: "row",
  },
  detailStatDivider: {
    backgroundColor: "#E6E6E6",
    height: 45,
    width: 1,
  },
  detailStatItem: {
    alignItems: "flex-start",
    flex: 0,
  },
  detailStatLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
  detailStatRow: {
    gap: 15,
    width: "100%",
  },
  detailStatUnit: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    marginBottom: 2,
  },
  detailStatValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 24,
    letterSpacing: -0.75,
  },
  detailStatValueRow: {
    justifyContent: "flex-end",
    width: "100%",
  },
  profileStatLabel: {
    color: "#0A0A0A",
    fontSize: 11,
    marginTop: 5,
  },
  profileStatItem: {
    alignItems: "flex-start",
    flex: 0,
    position: "absolute",
    top: 24,
  },
  profileStatItemFirst: {
    left: 0,
    width: 80,
  },
  profileStatItemSecond: {
    left: 110,
    width: 97,
  },
  profileStatItemThird: {
    right: 0,
    width: 65,
  },
  profileStatRow: {
    height: 89,
    position: "relative",
    width: "100%",
  },
  profileStatUnit: {
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  profileStatValue: {
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 20,
    letterSpacing: 0.8,
  },
});
