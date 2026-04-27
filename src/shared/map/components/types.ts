import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type PloggingMapProps = PropsWithChildren<{
  routeVisible?: boolean;
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Used by the native Naver map implementation. Mock maps keep the prop for
   * API compatibility but intentionally ignore it.
   */
  zoom?: number;
}>;
