import { PloggingMap } from "@/src/shared/map";
import { colors, fontFamilies, shadows } from "@/src/shared/theme";
import {
  ScreenRoot,
  CenterToast,
  useTabBarHeight,
  type PloggingMode,
} from "@/src/shared/ui";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePloggingSession } from "@/src/features/plogging-session";
import { analyzeTrashPhoto } from "@/src/features/plogging-session/services/analyze-trash-photo";
import { capturePloggingPhoto } from "@/src/features/plogging-session/services/capture-plogging-photo";
import {
  getTrashBinTintColor,
  useRestroomToggle,
  useNearbyTrashBins,
} from "@/src/features/public-facilities";
import { useDeviceLocation } from "@/src/shared/location";

// 기본/최소/최대 시간 (분)
const DEFAULT_TIME_MINUTES = 30;
const MIN_TIME_MINUTES = 10;
const MAX_TIME_MINUTES = 120;
const TIME_STEP_MINUTES = 5;
const HEATMAP_LEGEND_TOP_OFFSET = 92;

const homeIcons = {
  ai: require("@/assets/icons/figma-ai-mode.svg"),
  heatmap: require("@/assets/icons/map-control-heatmap.svg"),
  profile: require("@/assets/icons/tab-profile.svg"),
  restroom: require("@/assets/icons/map-control-restroom.svg"),
  together: require("@/assets/icons/crew-session-users.svg"),
  trash: require("@/assets/icons/crew-session-trash.svg"),
} as const;

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PloggingMode>("free");
  const [timeMinutes, setTimeMinutes] = useState(DEFAULT_TIME_MINUTES);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [recenterRequestId, setRecenterRequestId] = useState(0);
  const { position } = useDeviceLocation();
  const {
    setMode: setSessionMode,
    setRecommendedRoutePoints,
  } = usePloggingSession();
  const trashBinsState = useNearbyTrashBins();
  const {
    noNearbyToiletsMessage,
    noNearbyToiletsNoticeVisible,
    restroomVisible,
    toggleRestroom,
    toiletMarkers,
  } = useRestroomToggle();
  const trashBinMarkers =
    trashBinsState.status === "success"
      ? trashBinsState.trashBins.map((bin) => ({
          id: bin.id,
          latitude: bin.latitude,
          longitude: bin.longitude,
          tintColor: getTrashBinTintColor(bin.trashType),
        }))
      : undefined;

  const handleStart = () => {
    // 자유모드는 바로 플로깅 시작하므로 여기서 세션 mode를 확정한다.
    // AI 모드는 ai-route 화면에서 경로 선택 후에 확정된다.
    if (mode === "free") {
      setSessionMode("FREE");
      setRecommendedRoutePoints([]);
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

    setReportSubmitting(true);
    try {
      if (!position) {
        Alert.alert(
          "현재 위치가 필요합니다",
          "쓰레기 제보에는 촬영 위치가 함께 전송됩니다. 위치를 확인한 뒤 다시 시도해주세요.",
        );
        return;
      }

      const consented = await requestTrashAnalysisConsent();
      if (!consented) return;

      const result = await capturePloggingPhoto();
      if (result.status === "canceled") return;
      if (result.status === "permission-denied") return;
      if (result.status === "error") {
        Alert.alert("촬영 실패", result.message);
        return;
      }

      const analysisResult = await analyzeTrashPhoto({
        contentType: result.mimeType,
        fileName: result.fileName,
        latitude: position.latitude,
        localUri: result.uri,
        longitude: position.longitude,
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
  const bottomPanelHeight = mode === "ai" ? 326 : 205;

  return (
    <ScreenRoot>
      <PloggingMap
        heatmapLegendTop={Math.max(insets.top, 44) + HEATMAP_LEGEND_TOP_OFFSET}
        heatmapVisible={heatmapVisible}
        recenterRequestId={recenterRequestId}
        toilets={toiletMarkers}
        trashBins={trashBinMarkers}
      >
        <HomeModeSwitch onChange={setMode} value={mode} />
        <Pressable
          accessibilityHint="마이페이지로 이동합니다"
          accessibilityLabel="마이페이지"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [
            styles.profileButton,
            { top: Math.max(insets.top, 47) + 18 },
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            accessible={false}
            contentFit="contain"
            source={homeIcons.profile}
            style={styles.profileIcon}
          />
        </Pressable>
        <HomeMapControls
          heatmapActive={heatmapVisible}
          onToggleHeatmap={() => setHeatmapVisible((prev) => !prev)}
          onToggleRestroom={toggleRestroom}
          restroomActive={restroomVisible}
          top={Math.max(insets.top, 47) + 146}
        />
        <CenterToast
          message={noNearbyToiletsMessage}
          visible={noNearbyToiletsNoticeVisible}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.bottomPanel,
            { bottom: tabBarHeight, height: bottomPanelHeight },
          ]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
            locations={[0, mode === "ai" ? 0.4 : 0.399]}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />

          <Pressable
            accessibilityLabel="현재 위치로 지도 이동"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRecenterRequestId((value) => value + 1)}
            style={({ pressed }) => [
              styles.recenterPill,
              { top: mode === "ai" ? 0 : 16 },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text selectable style={styles.recenterText}>
              위치로 돌아가기
            </Text>
          </Pressable>

          {mode === "ai" ? (
            <HomeTimeStepper
              max={MAX_TIME_MINUTES}
              min={MIN_TIME_MINUTES}
              onChange={setTimeMinutes}
              step={TIME_STEP_MINUTES}
              value={timeMinutes}
            />
          ) : null}

          <View
            style={[
              styles.actionRow,
              { top: mode === "ai" ? 195 : 97 },
            ]}
          >
            <HomeSideAction
              icon={homeIcons.together}
              iconSize={{ height: 32, width: 32 }}
              label="같이 줍기"
              onPress={() => router.push("/crews")}
            />
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
            <HomeSideAction
              busy={reportSubmitting}
              icon={homeIcons.trash}
              iconSize={{ height: 23, width: 26 }}
              label="쓰레기 제보"
              onPress={handleTrashReport}
            />
          </View>
        </View>
      </PloggingMap>
    </ScreenRoot>
  );
}

function requestTrashAnalysisConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      "사진·위치 전송 동의",
      "쓰레기 제보를 위해 촬영한 사진과 현재 정밀 위치를 플로버 서버로 전송해 쓰레기 여부를 분석합니다. 제보는 선택 사항이며, 동의하지 않아도 다른 기능을 사용할 수 있습니다.",
      [
        {
          onPress: () => settle(false),
          style: "cancel",
          text: "동의하지 않음",
        },
        {
          onPress: () => settle(true),
          text: "동의하고 촬영",
        },
      ],
      {
        cancelable: true,
        onDismiss: () => settle(false),
      },
    );
  });
}

function HomeModeSwitch({
  onChange,
  value,
}: {
  onChange: (value: PloggingMode) => void;
  value: PloggingMode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.modeSwitch, { top: Math.max(insets.top, 47) + 16 }]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: value === "free" }}
        onPress={() => onChange("free")}
        style={[styles.modeOption, value === "free" ? styles.modeSelected : null]}
      >
        <Text style={styles.modeFreeText}>자유모드</Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: value === "ai" }}
        onPress={() => onChange("ai")}
        style={[
          styles.modeOption,
          styles.modeAiOption,
          value === "ai" ? styles.modeSelected : null,
        ]}
      >
        <Image contentFit="contain" source={homeIcons.ai} style={styles.modeAiIcon} />
        <Text style={styles.modeAiText}>AI 경로추천</Text>
      </Pressable>
    </View>
  );
}

function HomeMapControls({
  heatmapActive,
  onToggleHeatmap,
  onToggleRestroom,
  restroomActive,
  top,
}: {
  heatmapActive: boolean;
  onToggleHeatmap: () => void;
  onToggleRestroom: () => void;
  restroomActive: boolean;
  top: number;
}) {
  return (
    <View style={[styles.mapControls, { top }]}>
      {[
        [homeIcons.heatmap, heatmapActive, onToggleHeatmap, "히트맵"],
        [homeIcons.restroom, restroomActive, onToggleRestroom, "화장실"],
      ].map(([icon, active, onPress, label]) => (
        <Pressable
          key={String(label)}
          accessibilityLabel={String(label)}
          accessibilityRole="button"
          accessibilityState={{ selected: Boolean(active) }}
          onPress={onPress as () => void}
          style={({ pressed }) => [
            styles.mapControlButton,
            active ? styles.mapControlButtonActive : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            contentFit="contain"
            source={icon}
            style={styles.mapControlIcon}
            tintColor={active ? colors.surface : null}
          />
        </Pressable>
      ))}
    </View>
  );
}

function HomeTimeStepper({
  max,
  min,
  onChange,
  step,
  value,
}: {
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeLabel}>시간</Text>
      <Text style={styles.timeValue}>{value}분</Text>
      <View style={styles.timeButtons}>
        <Pressable
          accessibilityLabel="시간 늘리기"
          disabled={value >= max}
          hitSlop={6}
          onPress={() => onChange(Math.min(max, value + step))}
          style={styles.timeArrowButton}
        >
          <View style={styles.arrowUp} />
        </Pressable>
        <Pressable
          accessibilityLabel="시간 줄이기"
          disabled={value <= min}
          hitSlop={6}
          onPress={() => onChange(Math.max(min, value - step))}
          style={styles.timeArrowButton}
        >
          <View style={styles.arrowDown} />
        </Pressable>
      </View>
    </View>
  );
}

function HomeSideAction({
  busy = false,
  icon,
  iconSize,
  label,
  onPress,
}: {
  busy?: boolean;
  icon: number;
  iconSize: { height: number; width: number };
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sideAction}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.sideActionButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Image contentFit="contain" source={icon} style={iconSize} />
      </Pressable>
      <Text numberOfLines={1} selectable style={styles.sideActionLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 42,
    position: "absolute",
    right: 42,
  },
  arrowDown: {
    borderLeftColor: "transparent",
    borderLeftWidth: 7,
    borderRightColor: "transparent",
    borderRightWidth: 7,
    borderTopColor: "#0A0A0A",
    borderTopWidth: 8,
  },
  arrowUp: {
    borderBottomColor: "#0A0A0A",
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderLeftWidth: 7,
    borderRightColor: "transparent",
    borderRightWidth: 7,
  },
  bottomPanel: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  mapControlButton: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
    ...shadows.soft,
  },
  mapControlButtonActive: {
    backgroundColor: "#0A0A0A",
  },
  mapControlIcon: {
    height: 24,
    width: 24,
  },
  mapControls: {
    gap: 10,
    position: "absolute",
    right: 24,
  },
  modeAiIcon: {
    height: 16,
    width: 16,
  },
  modeAiOption: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
  },
  modeAiText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  modeFreeText: {
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  modeOption: {
    alignItems: "center",
    borderRadius: 46,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modeSelected: {
    backgroundColor: "#FFFFFF",
    ...shadows.soft,
  },
  modeSwitch: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 46,
    flexDirection: "row",
    gap: 2,
    padding: 4,
    position: "absolute",
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  profileButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: 24,
    width: 48,
    ...shadows.soft,
  },
  profileIcon: {
    height: 24,
    width: 24,
  },
  recenterPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 32,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "absolute",
  },
  recenterText: {
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  sideAction: {
    alignItems: "center",
    gap: 8,
    height: 75,
    width: 52,
  },
  sideActionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
    ...shadows.soft,
  },
  sideActionLabel: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
    textAlign: "center",
    width: 80,
  },
  startButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    width: 88,
    ...shadows.button,
  },
  startButtonPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  startText: {
    color: colors.surface,
    fontFamily: fontFamilies.medium,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  timeArrowButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  timeButtons: {
    gap: 0,
  },
  timeLabel: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    left: 24,
    position: "absolute",
    right: 24,
    top: 109,
  },
  timeValue: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.regular,
    fontSize: 24,
    letterSpacing: 1.68,
  },
});
