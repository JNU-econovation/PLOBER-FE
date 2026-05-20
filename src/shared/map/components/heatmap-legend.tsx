import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, shadows } from "../../theme";

export function HeatmapLegend({ top }: { top?: number }) {
  return (
    <View pointerEvents="none" style={[styles.legend, { top: top ?? 176 }]}>
      <Text selectable style={styles.title}>
        쓰레기 발생률
      </Text>
      <LinearGradient
        colors={["#F6E284", "#F59E0B", "#C75A3D"]}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={styles.gradient}
      />
      <View style={styles.labelRow}>
        <Text selectable style={styles.label}>
          낮음
        </Text>
        <Text selectable style={styles.label}>
          높음
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(196, 196, 196, 0.70)",
    borderRadius: 12,
    borderWidth: 1.5,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    width: 120,
    ...shadows.soft,
  },
  gradient: {
    borderRadius: 22,
    height: 8,
    marginTop: 12,
    width: 96,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    letterSpacing: 0,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7,
    width: 96,
  },
  title: {
    color: "#404040",
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
});
