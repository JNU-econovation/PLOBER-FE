import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { colors, typography } from "../theme";

export function StatNumber({
  value,
  unit,
  size = 24,
  numberOfLines,
}: {
  value: string;
  unit?: string;
  size?: number;
  numberOfLines?: number;
}) {
  return (
    <Text
      selectable
      adjustsFontSizeToFit={numberOfLines === 1}
      minimumFontScale={0.7}
      numberOfLines={numberOfLines}
      style={[styles.statNumber, { fontSize: size }]}
    >
      {value}
      {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
    </Text>
  );
}

export function DecorativeLeafFace() {
  return (
    <View style={styles.faceTile}>
      <View style={[styles.faceLeaf, styles.faceLeafOne]} />
      <View style={[styles.faceLeaf, styles.faceLeafTwo]} />
      <View style={styles.face}>
        <Text style={styles.faceText}>{">  ·"}</Text>
      </View>
    </View>
  );
}

export function MiniGlyph({
  color,
  background,
}: {
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.miniGlyphWrap, { backgroundColor: background }]}>
      <View style={[styles.miniGlyph, { backgroundColor: color }]} />
    </View>
  );
}

export function CameraGlyph({ light = false }: { light?: boolean }) {
  return (
    <View style={[styles.cameraGlyph, light ? styles.cameraGlyphLight : null]}>
      <Feather color={light ? colors.surface : colors.icon} name="camera" size={22} />
    </View>
  );
}

export function LevelBadge() {
  return (
    <View style={styles.levelBadge}>
      <Text selectable style={styles.levelBadgeText}>
        Lv.7
      </Text>
    </View>
  );
}

export function RoutePin({ large = false }: { large?: boolean }) {
  return (
    <View style={[styles.routePin, large ? styles.routePinLarge : null]}>
      <View style={[styles.routePinHole, large ? styles.routePinHoleLarge : null]} />
    </View>
  );
}

export function PauseGlyph() {
  return <MaterialCommunityIcons color={colors.icon} name="pause" size={18} />;
}

export function PlayGlyph() {
  return <MaterialCommunityIcons color={colors.icon} name="play" size={18} />;
}

const styles = StyleSheet.create<{
  statNumber: TextStyle;
  statUnit: TextStyle;
  faceTile: ViewStyle;
  faceLeaf: ViewStyle;
  faceLeafOne: ViewStyle;
  faceLeafTwo: ViewStyle;
  face: ViewStyle;
  faceText: TextStyle;
  miniGlyphWrap: ViewStyle;
  miniGlyph: ViewStyle;
  cameraGlyph: ViewStyle;
  cameraGlyphLight: ViewStyle;
  levelBadge: ViewStyle;
  levelBadgeText: TextStyle;
  routePin: ViewStyle;
  routePinLarge: ViewStyle;
  routePinHole: ViewStyle;
  routePinHoleLarge: ViewStyle;
}>({
  statNumber: {
    color: colors.text,
    fontWeight: "800",
    letterSpacing: 0,
    ...typography.number,
  },
  statUnit: {
    color: "#616161",
    fontSize: 12,
    fontWeight: "500",
  },
  faceTile: {
    alignItems: "center",
    backgroundColor: "#F7FFD8",
    borderRadius: 16,
    height: 74,
    justifyContent: "center",
    overflow: "hidden",
    width: 74,
  },
  faceLeaf: {
    backgroundColor: "#CFFB88",
    height: 38,
    position: "absolute",
    top: 10,
    width: 42,
  },
  faceLeafOne: {
    borderBottomLeftRadius: 24,
    borderTopRightRadius: 24,
    left: 5,
    transform: [{ rotate: "-22deg" }],
  },
  faceLeafTwo: {
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 24,
    right: 5,
    transform: [{ rotate: "24deg" }],
  },
  face: {
    alignItems: "center",
    backgroundColor: "#F2FFD0",
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    marginTop: 12,
    width: 58,
  },
  faceText: {
    color: colors.icon,
    fontSize: 18,
    fontWeight: "700",
    transform: [{ rotate: "7deg" }],
  },
  miniGlyphWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 45,
    justifyContent: "center",
    width: 45,
  },
  miniGlyph: {
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    height: 19,
    width: 19,
  },
  cameraGlyph: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 26,
    height: 51,
    justifyContent: "center",
    width: 51,
  },
  cameraGlyphLight: {
    backgroundColor: colors.icon,
  },
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#57AE71",
    borderRadius: 17,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  levelBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "600",
  },
  routePin: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  routePinLarge: {
    borderRadius: 42,
    height: 84,
    width: 84,
  },
  routePinHole: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  routePinHoleLarge: {
    borderRadius: 16,
    height: 32,
    width: 32,
  },
});
