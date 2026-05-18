import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme";

export function ScreenRoot({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.screenRoot, style]}>{children}</View>;
}

export function TopInset() {
  const insets = useSafeAreaInsets();

  return <View style={{ height: Math.max(insets.top, 44) }} />;
}

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
