import { Image } from "expo-image";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontFamilies } from "@/src/shared/theme";
import { PrimaryBottomButton } from "@/src/shared/ui";

import {
  PersonalReportPoster,
  type PersonalReportPosterData,
} from "./personal-report-poster";

type PersonalReportShareSheetProps = {
  completeDisabled?: boolean;
  completeTitle?: string;
  data: PersonalReportPosterData;
  onClose: () => void;
  onComplete?: () => void;
  onSave: () => void;
  onShare: () => void;
  saving?: boolean;
  sharing?: boolean;
  visible: boolean;
};

const PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT = 70;

const icons = {
  close: require("@/assets/icons/crew-close.svg"),
  save: require("@/assets/icons/crew-download.svg"),
  share: require("@/assets/icons/crew-share.svg"),
} as const;

export function PersonalReportShareSheet({
  completeDisabled = false,
  completeTitle = "플로깅 완료",
  data,
  onClose,
  onComplete,
  onSave,
  onShare,
  saving = false,
  sharing = false,
  visible,
}: PersonalReportShareSheetProps) {
  const busy = saving || sharing;
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const bottomActionHeight = onComplete
    ? PRIMARY_BOTTOM_BUTTON_BASE_HEIGHT + insets.bottom
    : 0;
  const sheetHeight = Math.min(
    545,
    Math.max(460, windowHeight - insets.top - bottomActionHeight - 12),
  );

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="공유 창 닫기"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View
          style={[
            styles.sheet,
            {
              bottom: bottomActionHeight,
              height: sheetHeight,
              paddingBottom: onComplete ? 16 : Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>공유하기</Text>
            <Pressable
              accessibilityLabel="공유 닫기"
              accessibilityRole="button"
              disabled={busy}
              hitSlop={4}
              onPress={onClose}
              style={({ pressed }) => [
                styles.close,
                pressed ? styles.pressed : null,
              ]}
            >
              <Image
                contentFit="contain"
                source={icons.close}
                style={styles.closeIcon}
              />
            </Pressable>
          </View>

          <View style={styles.preview}>
            <PersonalReportPoster data={data} />
          </View>

          <View style={styles.actions}>
            <ShareAction
              disabled={busy}
              icon={icons.share}
              label="공유"
              loading={sharing}
              onPress={onShare}
              tone="share"
            />
            <ShareAction
              disabled={busy}
              icon={icons.save}
              label="이미지 저장"
              loading={saving}
              onPress={onSave}
              tone="save"
            />
          </View>
        </View>
        {onComplete ? (
          <PrimaryBottomButton
            disabled={busy || completeDisabled}
            onPress={onComplete}
            title={completeTitle}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function ShareAction({
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
    <Image contentFit="contain" source={icon} style={styles.actionIcon} />
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
    >
      <View
        style={[
          styles.actionCircle,
          tone === "share" ? styles.shareCircle : styles.saveCircle,
        ]}
      >
        {iconView}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    gap: 8,
    minHeight: 76,
    minWidth: 64,
  },
  actionCircle: {
    alignItems: "center",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  actionIcon: {
    height: 26,
    width: 26,
  },
  actionLabel: {
    color: "#727272",
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  backdrop: {
    backgroundColor: "rgba(14, 17, 24, 0.42)",
  },
  close: {
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  closeIcon: {
    height: 14,
    width: 14,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: "#E6E6E6",
    borderRadius: 3,
    height: 5,
    width: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  preview: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 250,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
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
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    boxShadow: "0 -8px 20px rgba(0,0,0,0.2)",
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 10,
    position: "absolute",
    right: 0,
  },
  title: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
});
