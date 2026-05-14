import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";

const DEFAULT_TOP_MIN = 44;
const DEFAULT_BOTTOM_MIN = 24;

export function ScreenRoot({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.screenRoot, style]}>{children}</View>;
}

// 상단 SafeArea를 최소값(min)과 비교해 보장한다.
// 노치/펀치홀이 없는 기기에서도 status bar 영역을 침범하지 않도록 폴백을 둔다.
export function useSafeTopInset(min: number = DEFAULT_TOP_MIN): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.top, min);
}

export function useSafeBottomInset(min: number = DEFAULT_BOTTOM_MIN): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, min);
}

export function TopInset() {
  const top = useSafeTopInset();
  return <View style={{ height: top }} />;
}

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
