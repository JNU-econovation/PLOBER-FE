import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, shadows } from "../theme";

type FeatherName = ComponentProps<typeof Feather>["name"];
type MapControlIconSource = ComponentProps<typeof Image>["source"];
export type PloggingMode = "free" | "ai";

const mapControlWeatherIcon: MapControlIconSource =
  require("@/assets/icons/map-control-weather.png");
const mapControlRestroomIcon: MapControlIconSource =
  require("@/assets/icons/map-control-restroom.png");

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

export function BackButton({
  onPress,
  style,
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityLabel="뒤로가기"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Feather color="#33363F" name="chevron-left" size={24} />
    </Pressable>
  );
}

export function MapControls({ top = 176 }: { top?: number }) {
  return (
    <View style={[styles.mapControls, { top }]}>
      <FigmaMapControlButton label="날씨" source={mapControlWeatherIcon} />
      <FigmaMapControlButton label="화장실" source={mapControlRestroomIcon} />
    </View>
  );
}

function FigmaMapControlButton({
  label,
  onPress,
  source,
}: {
  label: string;
  onPress?: () => void;
  source: MapControlIconSource;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.figmaIconCircle,
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        contentFit="contain"
        source={source}
        style={styles.figmaMapIcon}
      />
    </Pressable>
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
  // 콘텐츠 시각 영역(텍스트 위/아래 공간)과 safe-area 인셋을 분리해서
  // 모든 기기에서 텍스트가 항상 동일하게 가운데 보이도록 한다.
  const visualPadding = 22;

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      hitSlop={{ top: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBottomButton,
        {
          paddingTop: visualPadding,
          paddingBottom: visualPadding + insets.bottom,
        },
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
  backButton: ViewStyle;
  figmaIconCircle: ViewStyle;
  figmaMapIcon: ImageStyle;
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
  figmaIconCircle: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
    ...shadows.soft,
  },
  figmaMapIcon: {
    height: 24,
    width: 24,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
    boxShadow: "0 0 21.2px rgba(0, 0, 0, 0.07)",
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
    left: 0,
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
