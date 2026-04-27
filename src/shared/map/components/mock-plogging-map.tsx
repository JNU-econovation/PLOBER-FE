import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

import { MOCK_MAP_LABELS } from "../data/map-data";
import { colors } from "../../theme";
import { RouteSketch } from "./route-sketch";
import type { PloggingMapProps } from "./types";

export function MockPloggingMap({
  children,
  routeVisible = false,
  dimmed = false,
  style,
}: PloggingMapProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapBase}>
        <View style={[styles.road, styles.roadOne]} />
        <View style={[styles.road, styles.roadTwo]} />
        <View style={[styles.road, styles.roadThree]} />
        <View style={[styles.park, styles.parkOne]} />
        <View style={[styles.park, styles.parkTwo]} />
        <View style={styles.water} />
        {MOCK_MAP_LABELS.map((label) => (
          <Text
            key={label.text}
            selectable
            style={[styles.mapLabel, { left: label.left, top: label.top }]}
          >
            {label.text}
          </Text>
        ))}
        <View style={styles.currentDot} />
      </View>
      {routeVisible ? (
        <View style={styles.routeLayer}>
          <RouteSketch compact />
        </View>
      ) : null}
      {dimmed ? <View style={styles.dimmed} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
  mapBase: ViewStyle;
  road: ViewStyle;
  roadOne: ViewStyle;
  roadTwo: ViewStyle;
  roadThree: ViewStyle;
  park: ViewStyle;
  parkOne: ViewStyle;
  parkTwo: ViewStyle;
  water: ViewStyle;
  currentDot: ViewStyle;
  mapLabel: TextStyle;
  routeLayer: ViewStyle;
  dimmed: ViewStyle;
}>({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  mapBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F5EA",
  },
  road: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E1D8",
    borderWidth: 1,
    height: 28,
    opacity: 0.88,
    position: "absolute",
    width: "120%",
  },
  roadOne: {
    left: "-10%",
    top: "24%",
    transform: [{ rotate: "-4deg" }],
  },
  roadTwo: {
    left: "-8%",
    top: "48%",
    transform: [{ rotate: "24deg" }],
  },
  roadThree: {
    left: "-12%",
    top: "70%",
    transform: [{ rotate: "-28deg" }],
  },
  park: {
    backgroundColor: "#BCEBAD",
    borderRadius: 10,
    opacity: 0.88,
    position: "absolute",
  },
  parkOne: {
    height: 72,
    right: 58,
    top: "41%",
    transform: [{ rotate: "-14deg" }],
    width: 96,
  },
  parkTwo: {
    bottom: 72,
    height: 46,
    left: 132,
    width: 72,
  },
  water: {
    backgroundColor: "#9EE9F8",
    borderRadius: 16,
    bottom: 58,
    height: 74,
    position: "absolute",
    right: 24,
    width: 92,
  },
  currentDot: {
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 11,
    borderWidth: 4,
    height: 22,
    left: "48%",
    position: "absolute",
    top: "41%",
    width: 22,
  },
  mapLabel: {
    color: "#A2785C",
    fontSize: 15,
    fontWeight: "700",
    opacity: 0.72,
    position: "absolute",
  },
  routeLayer: {
    height: 300,
    left: 34,
    pointerEvents: "none",
    position: "absolute",
    top: "30%",
    width: 300,
  },
  dimmed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.50)",
    pointerEvents: "none",
  },
});
