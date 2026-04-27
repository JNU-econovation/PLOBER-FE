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

export function RouteSketch({ compact = false, pin = true }: RouteSketchProps) {
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
      {pin ? (
        <View style={styles.pin}>
          <View style={styles.pinInner} />
        </View>
      ) : null}
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
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 8,
    position: "absolute",
  },
  pin: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    left: 204,
    position: "absolute",
    top: 156,
    width: 56,
  },
  pinInner: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
});
