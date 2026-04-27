import { PloggingMap } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  CameraGlyph,
  MapControls,
  ModeSwitch,
  ScreenRoot,
  type PloggingMode,
} from "@/src/shared/ui";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // 추가

// 시작 버튼 + 위/아래 같은 간격(41px)까지는 솔리드, 그 위로는 페이드
const START_BUTTON_HEIGHT = 96;
const FADE_GRADIENT_HEIGHT = 80;

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Safe Area 훅 추가
  const [mode, setMode] = useState<PloggingMode>("ai");

  const handleStart = () => {
    router.push(mode === "ai" ? "/ai-route" : "/plogging");
  };
  // 탭바 실제 높이(navigation.tsx의 PloggingTabBar와 동일 공식)
  const tabBarHeight = Math.max(insets.bottom, 16) + 60;
  // 시안 기준 탭바 위 간격을 그대로 유지(safe-area 기기에서도 동일한 시각 비율)
  const startButtonOffset = 41;
  const reportButtonOffset = 63;
  const reportLabelOffset = 131;

  // 솔리드 흰색 구간: 탭바 위 → 시작 버튼 위쪽으로 같은 간격까지
  const fadeSolidHeight =
    startButtonOffset + START_BUTTON_HEIGHT + startButtonOffset;
  const fadeTotalHeight = fadeSolidHeight + FADE_GRADIENT_HEIGHT;
  const solidStopRatio = FADE_GRADIENT_HEIGHT / fadeTotalHeight;

  return (
    <ScreenRoot>
      <PloggingMap dimmed>
        <ModeSwitch onChange={setMode} value={mode} />
        {/* 우측 맵 컨트롤 버튼들도 노치 아래로 내려줍니다 */}
        <MapControls top={Math.max(insets.top, 44) + 80} />

        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0)",
            "rgba(255, 255, 255, 0.92)",
            "rgba(255, 255, 255, 0.92)",
          ]}
          locations={[0, solidStopRatio, 1]}
          pointerEvents="none"
          style={[
            styles.bottomFade,
            { bottom: tabBarHeight, height: fadeTotalHeight },
          ]}
        />

        <Text
          selectable
          style={[styles.reportLabel, { bottom: tabBarHeight + reportLabelOffset }]}
        >
          쓰레기 제보
        </Text>
        <Pressable
          accessibilityLabel="쓰레기 제보"
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [
            styles.reportButton,
            { bottom: tabBarHeight + reportButtonOffset },
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
            { bottom: tabBarHeight + startButtonOffset },
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
    height: 62,
    justifyContent: "center",
    position: "absolute",
    right: 21,
    width: 62,
  },
  reportLabel: {
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
