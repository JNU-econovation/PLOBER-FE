import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PloggingMap } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  CameraGlyph,
  MapControls,
  ModeSwitch,
  ScreenRoot,
  type PloggingMode,
} from "@/src/shared/ui";

export function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<PloggingMode>("ai");

  const handleStart = () => {
    router.push(mode === "ai" ? "/ai-route" : "/plogging");
  };

  return (
    <ScreenRoot>
      <PloggingMap dimmed>
        <ModeSwitch onChange={setMode} value={mode} />
        <MapControls top={176} />
        <View style={styles.bottomFade} />
        <Text selectable style={styles.reportLabel}>
          쓰레기 제보
        </Text>
        <Pressable
          accessibilityLabel="쓰레기 제보"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.reportButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <CameraGlyph light />
        </Pressable>
        <Pressable
          accessibilityLabel="플로깅 시작"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startButton,
            pressed ? styles.startButtonPressed : null,
          ]}
        >
          <Text selectable style={styles.startText}>
            시작
          </Text>
        </Pressable>
      </PloggingMap>
    </ScreenRoot>
  );
}

const styles = StyleSheet.create({
  bottomFade: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    bottom: 83,
    height: 234,
    left: 0,
    pointerEvents: "none",
    position: "absolute",
    right: 0,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  reportButton: {
    alignItems: "center",
    bottom: 146,
    height: 62,
    justifyContent: "center",
    position: "absolute",
    right: 21,
    width: 62,
  },
  reportLabel: {
    bottom: 214,
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
    position: "absolute",
    right: 27,
  },
  startButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 48,
    bottom: 124,
    height: 96,
    justifyContent: "center",
    position: "absolute",
    width: 96,
    ...shadows.button,
  },
  startButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  startText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: 0,
  },
});
