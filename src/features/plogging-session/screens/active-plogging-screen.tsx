import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // 🌟 추가
import { useAuthSession } from "@/src/features/auth";
import { useRestroomToggle } from "@/src/features/public-facilities";
import { useDeviceLocation } from "@/src/shared/location";
import { PloggingMap } from "@/src/shared/map";
import { colors, shadows, typography } from "@/src/shared/theme";
import {
  CameraGlyph,
  CenterToast,
  MapControls,
  PauseGlyph,
  PlayGlyph,
  ScreenRoot,
} from "@/src/shared/ui";

import { usePloggingSession } from "../hooks/use-plogging-session";
import { usePloggingTimer } from "../hooks/use-plogging-timer";
import { usePloggingTracker } from "../hooks/use-plogging-tracker";
import { analyzeTrashPhoto } from "../services/analyze-trash-photo";
import { capturePloggingPhoto } from "../services/capture-plogging-photo";
import { stopPloggingBackgroundLocation } from "../services/plogging-background-location";
import {
  isBackgroundPloggingSnapshotForSession,
  readBackgroundPloggingSnapshot,
} from "../services/plogging-background-store";
import {
  endPloggingLiveActivity,
  startPloggingLiveActivity,
  updatePloggingLiveActivity,
  type PloggingLiveActivityPayload,
} from "../services/plogging-live-activity";
import { uploadPloggingPhoto } from "../services/upload-plogging-photo";

type LiveStat = { label: string; unit: string; value: string };
type RouteLikePoint = { latitude: number; longitude: number };

const HEATMAP_LEGEND_TOP_OFFSET = 168;
const TIMER_CARD_ACTIVE_TOP_OFFSET = 18;
const TIMER_CARD_PAUSED_CONTENT_HEIGHT = 150;
const MAP_CONTROLS_ACTIVE_TOP_OFFSET = 167;
const MAP_CONTROLS_CARD_GAP = 18;
const LIVE_ACTIVITY_UPDATE_INTERVAL_MS = 5_000;
const SNAPSHOT_ROUTE_POINT_MATCH_THRESHOLD_METERS = 2.5;

export function ActivePloggingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 🌟 Safe Area 훅 추가
  const { session } = useAuthSession();
  const timer = usePloggingTimer();
  const liveActivityPayloadRef = useRef<PloggingLiveActivityPayload | null>(
    null
  );
  const liveActivityStartedRef = useRef(false);
  const lastLiveActivityPausedRef = useRef(timer.isPaused);
  const lastLiveActivityUpdateAtRef = useRef(0);
  const endingRef = useRef(false);
  const { position } = useDeviceLocation();
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const safeTop = Math.max(insets.top, 44);
  const pausedTimerCardHeight = safeTop + TIMER_CARD_PAUSED_CONTENT_HEIGHT;
  const pausedMapControlsTop = pausedTimerCardHeight + MAP_CONTROLS_CARD_GAP;
  const pauseTransition = usePauseTransition(timer.isPaused);
  const mapControlsTop = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [
      safeTop + MAP_CONTROLS_ACTIVE_TOP_OFFSET,
      pausedMapControlsTop,
    ],
  });
  const {
    noNearbyToiletsMessage,
    noNearbyToiletsNoticeVisible,
    restroomVisible,
    toggleRestroom,
    toiletMarkers,
  } = useRestroomToggle();
  const {
    addPhoto,
    addPhotoObjectUrl,
    appendRoutePoints,
    caloriesBurned,
    distanceMeters,
    finishSession,
    mode,
    photoUris,
    recommendedRoutePoints,
    resetSession,
    routePoints,
    startSession,
    stepCount,
  } = usePloggingSession();
  const visibleRoutePoints = !sessionReady
    ? []
    : mode === "RECOMMENDED" && recommendedRoutePoints.length >= 2
      ? recommendedRoutePoints
      : routePoints;
  const modeLabel = mode === "RECOMMENDED" ? "AI 추천" : "자유모드";

  // 새 세션 시작 시 이전 세션의 누적 데이터(사진/좌표/걸음 등)를 비운다.
  // 사용자가 /report 까지 갔다가 뒤로 와서 새로 시작하는 경우에도 같은 화면이 다시 mount 되므로 안전하다.
  // reset 직후 시작 시각을 즉시 고정한다.
  useEffect(() => {
    resetSession({ preserveRecommendedRoute: true });
    startSession();
    setSessionReady(true);
  }, [resetSession, startSession]);

  // GPS는 백그라운드 위치 태스크를 우선 사용하고, 실행 환경이 막으면 foreground 구독으로 폴백한다.
  // 만보기는 foreground 구독 + iOS 백그라운드 복귀 보정으로 누적한다.
  const tracker = usePloggingTracker({
    isPaused: timer.isPaused,
    startedAtMs: timer.startedAt,
  });

  const handleCapturePhoto = async () => {
    const result = await capturePloggingPhoto();
    if (result.status !== "captured") return;

    addPhoto(result.uri);

    // 백그라운드로 S3 업로드. 사용자 동선은 막지 않고, 실패해도 다음 사진에 영향 없음.
    void (async () => {
      const uploadPromise = session?.userId
        ? uploadPloggingPhoto(
            result.uri,
            session.userId,
            toPhotoUploadContentType(result.mimeType)
          )
        : Promise.resolve({
            status: "error" as const,
            message: "로그인 정보가 없어 인증샷 업로드를 건너뜁니다.",
          });
      const [uploadResult, analysisResult] = await Promise.all([
        uploadPromise,
        analyzeTrashPhoto({
          contentType: result.mimeType,
          fileName: result.fileName,
          latitude: position?.latitude,
          localUri: result.uri,
          longitude: position?.longitude,
        }),
      ]);
      if (uploadResult.status === "uploaded") {
        addPhotoObjectUrl(result.uri, uploadResult.objectUrl);
      }
      if (__DEV__ && analysisResult.status === "accepted") {
        console.log("[trash-photo-analysis] accepted");
      }
    })();
  };

  const liveStats = useMemo<LiveStat[]>(
    () => [
      { label: "거리", unit: "km", value: formatKilometers(distanceMeters) },
      { label: "걸음", unit: "보", value: formatInteger(stepCount) },
      { label: "소모", unit: "kcal", value: formatInteger(caloriesBurned) },
    ],
    [caloriesBurned, distanceMeters, stepCount]
  );

  const liveActivityPayload = useMemo<PloggingLiveActivityPayload>(
    () => ({
      calories: caloriesBurned,
      distanceMeters,
      elapsedSeconds: Math.floor(timer.elapsedMs / 1000),
      isPaused: timer.isPaused,
      modeLabel,
      stepCount,
    }),
    [
      caloriesBurned,
      distanceMeters,
      modeLabel,
      stepCount,
      timer.elapsedMs,
      timer.isPaused,
    ]
  );

  useEffect(() => {
    liveActivityPayloadRef.current = liveActivityPayload;

    const now = Date.now();
    const pauseChanged =
      lastLiveActivityPausedRef.current !== liveActivityPayload.isPaused;
    const shouldUpdate =
      now - lastLiveActivityUpdateAtRef.current >=
        LIVE_ACTIVITY_UPDATE_INTERVAL_MS || pauseChanged;

    if (!liveActivityStartedRef.current) {
      liveActivityStartedRef.current = true;
      lastLiveActivityPausedRef.current = liveActivityPayload.isPaused;
      lastLiveActivityUpdateAtRef.current = now;
      void startPloggingLiveActivity(liveActivityPayload);
      return;
    }

    if (!shouldUpdate) return;

    lastLiveActivityPausedRef.current = liveActivityPayload.isPaused;
    lastLiveActivityUpdateAtRef.current = now;
    void updatePloggingLiveActivity(liveActivityPayload);
  }, [liveActivityPayload]);

  useEffect(() => {
    return () => {
      const payload = liveActivityPayloadRef.current;
      if (payload) {
        void endPloggingLiveActivity(payload);
      }
    };
  }, []);

  const handleEndPlogging = async () => {
    if (endingRef.current) return;
    endingRef.current = true;

    const backgroundSessionId = String(timer.startedAt);
    const snapshotPoints = await readBackgroundPloggingSnapshot()
      .then((snapshot) => {
        if (
          !isBackgroundPloggingSnapshotForSession(
            snapshot,
            backgroundSessionId
          )
        ) {
          return [];
        }

        return snapshot.routePoints.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));
      })
      .catch(() => []);
    const pendingSnapshotPoints = getPendingSnapshotRoutePoints(
      routePoints,
      snapshotPoints
    );
    const completedRoutePoints =
      pendingSnapshotPoints.length > 0
        ? [...routePoints, ...pendingSnapshotPoints]
        : routePoints;

    if (pendingSnapshotPoints.length > 0) {
      appendRoutePoints(pendingSnapshotPoints);
    }

    await stopPloggingBackgroundLocation();
    void endPloggingLiveActivity(liveActivityPayload);

    if (completedRoutePoints.length === 0) {
      resetSession();
      router.replace("/");
      Alert.alert(
        "플로깅 취소",
        "경로 정보가 없어 이번 플로깅은 기록하지 않았습니다."
      );
      return;
    }

    // 종료 시점에 timer가 가진 누적 휴식 시간을 세션 컨텍스트로 옮긴다.
    // (timer는 화면 unmount 시 사라지므로 report에서 다시 못 읽음)
    const totalElapsedMs = Date.now() - timer.startedAt;
    const restMs = Math.max(0, totalElapsedMs - timer.elapsedMs);
    const restSeconds = Math.floor(restMs / 1000);
    finishSession(restSeconds);
    router.replace("/report");
  };

  return (
    <ScreenRoot>
      <PloggingMap
        dimmed
        heatmapLegendTop={
          safeTop +
          (timer.isPaused
            ? TIMER_CARD_PAUSED_CONTENT_HEIGHT + MAP_CONTROLS_CARD_GAP
            : HEATMAP_LEGEND_TOP_OFFSET)
        }
        heatmapVisible={heatmapVisible}
        routePoints={visibleRoutePoints}
        routeVisible={visibleRoutePoints.length >= 2}
        toilets={toiletMarkers}
        zoom={17}
      >
        {/* 상단 노치 영역을 고려하여 top 위치 동적 할당 */}
        <PloggingTimerCard
          formattedElapsed={timer.formatted}
          modeLabel={modeLabel}
          pauseTransition={pauseTransition}
          paused={timer.isPaused}
          restFormatted={timer.restFormatted}
          stats={liveStats}
          activeTop={safeTop + TIMER_CARD_ACTIVE_TOP_OFFSET}
          pausedHeight={pausedTimerCardHeight}
          pausedTop={0}
          trackingStatusLabel={getTrackingStatusLabel(
            tracker.backgroundTracking
          )}
        />
        {/* 상단 카드 높이에 맞춰 지도 컨트롤도 함께 내려간다. */}
        <Animated.View
          style={[styles.mapControlsMotion, { top: mapControlsTop }]}
        >
          <MapControls
            heatmapActive={heatmapVisible}
            onToggleHeatmap={() => setHeatmapVisible((prev) => !prev)}
            onToggleRestroom={toggleRestroom}
            restroomActive={restroomVisible}
            top={0}
          />
        </Animated.View>
        <CenterToast
          message={noNearbyToiletsMessage}
          visible={noNearbyToiletsNoticeVisible}
        />
        {/* 하단 제스처 바 영역을 고려하여 bottom 위치 동적 할당 */}
        <ActionDock
          bottom={Math.max(insets.bottom, 24) + 24}
          isPaused={timer.isPaused}
          onCapturePhoto={handleCapturePhoto}
          onEnd={() => {
            void handleEndPlogging();
          }}
          onTogglePause={timer.toggle}
          pauseTransition={pauseTransition}
          pausedHeight={Math.max(98, Math.max(insets.bottom, 24) + 64)}
          photoCount={photoUris.length}
        />
      </PloggingMap>
    </ScreenRoot>
  );
}

function usePauseTransition(isPaused: boolean) {
  const transition = useRef(new Animated.Value(isPaused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(transition, {
      duration: 340,
      easing: Easing.out(Easing.cubic),
      toValue: isPaused ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isPaused, transition]);

  return transition;
}

function formatKilometers(meters: number): string {
  return (meters / 1000).toFixed(2);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function toPhotoUploadContentType(contentType: string) {
  if (
    contentType === "image/jpeg" ||
    contentType === "image/png" ||
    contentType === "image/webp" ||
    contentType === "image/heic" ||
    contentType === "image/heif" ||
    contentType === "image/avif"
  ) {
    return contentType;
  }
  return "image/jpeg";
}

function getTrackingStatusLabel(
  status: ReturnType<typeof usePloggingTracker>["backgroundTracking"]
) {
  if (status === "running") return "백그라운드 기록";
  if (status === "foreground-only") return "앱 실행 중 기록";
  if (status === "unavailable") return "권한 확인 필요";
  return "기록 준비 중";
}

function getPendingSnapshotRoutePoints(
  currentRoutePoints: RouteLikePoint[],
  snapshotPoints: RouteLikePoint[]
) {
  if (snapshotPoints.length === 0) return [];
  if (currentRoutePoints.length === 0) return snapshotPoints;

  const lastCurrentPoint = currentRoutePoints[currentRoutePoints.length - 1];
  const lastAppliedSnapshotIndex = findLastMatchingPointIndex(
    snapshotPoints,
    lastCurrentPoint
  );

  if (lastAppliedSnapshotIndex < 0) return [];
  return snapshotPoints.slice(lastAppliedSnapshotIndex + 1);
}

function findLastMatchingPointIndex(
  points: RouteLikePoint[],
  target: RouteLikePoint
) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (
      haversineMeters(points[index], target) <=
      SNAPSHOT_ROUTE_POINT_MATCH_THRESHOLD_METERS
    ) {
      return index;
    }
  }
  return -1;
}

const EARTH_RADIUS_METERS = 6_371_000;

function haversineMeters(a: RouteLikePoint, b: RouteLikePoint): number {
  const phi1 = toRadians(a.latitude);
  const phi2 = toRadians(b.latitude);
  const deltaPhi = toRadians(b.latitude - a.latitude);
  const deltaLambda = toRadians(b.longitude - a.longitude);

  const sinDeltaPhi = Math.sin(deltaPhi / 2);
  const sinDeltaLambda = Math.sin(deltaLambda / 2);

  const h =
    sinDeltaPhi * sinDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function PloggingTimerCard({
  activeTop,
  formattedElapsed,
  modeLabel,
  paused,
  pausedTop,
  pauseTransition,
  pausedHeight,
  restFormatted,
  stats,
  trackingStatusLabel,
}: {
  activeTop: number;
  formattedElapsed: string;
  modeLabel: string;
  paused: boolean;
  pausedTop: number;
  pauseTransition: Animated.Value;
  pausedHeight: number;
  restFormatted: string;
  stats: LiveStat[];
  trackingStatusLabel: string;
}) {
  const cardLeft = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const cardPaddingHorizontal = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 43],
  });
  const cardPaddingTop = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [
      14,
      pausedTop + 14 + (pausedHeight - TIMER_CARD_PAUSED_CONTENT_HEIGHT),
    ],
  });
  const cardTop = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [activeTop, pausedTop],
  });
  const cardTopRadius = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const cardHeight = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [131, pausedHeight],
  });
  const restOpacity = pauseTransition.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });
  const restTranslateY = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });
  const trackingOpacity = pauseTransition.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.25, 0],
  });

  return (
    <Animated.View
      accessibilityState={{ busy: paused }}
      style={[
        styles.timerCard,
        paused ? styles.timerCardPaused : null,
        {
          borderTopLeftRadius: cardTopRadius,
          borderTopRightRadius: cardTopRadius,
          height: cardHeight,
          left: cardLeft,
          paddingHorizontal: cardPaddingHorizontal,
          paddingTop: cardPaddingTop,
          right: cardLeft,
          top: cardTop,
        },
      ]}
    >
      <View style={styles.modeRow}>
        <Text
          selectable
          style={[styles.modeLabel, paused ? styles.modeLabelPaused : null]}
        >
          {modeLabel}
        </Text>
        <Animated.View
          style={[styles.trackingPill, { opacity: trackingOpacity }]}
        >
          <Text numberOfLines={1} selectable style={styles.trackingPillText}>
            {trackingStatusLabel}
          </Text>
        </Animated.View>
      </View>
      <View style={styles.timerLine}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          selectable
          style={[styles.timerText, paused ? styles.timerTextPaused : null]}
        >
          {formattedElapsed}
        </Text>
        <Animated.Text
          numberOfLines={1}
          selectable
          style={[
            styles.restText,
            paused ? styles.restTextPaused : null,
            {
              opacity: restOpacity,
              transform: [{ translateY: restTranslateY }],
            },
          ]}
        >
          휴식 {restFormatted}
        </Animated.Text>
      </View>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={styles.statItem}>
            <Text
              numberOfLines={1}
              selectable
              style={[styles.statLabel, paused ? styles.statLabelPaused : null]}
            >
              {stat.label}
            </Text>
            <PloggingStatValue paused={paused} stat={stat} />
            {index < stats.length - 1 ? (
              <View
                style={[
                  styles.statDivider,
                  paused ? styles.statDividerPaused : null,
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function PloggingStatValue({
  paused,
  stat,
}: {
  paused: boolean;
  stat: LiveStat;
}) {
  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      numberOfLines={1}
      selectable
      style={[styles.statValue, paused ? styles.statValuePaused : null]}
    >
      {stat.value}
      <Text style={[styles.statUnit, paused ? styles.statUnitPaused : null]}>
        {" "}
        {stat.unit}
      </Text>
    </Text>
  );
}

function ActionDock({
  onCapturePhoto,
  onEnd,
  bottom,
  isPaused,
  onTogglePause,
  pauseTransition,
  pausedHeight,
  photoCount,
}: {
  onCapturePhoto: () => void;
  onEnd: () => void;
  bottom: number;
  isPaused: boolean;
  onTogglePause: () => void;
  pauseTransition: Animated.Value;
  pausedHeight: number;
  photoCount: number;
}) {
  const pauseLabel = isPaused ? "재개" : "일시 정지";
  const cameraLabel =
    photoCount > 0 ? `사진 촬영 (${photoCount}장 촬영됨)` : "사진 촬영";
  const dockBottom = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [bottom, 0],
  });
  const dockHorizontal = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const dockHeight = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [71, pausedHeight],
  });
  const dockPaddingHorizontal = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 36],
  });
  const dockBottomRadius = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const pausedIconColor = isPaused ? colors.surface : colors.icon;

  return (
    <Animated.View
      style={[
        styles.actionDock,
        isPaused ? styles.actionDockPaused : null,
        {
          borderBottomLeftRadius: dockBottomRadius,
          borderBottomRightRadius: dockBottomRadius,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          bottom: dockBottom,
          height: dockHeight,
          left: dockHorizontal,
          paddingHorizontal: dockPaddingHorizontal,
          right: dockHorizontal,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={cameraLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onCapturePhoto}
        style={({ pressed }) => [
          styles.cameraButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <CameraGlyph light />
        {photoCount > 0 ? (
          <View style={styles.photoBadge}>
            <Text selectable style={styles.photoBadgeText}>
              {photoCount > 99 ? "99+" : String(photoCount)}
            </Text>
          </View>
        ) : null}
      </Pressable>
      <Pressable
        accessibilityLabel={pauseLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onTogglePause}
        style={({ pressed }) => [
          styles.pauseButton,
          isPaused ? styles.pauseButtonPaused : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {isPaused ? (
          <PlayGlyph color={pausedIconColor} />
        ) : (
          <PauseGlyph color={pausedIconColor} />
        )}
        <Text
          selectable
          style={[styles.pauseText, isPaused ? styles.pauseTextPaused : null]}
        >
          {pauseLabel}
        </Text>
      </Pressable>
      {isPaused ? (
        <Pressable
          accessibilityLabel="플로깅 종료"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEnd}
          style={({ pressed }) => [
            styles.endButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text selectable style={styles.endText}>
            종료
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionDock: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    gap: 10,
    height: 71,
    justifyContent: "space-between",
    left: 24,
    paddingHorizontal: 12,
    paddingTop: 10,
    position: "absolute",
    right: 24,
    ...shadows.button,
  },
  actionDockPaused: {
    backgroundColor: "#101113",
  },
  cameraButton: {
    position: "relative",
  },
  photoBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 5,
    position: "absolute",
    right: -6,
    top: -6,
  },
  photoBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "700",
  },
  endButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 26,
    height: 51,
    justifyContent: "center",
    width: 51,
  },
  endText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
  },
  modeLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  modeLabelPaused: {
    color: "rgba(255, 255, 255, 0.82)",
  },
  modeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 14,
    justifyContent: "space-between",
    position: "relative",
  },
  mapControlsMotion: {
    left: 0,
    position: "absolute",
    right: 0,
  },
  pauseButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 51,
    justifyContent: "center",
    paddingHorizontal: 20,
    ...shadows.soft,
  },
  pauseButtonPaused: {
    backgroundColor: "#2A2B2F",
  },
  pauseText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  pauseTextPaused: {
    color: colors.surface,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  statDivider: {
    backgroundColor: colors.line,
    height: 29,
    position: "absolute",
    right: -6,
    top: 2,
    width: 1,
  },
  statDividerPaused: {
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  statItem: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    position: "relative",
  },
  statLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
  },
  statLabelPaused: {
    color: "rgba(255, 255, 255, 0.72)",
  },
  statUnit: {
    color: "#616161",
    fontSize: 12,
    fontWeight: "500",
  },
  statUnitPaused: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    ...typography.number,
  },
  statValuePaused: {
    color: colors.surface,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  timerCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: colors.surface,
    height: 131,
    left: 24,
    overflow: "hidden",
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 14,
    position: "absolute",
    right: 24,
    ...shadows.raised,
  },
  timerCardPaused: {
    backgroundColor: colors.primary,
  },
  timerText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 32,
  },
  timerTextPaused: {
    color: colors.surface,
  },
  timerLine: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  restText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 14,
    paddingBottom: 3,
  },
  restTextPaused: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  trackingPill: {
    backgroundColor: "#EAF6FE",
    borderRadius: 999,
    maxWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    right: 0,
    top: -5,
  },
  trackingPillText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
