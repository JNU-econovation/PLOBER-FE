import { StyleSheet, View } from "react-native";

import { colors } from "../../theme";

type RouteSketchProps = {
  compact?: boolean;
  pin?: boolean;
};

const segments = [
  { width: 86, left: 42, top: 212, rotate: "0deg" },
  { width: 80, left: 18, top: 168, rotate: "-86deg" },
  { width: 70, left: 46, top: 126, rotate: "-8deg" },
  { width: 66, left: 84, top: 98, rotate: "-42deg" },
  { width: 72, left: 128, top: 84, rotate: "-8deg" },
  { width: 58, left: 182, top: 106, rotate: "72deg" },
  { width: 70, left: 174, top: 156, rotate: "4deg" },
  { width: 68, left: 152, top: 184, rotate: "45deg" },
  { width: 72, left: 96, top: 218, rotate: "6deg" },
] as const;

const arrowMarkers = [
  { left: 54, top: 212, rotate: "0deg" },
  { left: 88, top: 212, rotate: "0deg" },
  { left: 58, top: 160, rotate: "-86deg" },
  { left: 66, top: 132, rotate: "-8deg" },
  { left: 106, top: 101, rotate: "-42deg" },
  { left: 150, top: 84, rotate: "-8deg" },
  { left: 188, top: 121, rotate: "72deg" },
  { left: 190, top: 158, rotate: "4deg" },
  { left: 162, top: 196, rotate: "45deg" },
  { left: 110, top: 218, rotate: "6deg" },
  { left: 140, top: 220, rotate: "6deg" },
] as const;

export function RouteSketch({ compact = false }: RouteSketchProps) {
  return (
    <View style={[styles.container, compact ? styles.compact : null]}>
      {segments.map((segment, index) => (
        <View
          key={`${segment.left}-${segment.top}-${index}`}
          style={[
            styles.segment,
            {
              left: segment.left,
              top: segment.top,
              transform: [{ rotate: segment.rotate }],
              width: segment.width,
            },
          ]}
        />
      ))}
      {arrowMarkers.map((marker, index) => (
        <View
          key={`${marker.left}-${marker.top}-${index}`}
          style={[
            styles.arrowMarker,
            {
              left: marker.left,
              top: marker.top,
              transform: [{ rotate: marker.rotate }],
            },
          ]}
        >
          <View style={styles.arrowHead} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    pointerEvents: "none",
    width: 300,
  },
  compact: {
    transform: [{ scale: 0.92 }],
  },
  segment: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    height: 9,
    position: "absolute",
  },
  arrowHead: {
    borderBottomColor: colors.surface,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderLeftWidth: 4,
    borderRightColor: "transparent",
    borderRightWidth: 4,
    height: 0,
    width: 0,
  },
  arrowMarker: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 16,
    justifyContent: "center",
    opacity: 0.92,
    position: "absolute",
    width: 16,
  },
});
