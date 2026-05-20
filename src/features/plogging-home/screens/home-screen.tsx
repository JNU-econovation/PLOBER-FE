import { PloggingMap } from "@/src/shared/map";
import { colors, shadows } from "@/src/shared/theme";
import {
  CameraGlyph,
  MapControls,
  ModeSwitch,
  ScreenRoot,
  TimeStepper,
  useTabBarHeight,
  type PloggingMode,
} from "@/src/shared/ui";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePloggingSession } from "@/src/features/plogging-session";
import { analyzeTrashPhoto } from "@/src/features/plogging-session/services/analyze-trash-photo";
import { capturePloggingPhoto } from "@/src/features/plogging-session/services/capture-plogging-photo";
import {
  getToiletTintColor,
  getTrashBinTintColor,
  useNearbyToilets,
  useNearbyTrashBins,
} from "@/src/features/public-facilities";
import { useDeviceLocation } from "@/src/shared/location";

// 시작 버튼 + 위/아래 같은 간격(41px)까지는 솔리드, 그 위로는 페이드
const START_BUTTON_HEIGHT = 96;
const FADE_GRADIENT_HEIGHT = 80;

// AI 모드 시간 설정 영역 관련 상수
const TIME_SETTING_HEIGHT = 92; // "플로깅 설정" 라벨 + TimeStepper + 위아래 여백
const TIME_SETTING_GAP_TO_START = 14; // TimeStepper 하단과 시작 버튼 상단 사이 간격

// 기본/최소/최대 시간 (분)
const DEFAULT_TIME_MINUTES = 30;
const MIN_TIME_MINUTES = 10;
const MAX_TIME_MINUTES = 120;
const TIME_STEP_MINUTES = 5;

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PloggingMode>("ai");
  const [timeMinutes, setTimeMinutes] = useState<number>(DEFAULT_TIME_MINUTES);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [restroomVisible, setRestroomVisible] = useState(false);
  const { position } = useDeviceLocation();
  const { setMode: setSessionMode } = usePloggingSession();
  const trashBinsState = useNearbyTrashBins();
  const toiletsState = useNearbyToilets({ enabled: restroomVisible });
  const trashBinMarkers =
    trashBinsState.status === "success"
      ? trashBinsState.trashBins.map((bin) => ({
          id: bin.id,
          latitude: bin.latitude,
          longitude: bin.longitude,
          tintColor: getTrashBinTintColor(bin.trashType),
        }))
      : undefined;
  const toiletMarkers =
    restroomVisible && toiletsState.status === "success"
      ? toiletsState.toilets.map((toilet) => ({
          id: toilet.id,
          latitude: toilet.latitude,
          longitude: toilet.longitude,
          tintColor: getToiletTintColor(toilet.openTimeType),
        }))
      : undefined;

  const handleStart = () => {
    // 자유모드는 바로 플로깅 시작하므로 여기서 세션 mode를 확정한다.
    // AI 모드는 ai-route 화면에서 경로 선택 후에 확정된다.
    if (mode === "free") {
      setSessionMode("FREE");
      router.push("/plogging");
      return;
    }

    // AI 모드: 추후 이슈에서 lat/lon/time/mode 파라미터를 ai-route에 전달하도록 확장한다.
    // 현재는 시간만 params로 임시 전달한다. (lat/lon은 ai-route에서 GPS로 직접 가져온다)
    router.push({
      pathname: "/ai-route",
      params: { time: String(timeMinutes) },
    });
  };

  const handleTrashReport = async () => {
    if (reportSubmitting) return;

    const result = await capturePloggingPhoto();
    if (result.status !== "captured") return;

    setReportSubmitting(true);
    try {
      const analysisResult = await analyzeTrashPhoto({
        contentType: result.mimeType,
        fileName: result.fileName,
        latitude: position?.latitude,
        localUri: result.uri,
        longitude: position?.longitude,
      });

      if (analysisResult.status === "accepted") {
        Alert.alert("제보 완료", "쓰레기 사진 제보가 접수되었습니다.");
        return;
      }

      Alert.alert("제보 실패", analysisResult.message);
    } finally {
      setReportSubmitting(false);
    }
  };

  const tabBarHeight = useTabBarHeight();
  // 시안 기준 탭바 위 간격
  const startButtonOffset = 41;
  const reportButtonOffset = 63;
  const reportLabelOffset = 131;

  // 솔리드 흰색 구간: 탭바 위 → 시작 버튼 위쪽으로 같은 간격까지
  // AI 모드일 때는 시간 설정 영역만큼 위로 더 확장한다.
  const baseSolidHeight =
    startButtonOffset + START_BUTTON_HEIGHT + startButtonOffset;
  const fadeSolidHeight =
    mode === "ai"
      ? baseSolidHeight + TIME_SETTING_HEIGHT + TIME_SETTING_GAP_TO_START
      : baseSolidHeight;
  const fadeTotalHeight = fadeSolidHeight + FADE_GRADIENT_HEIGHT;
  const solidStopRatio = FADE_GRADIENT_HEIGHT / fadeTotalHeight;

  // 시간 설정 영역 bottom 위치: 시작 버튼 위쪽 + 시작 버튼과 시간 설정 영역 사이 간격
  const timeSettingBottom =
    tabBarHeight +
    startButtonOffset +
    START_BUTTON_HEIGHT +
    TIME_SETTING_GAP_TO_START;

  return (
    <ScreenRoot>
      <PloggingMap dimmed toilets={toiletMarkers} trashBins={trashBinMarkers}>
        <ModeSwitch onChange={setMode} value={mode} />
        <MapControls
          onToggleRestroom={() => setRestroomVisible((prev) => !prev)}
          restroomActive={restroomVisible}
          top={Math.max(insets.top, 44) + 80}
        />

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

        {mode === "ai" ? (
          <View
            pointerEvents="box-none"
            style={[styles.timeSettingBlock, { bottom: timeSettingBottom }]}
          >
            <Text selectable style={styles.timeSettingTitle}>
              플로깅 설정
            </Text>
            <TimeStepper
              max={MAX_TIME_MINUTES}
              min={MIN_TIME_MINUTES}
              onChange={setTimeMinutes}
              step={TIME_STEP_MINUTES}
              value={timeMinutes}
            />
          </View>
        ) : null}

        <Text
          selectable
          style={[styles.reportLabel, { bottom: tabBarHeight + reportLabelOffset }]}
        >
          쓰레기 제보
        </Text>
        <Pressable
          accessibilityLabel={reportSubmitting ? "쓰레기 제보 중" : "쓰레기 제보"}
          accessibilityRole="button"
          accessibilityState={{ busy: reportSubmitting }}
          hitSlop={8}
          onPress={handleTrashReport}
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
  timeSettingBlock: {
    alignItems: "center",
    gap: 12,
    left: 0,
    position: "absolute",
    right: 0,
  },
  timeSettingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0,
  },
});
