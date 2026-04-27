import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows } from "../theme";

type FeatherName = ComponentProps<typeof Feather>["name"];
export type PloggingMode = "free" | "ai";

export function IconCircleButton({
  name,
  label,
  onPress,
  size = 46,
  iconSize = 24,
  danger = false,
  style,
}: {
  name: FeatherName;
  label: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconCircle,
        { height: size, width: size, borderRadius: size / 2 },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Feather
        color={danger ? colors.danger : colors.icon}
        name={name}
        size={iconSize}
      />
    </Pressable>
  );
}

export function MapControls({ top = 176 }: { top?: number }) {
  return (
    <View style={[styles.mapControls, { top }]}>
      <IconCircleButton label="날씨" name="sun" />
      <IconCircleButton label="쓰레기통" name="trash-2" />
    </View>
  );
}

export function PrimaryBottomButton({
  title,
  onPress,
  style,
}: {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      hitSlop={{ top: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBottomButton,
        { paddingBottom: Math.max(insets.bottom, 30) },
        pressed ? styles.primaryPressed : null,
        style,
      ]}
    >
      <Text selectable style={styles.primaryBottomText}>
        {title}
      </Text>
    </Pressable>
  );
}

export function ModeSwitch({
  value,
  onChange,
}: {
  value: PloggingMode;
  onChange: (value: PloggingMode) => void;
}) {
  const insets = useSafeAreaInsets(); // Safe Area 훅 추가
  return (
    <View 
      accessibilityRole="tablist" 
      style={[
        styles.modeSwitch,
        // 기기별 상단 노치 영역을 계산하여 top 위치 동적 설정
        { top: Math.max(insets.top, 44) + 16 } 
      ]}
    >
      <ModeOption
        label="자유모드"
        selected={value === "free"}
        onPress={() => onChange("free")}
      />
      <ModeOption
        label="AI 경로 추천"
        selected={value === "ai"}
        onPress={() => onChange("ai")}
      />
    </View>
  );
}

function ModeOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeOption,
        selected ? styles.modeOptionActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text selectable style={styles.modeText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create<{
  iconCircle: ViewStyle;
  pressed: ViewStyle;
  mapControls: ViewStyle;
  primaryBottomButton: ViewStyle;
  primaryPressed: ViewStyle;
  primaryBottomText: TextStyle;
  modeSwitch: ViewStyle;
  modeOption: ViewStyle;
  modeOptionActive: ViewStyle;
  modeText: TextStyle;
}>({
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.surface,
    justifyContent: "center",
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  mapControls: {
    gap: 12,
    position: "absolute",
    right: 27,
  },
  primaryBottomButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    bottom: 0,
    justifyContent: "center",
    left: 0,
    minHeight: 98,
    paddingTop: 10,
    position: "absolute",
    right: 0,
    ...shadows.button,
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryBottomText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 0,
  },
  modeSwitch: {
    alignSelf: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 46,
    flexDirection: "row",
    gap: 4,
    padding: 4,
    position: "absolute",
    top: 85,
    ...shadows.soft,
  },
  modeOption: {
    alignItems: "center",
    borderRadius: 42,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 23,
  },
  modeOptionActive: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  modeText: {
    color: colors.text,
    fontSize: 16,
    letterSpacing: 0,
  },
});
