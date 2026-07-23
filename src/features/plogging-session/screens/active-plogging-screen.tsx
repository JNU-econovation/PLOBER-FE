import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // 🌟 추가
import { useAuthSession } from "@/src/features/auth";
import {
  endCrewPloggingSession,
  getCrewDetail,
  type CrewRole,
  type CrewPloggingSessionResponse,
} from "@/src/features/crew/api";
import {
  useCrewPloggingSessionPolling,
  useCrewPloggingTransitionGuard,
} from "@/src/features/crew/hooks";
import {
  resolveCrewPloggingFlow,
  toCrewPloggingRouteParams,
  type CrewPloggingRouteContext,
} from "@/src/features/crew/model";
import { PloggingMap } from "@/src/shared/map";
import {
  colors,
  fontFamilies,
  getSafeLineHeight,
  shadows,
} from "@/src/shared/theme";
import {
  ScreenRoot,
} from "@/src/shared/ui";

import { usePloggingSession } from "../hooks/use-plogging-session";
import { usePloggingTimer } from "../hooks/use-plogging-timer";
import { usePloggingTracker } from "../hooks/use-plogging-tracker";
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

export type LeaderEndConfirmationRenderProps = {
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  visible: boolean;
};

export type ActivePloggingScreenProps = {
  crewContext?: CrewPloggingRouteContext | null;
  renderLeaderEndConfirmation?: (
    props: LeaderEndConfirmationRenderProps
  ) => ReactNode;
};

const TIMER_CARD_ACTIVE_TOP_OFFSET = 12;
const TIMER_CARD_PAUSED_TOP_OFFSET = 8;
const TIMER_CARD_ACTIVE_HEIGHT = 158;
const LIVE_ACTIVITY_UPDATE_INTERVAL_MS = 5_000;

const sessionIcons = {
  camera: require("@/assets/icons/crew-session-trash.svg"),
  pause: require("@/assets/icons/figma-pause.svg"),
  resume: require("@/assets/icons/figma-resume.svg"),
} as const;

export function ActivePloggingScreen({
  crewContext = null,
  renderLeaderEndConfirmation,
}: ActivePloggingScreenProps = {}) {
  if (crewContext) {
    return (
      <ValidatedCrewPloggingScreen
        crewContext={crewContext}
        renderLeaderEndConfirmation={renderLeaderEndConfirmation}
      />
    );
  }

  return (
    <ActivePloggingExperience
      renderLeaderEndConfirmation={renderLeaderEndConfirmation}
    />
  );
}

function ValidatedCrewPloggingScreen({
  crewContext,
  renderLeaderEndConfirmation,
}: ActivePloggingScreenProps & { crewContext: CrewPloggingRouteContext }) {
  const router = useRouter();
  const [activeConfirmed, setActiveConfirmed] = useState(false);
  const [role, setRole] = useState<CrewRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleReloadKey, setRoleReloadKey] = useState(0);
  const navigationStartedRef = useRef(false);
  const polling = useCrewPloggingSessionPolling({
    enabled: !activeConfirmed,
    sessionId: crewContext.sessionId,
  });

  useEffect(() => {
    let disposed = false;
    setRole(null);
    setRoleError(null);

    getCrewDetail({ crewId: crewContext.crewId })
      .then((detail) => {
        if (!disposed) setRole(detail.myRole);
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setRoleError(
            error instanceof Error
              ? error.message
              : "크루 권한을 확인하지 못했습니다."
          );
        }
      });

    return () => {
      disposed = true;
    };
  }, [crewContext.crewId, roleReloadKey]);

  useEffect(() => {
    const session = polling.session;
    if (!session || navigationStartedRef.current) return;

    const resolved = resolveCrewPloggingFlow(session);
    if (resolved.destination === "ACTIVE_PLOGGING") {
      setActiveConfirmed(true);
      return;
    }

    navigationStartedRef.current = true;
    const routeRole = role ?? crewContext.role;

    if (resolved.destination === "PERSONAL_REPORT") {
      router.replace({
        pathname: "/report",
        params: toCrewPloggingRouteParams({ ...crewContext, role: routeRole }),
      });
      return;
    }
    if (resolved.destination === "SUBMISSION_WAITING") {
      router.replace({
        pathname: "/crews/[crewId]/sessions/[sessionId]",
        params: {
          crewId: String(crewContext.crewId),
          role: routeRole,
          sessionId: String(crewContext.sessionId),
        },
      });
      return;
    }
    if (resolved.destination === "COMPLETED_RECORD") {
      router.replace({
        pathname: "/crews/[crewId]/records/[sessionId]",
        params: {
          crewId: String(crewContext.crewId),
          sessionId: String(crewContext.sessionId),
        },
      });
      return;
    }

    if (resolved.destination === "CANCELED") {
      router.replace({
        pathname: "/crews/[crewId]",
        params: { crewId: String(crewContext.crewId) },
      });
      return;
    }

    router.replace({
      pathname: "/crews/[crewId]/sessions/[sessionId]",
      params: {
        crewId: String(crewContext.crewId),
        role: routeRole,
        sessionId: String(crewContext.sessionId),
      },
    });
  }, [crewContext, polling.session, role, router]);

  if (activeConfirmed && role) {
    return (
      <ActivePloggingExperience
        crewContext={{ ...crewContext, role }}
        renderLeaderEndConfirmation={renderLeaderEndConfirmation}
      />
    );
  }

  const errorMessage = roleError ?? polling.errorMessage;
  return (
    <View style={styles.validationRoot}>
      {errorMessage ? (
        <>
          <Text style={styles.validationTitle}>같이줍기 상태를 확인하지 못했어요</Text>
          <Text style={styles.validationMessage}>{errorMessage}</Text>
          <Pressable
            onPress={() => {
              navigationStartedRef.current = false;
              setRoleReloadKey((value) => value + 1);
              void polling.refetch().catch(() => null);
            }}
            style={({ pressed }) => [
              styles.validationRetry,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.validationRetryText}>다시 시도</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color="#449DDD" />
      )}
    </View>
  );
}

function ActivePloggingExperience({
  crewContext = null,
  renderLeaderEndConfirmation,
}: ActivePloggingScreenProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 🌟 Safe Area 훅 추가
  const { session } = useAuthSession();
  const timer = usePloggingTimer();
  const restoreTimer = timer.restore;
  const initialStartedAtMsRef = useRef(timer.startedAt);
  const liveActivityPayloadRef = useRef<PloggingLiveActivityPayload | null>(
    null
  );
  const liveActivityStartedRef = useRef(false);
  const lastLiveActivityPausedRef = useRef(timer.isPaused);
  const lastLiveActivityUpdateAtRef = useRef(0);
  const endingRef = useRef(false);
  const leaderEndRequestRef = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [leaderEndConfirmationVisible, setLeaderEndConfirmationVisible] =
    useState(false);
  const [leaderEndConfirming, setLeaderEndConfirming] = useState(false);
  const crewSessionId = crewContext?.sessionId ?? null;
  const backgroundSessionId =
    crewSessionId === null
      ? String(initialStartedAtMsRef.current)
      : `crew:${crewSessionId}`;
  const crewPolling = useCrewPloggingSessionPolling({
    enabled: crewSessionId !== null,
    sessionId: crewSessionId,
  });
  const refetchCrewSession = crewPolling.refetch;
  const { claimTransition, releaseTransition } =
    useCrewPloggingTransitionGuard(
      crewSessionId === null ? null : String(crewSessionId)
    );
  const pausedTimerCardHeight = 166;
  const pauseTransition = usePauseTransition(timer.isPaused);
  const {
    addPhoto,
    addPhotoObjectUrl,
    caloriesBurned,
    distanceMeters,
    finishSession,
    mode,
    photoUris,
    recommendedRoutePoints,
    replaceStepCount,
    resetSession,
    replaceRoutePoints,
    routePoints,
    setMode,
    setRecommendedRoutePoints,
    startSession,
    stepCount,
  } = usePloggingSession();
  const visibleRoutePoints = !sessionReady
    ? []
    : mode === "RECOMMENDED" && recommendedRoutePoints.length >= 2
      ? recommendedRoutePoints
      : routePoints;
  const modeLabel = mode === "RECOMMENDED" ? "AI 추천" : "자유모드";

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          Alert.alert(
            "플로깅이 진행 중이에요",
            "기록을 저장하려면 화면의 종료 버튼을 눌러주세요."
          );
          return true;
        }
      );

      return () => subscription.remove();
    }, [])
  );

  // 새 세션 시작 시 이전 세션의 누적 데이터(사진/좌표/걸음 등)를 비운다.
  // 사용자가 /report 까지 갔다가 뒤로 와서 새로 시작하는 경우에도 같은 화면이 다시 mount 되므로 안전하다.
  // reset 직후 시작 시각을 즉시 고정한다.
  useEffect(() => {
    let disposed = false;

    const initializeSession = async () => {
      const snapshot = await readBackgroundPloggingSnapshot().catch(() => null);
      const recoverableSnapshot =
        crewSessionId !== null &&
        snapshot &&
        snapshot.startedAtMs !== null &&
        isBackgroundPloggingSnapshotForSession(snapshot, backgroundSessionId)
          ? snapshot
          : null;

      resetSession({ preserveRecommendedRoute: crewSessionId === null });
      if (crewSessionId !== null) {
        setMode("FREE");
        setRecommendedRoutePoints([]);
      }

      if (
        recoverableSnapshot &&
        recoverableSnapshot.startedAtMs !== null
      ) {
        const recoveredStartedAtMs = recoverableSnapshot.startedAtMs;
        restoreTimer({
          isPaused: recoverableSnapshot.isPaused,
          pausedAtMs: recoverableSnapshot.pausedAtMs,
          pausedTotalMs: recoverableSnapshot.pausedTotalMs,
          startedAtMs: recoveredStartedAtMs,
        });
        startSession(recoveredStartedAtMs, backgroundSessionId);
      } else {
        startSession(initialStartedAtMsRef.current, backgroundSessionId);
      }

      if (!disposed) setSessionReady(true);
    };

    void initializeSession();
    return () => {
      disposed = true;
    };
  }, [
    backgroundSessionId,
    crewSessionId,
    resetSession,
    setMode,
    setRecommendedRoutePoints,
    startSession,
    restoreTimer,
  ]);

  // GPS는 백그라운드 위치 태스크를 우선 사용하고, 실행 환경이 막으면 foreground 구독으로 폴백한다.
  // 만보기는 foreground 구독 + iOS 백그라운드 복귀 보정으로 누적한다.
  usePloggingTracker({
    enabled: sessionReady,
    isPaused: timer.isPaused,
    sessionId: backgroundSessionId,
    startedAtMs: timer.startedAt,
  });

  const handleCapturePhoto = async () => {
    const result = await capturePloggingPhoto();
    if (result.status !== "captured") return;

    addPhoto(result.uri);

    // 백그라운드로 S3 업로드. 사용자 동선은 막지 않고, 실패해도 다음 사진에 영향 없음.
    void (async () => {
      const uploadPromise = session
        ? uploadPloggingPhoto(
            result.uri,
            toPhotoUploadContentType(result.mimeType)
          )
        : Promise.resolve({
            status: "error" as const,
            message: "로그인 정보가 없어 인증샷 업로드를 건너뜁니다.",
          });
      const uploadResult = await uploadPromise;
      if (uploadResult.status === "uploaded") {
        addPhotoObjectUrl(result.uri, uploadResult.objectUrl);
      }
    })();
  };

  const liveStats = useMemo<LiveStat[]>(
    () => [
      {
        label: "거리",
        unit: "km",
        value: formatKilometers(distanceMeters),
      },
      {
        label: "걸음",
        unit: "step",
        value: formatInteger(stepCount),
      },
      {
        label: "예상 칼로리",
        unit: "kcal",
        value: formatInteger(caloriesBurned),
      },
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
    if (!sessionReady) return;
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
  }, [liveActivityPayload, sessionReady]);

  useEffect(() => {
    return () => {
      const payload = liveActivityPayloadRef.current;
      if (payload) {
        void endPloggingLiveActivity(payload);
      }
    };
  }, []);

  const navigateToReport = useCallback(() => {
    if (!crewContext) {
      router.replace("/report");
      return;
    }

    router.replace({
      pathname: "/report",
      params: toCrewPloggingRouteParams(crewContext),
    });
  }, [crewContext, router]);

  const navigateToCrewWaiting = useCallback(() => {
    if (!crewContext) return;
    router.replace({
      pathname: "/crews/[crewId]/sessions/[sessionId]",
      params: {
        crewId: String(crewContext.crewId),
        role: crewContext.role,
        sessionId: String(crewContext.sessionId),
      },
    });
  }, [crewContext, router]);

  const navigateToCrewRecord = useCallback(() => {
    if (!crewContext) return;
    router.replace({
      pathname: "/crews/[crewId]/records/[sessionId]",
      params: {
        crewId: String(crewContext.crewId),
        sessionId: String(crewContext.sessionId),
      },
    });
  }, [crewContext, router]);

  const stopLocalTracking = useCallback(async () => {
    try {
      await stopPloggingBackgroundLocation();
    } catch (error) {
      if (__DEV__) {
        console.log("[crew-plogging] local tracking stop failed", {
          message: error instanceof Error ? error.message : "unknown error",
        });
      }
    }
    const payload = liveActivityPayloadRef.current;
    if (payload) {
      void endPloggingLiveActivity(payload);
    }
  }, []);

  const finalizeLocalPlogging = useCallback(
    async (requestedFinishedAtMs = Date.now()) => {
      if (endingRef.current) return false;
      endingRef.current = true;

      try {
        const finishedAtMs = Math.max(timer.startedAt, requestedFinishedAtMs);
        const snapshot = await readBackgroundPloggingSnapshot().catch(() => null);
        let completedRoutePoints = routePoints;

        if (
          snapshot &&
          isBackgroundPloggingSnapshotForSession(
            snapshot,
            backgroundSessionId
          )
        ) {
          const snapshotRoutePoints = snapshot.routePoints
            .filter((point) => point.recordedAtMs <= finishedAtMs)
            .map((point) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }));
          completedRoutePoints = mergeCompletedRoutePoints(
            routePoints,
            snapshotRoutePoints
          );
          const completedDistanceMeters =
            snapshot.updatedAtMs <= finishedAtMs
              ? snapshot.distanceMeters
              : undefined;
          replaceRoutePoints(completedRoutePoints, completedDistanceMeters);

          const cutoffStepSample = [...snapshot.stepSamples]
            .reverse()
            .find((sample) => sample.recordedAtMs <= finishedAtMs);
          replaceStepCount(
            cutoffStepSample?.stepCount ??
              (snapshot.updatedAtMs <= finishedAtMs ? snapshot.stepCount : 0)
          );
        }

        await stopLocalTracking();

        if (completedRoutePoints.length === 0 && !crewContext) {
          resetSession();
          router.replace("/");
          Alert.alert(
            "플로깅 취소",
            "경로 정보가 없어 이번 플로깅은 기록하지 않았습니다."
          );
          return true;
        }

        // 서버 전체 종료를 늦게 감지한 경우에도 종료 시각 이후의 시간을 기록하지 않는다.
        const totalElapsedMs = Math.max(0, finishedAtMs - timer.startedAt);
        const restMs = Math.min(totalElapsedMs, timer.restMs);
        finishSession(Math.floor(restMs / 1000), finishedAtMs);
        navigateToReport();
        return true;
      } catch (error) {
        endingRef.current = false;
        Alert.alert(
          "종료 실패",
          error instanceof Error
            ? error.message
            : "플로깅을 종료하지 못했습니다. 다시 시도해주세요."
        );
        return false;
      }
    },
    [
      crewContext,
      finishSession,
      navigateToReport,
      replaceRoutePoints,
      replaceStepCount,
      resetSession,
      routePoints,
      router,
      stopLocalTracking,
      timer.restMs,
      timer.startedAt,
      backgroundSessionId,
    ]
  );

  const leaveActivePlogging = useCallback(
    async (destination: "waiting" | "record" | "canceled") => {
      if (endingRef.current) return;
      endingRef.current = true;
      await stopLocalTracking();
      resetSession();

      if (destination === "waiting") {
        navigateToCrewWaiting();
        return;
      }
      if (destination === "record") {
        navigateToCrewRecord();
        return;
      }

      if (crewContext) {
        router.replace({
          pathname: "/crews/[crewId]",
          params: { crewId: String(crewContext.crewId) },
        });
      }
      Alert.alert(
        "같이줍기 취소",
        "크루장이 같이줍기 모집을 취소했습니다."
      );
    },
    [
      crewContext,
      navigateToCrewRecord,
      navigateToCrewWaiting,
      resetSession,
      router,
      stopLocalTracking,
    ]
  );

  const handleCrewSessionState = useCallback(
    async (nextSession: CrewPloggingSessionResponse) => {
      const resolved = resolveCrewPloggingFlow(nextSession);
      if (
        resolved.destination === "IDLE" ||
        resolved.destination === "RECRUITING" ||
        resolved.destination === "ACTIVE_PLOGGING"
      ) {
        return;
      }
      if (!claimTransition(resolved.transitionKey)) return;

      let handled = true;
      if (resolved.destination === "PERSONAL_REPORT") {
        const serverEndedAtMs = parseServerDateTime(nextSession.endedAt);
        handled = await finalizeLocalPlogging(serverEndedAtMs ?? Date.now());
      } else if (resolved.destination === "SUBMISSION_WAITING") {
        await leaveActivePlogging("waiting");
      } else if (resolved.destination === "COMPLETED_RECORD") {
        await leaveActivePlogging("record");
      } else if (resolved.destination === "CANCELED") {
        await leaveActivePlogging("canceled");
      }

      if (!handled) {
        releaseTransition(resolved.transitionKey);
      }
    },
    [
      claimTransition,
      finalizeLocalPlogging,
      leaveActivePlogging,
      releaseTransition,
    ]
  );

  useEffect(() => {
    if (!sessionReady || !crewPolling.session) return;
    void handleCrewSessionState(crewPolling.session);
  }, [crewPolling.session, handleCrewSessionState, sessionReady]);

  const handleConfirmLeaderEnd = useCallback(async () => {
    if (
      !crewContext ||
      crewContext.role !== "LEADER" ||
      leaderEndRequestRef.current
    ) {
      return;
    }

    leaderEndRequestRef.current = true;
    setLeaderEndConfirming(true);
    try {
      const nextSession = await endCrewPloggingSession({
        sessionId: crewContext.sessionId,
      });
      setLeaderEndConfirmationVisible(false);
      await handleCrewSessionState(nextSession);
    } catch (error) {
      // POST 응답이 유실됐을 수 있으므로 재전송 전에 서버 상태를 확인한다.
      try {
        const recoveredSession = await refetchCrewSession();
        if (
          recoveredSession.status === "COMPLETING" ||
          recoveredSession.status === "COMPLETED"
        ) {
          setLeaderEndConfirmationVisible(false);
          await handleCrewSessionState(recoveredSession);
          return;
        }
      } catch {
        // 원래 종료 오류를 사용자에게 노출한다.
      }

      Alert.alert(
        "전체 종료 실패",
        error instanceof Error
          ? error.message
          : "같이줍기를 종료하지 못했습니다. 다시 시도해주세요."
      );
    } finally {
      leaderEndRequestRef.current = false;
      setLeaderEndConfirming(false);
    }
  }, [crewContext, handleCrewSessionState, refetchCrewSession]);

  const closeLeaderEndConfirmation = useCallback(() => {
    if (leaderEndRequestRef.current) return;
    setLeaderEndConfirmationVisible(false);
  }, []);

  const openLeaderEndConfirmation = useCallback(() => {
    setLeaderEndConfirmationVisible(true);
    if (renderLeaderEndConfirmation) return;

    Alert.alert(
      "같이줍기를 종료하시겠습니까?",
      "종료하면 참여 중인 모든 크루원의 같이줍기가 함께 종료됩니다.",
      [
        { onPress: closeLeaderEndConfirmation, style: "cancel", text: "취소" },
        {
          onPress: () => {
            void handleConfirmLeaderEnd();
          },
          style: "destructive",
          text: "전체 종료",
        },
      ],
      { cancelable: true, onDismiss: closeLeaderEndConfirmation }
    );
  }, [
    closeLeaderEndConfirmation,
    handleConfirmLeaderEnd,
    renderLeaderEndConfirmation,
  ]);

  const handleRequestEndPlogging = useCallback(() => {
    if (crewContext?.role !== "LEADER") {
      void finalizeLocalPlogging();
      return;
    }
    openLeaderEndConfirmation();
  }, [
    crewContext?.role,
    finalizeLocalPlogging,
    openLeaderEndConfirmation,
  ]);

  if (!sessionReady) {
    return (
      <View style={styles.validationRoot}>
        <ActivityIndicator color="#449DDD" />
      </View>
    );
  }

  return (
    <ScreenRoot>
      <PloggingMap
        routePoints={visibleRoutePoints}
        routeVisible={visibleRoutePoints.length >= 2}
        zoom={17}
      >
        <View
          pointerEvents="none"
          style={[
            styles.statusBarBackdrop,
            { height: insets.top },
          ]}
        />
        <PloggingTimerCard
          formattedElapsed={timer.formatted.split(":").join(" : ")}
          modeLabel={modeLabel}
          pauseTransition={pauseTransition}
          paused={timer.isPaused}
          stats={liveStats}
          activeTop={insets.top + TIMER_CARD_ACTIVE_TOP_OFFSET}
          pausedHeight={pausedTimerCardHeight}
          pausedTop={insets.top + TIMER_CARD_PAUSED_TOP_OFFSET}
        />
        <ActionDock
          bottom={Math.max(insets.bottom, 12) + 16}
          isPaused={timer.isPaused}
          onCapturePhoto={handleCapturePhoto}
          onEnd={handleRequestEndPlogging}
          onTogglePause={timer.toggle}
          pauseTransition={pauseTransition}
          pausedHeight={148}
          photoCount={photoUris.length}
        />
      </PloggingMap>
      {renderLeaderEndConfirmation?.({
        confirming: leaderEndConfirming,
        onCancel: closeLeaderEndConfirmation,
        onConfirm: () => {
          void handleConfirmLeaderEnd();
        },
        visible: leaderEndConfirmationVisible,
      })}
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

function mergeCompletedRoutePoints<T extends { latitude: number; longitude: number }>(
  currentPoints: T[],
  backgroundPoints: T[]
): T[] {
  if (currentPoints.length === 0) return [...backgroundPoints];
  if (backgroundPoints.length === 0) return [...currentPoints];

  const backgroundIndexByCoordinate = new Map<string, number>();
  backgroundPoints.forEach((point, index) => {
    backgroundIndexByCoordinate.set(routeCoordinateKey(point), index);
  });

  let currentOverlapIndex = -1;
  let backgroundOverlapIndex = -1;
  for (let index = currentPoints.length - 1; index >= 0; index -= 1) {
    const match = backgroundIndexByCoordinate.get(
      routeCoordinateKey(currentPoints[index])
    );
    if (match !== undefined) {
      currentOverlapIndex = index;
      backgroundOverlapIndex = match;
      break;
    }
  }

  if (currentOverlapIndex >= 0) {
    return [
      ...currentPoints,
      ...backgroundPoints.slice(backgroundOverlapIndex + 1),
    ];
  }

  // 장시간 백그라운드 실행으로 저장 스냅샷의 앞부분이 순환 삭제된 경우에도
  // 이미 메모리에 반영된 시작 구간과 최신 저장 구간을 모두 보존한다.
  return [...currentPoints, ...backgroundPoints];
}

function routeCoordinateKey(point: { latitude: number; longitude: number }) {
  return `${point.latitude}:${point.longitude}`;
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

function parseServerDateTime(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function PloggingTimerCard({
  activeTop,
  formattedElapsed,
  modeLabel,
  paused,
  pausedTop,
  pauseTransition,
  pausedHeight,
  stats,
}: {
  activeTop: number;
  formattedElapsed: string;
  modeLabel: string;
  paused: boolean;
  pausedTop: number;
  pauseTransition: Animated.Value;
  pausedHeight: number;
  stats: LiveStat[];
}) {
  const cardLeft = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [26, 14],
  });
  const cardPaddingHorizontal = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 30],
  });
  const cardPaddingTop = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 20],
  });
  const cardTop = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [activeTop, pausedTop],
  });
  const cardTopRadius = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 12],
  });
  const cardHeight = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [TIMER_CARD_ACTIVE_HEIGHT, pausedHeight],
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
      </View>
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text
              numberOfLines={1}
              selectable
              style={[styles.statLabel, paused ? styles.statLabelPaused : null]}
            >
              {stat.label}
            </Text>
            <PloggingStatValue paused={paused} stat={stat} />
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
    outputRange: [28, 2],
  });
  const dockHeight = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [64, pausedHeight],
  });
  const dockPaddingHorizontal = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 28],
  });
  const dockBottomRadius = pauseTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  return (
    <Animated.View
      style={[
        styles.actionDock,
        isPaused ? styles.actionDockPaused : null,
        {
          borderBottomLeftRadius: dockBottomRadius,
          borderBottomRightRadius: dockBottomRadius,
          borderTopLeftRadius: isPaused ? 24 : 12,
          borderTopRightRadius: isPaused ? 24 : 12,
          bottom: dockBottom,
          height: dockHeight,
          left: dockHorizontal,
          paddingHorizontal: dockPaddingHorizontal,
          right: dockHorizontal,
        },
      ]}
    >
      {photoCount === 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.photoCoachmark,
            {
              left: isPaused ? 5 : -13,
              top: isPaused ? -28 : -30,
            },
          ]}
        >
          <Text style={styles.photoCoachmarkText}>인증샷 남기기!</Text>
          <View style={styles.photoCoachmarkTail} />
        </View>
      ) : null}
      <View style={styles.cameraAction}>
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
          <Image contentFit="contain" source={sessionIcons.camera} style={styles.cameraIcon} />
        </Pressable>
        {isPaused ? <Text style={styles.cameraLabel}>인증샷</Text> : null}
      </View>
      <Pressable
        accessibilityLabel={pauseLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onTogglePause}
        style={({ pressed }) => [
          styles.pauseButton,
          isPaused ? styles.pauseButtonPaused : styles.pauseButtonActive,
          pressed ? styles.pressed : null,
        ]}
      >
        {isPaused ? (
          <Image contentFit="contain" source={sessionIcons.resume} style={styles.resumeIcon} />
        ) : (
          <Image contentFit="contain" source={sessionIcons.pause} style={styles.pauseIcon} />
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    height: 64,
    left: 28,
    paddingHorizontal: 10,
    paddingTop: 6,
    position: "absolute",
    right: 28,
    ...shadows.button,
  },
  actionDockPaused: {
    backgroundColor: "#272727",
    borderColor: "#272727",
    borderWidth: 0,
    gap: 12,
    paddingTop: 10,
  },
  cameraAction: {
    alignItems: "center",
    gap: 4,
    height: 64,
    width: 48,
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
    ...shadows.soft,
  },
  cameraIcon: {
    height: 23,
    width: 26,
  },
  cameraLabel: {
    color: "#FAFAFA",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
  },
  endButton: {
    alignItems: "center",
    backgroundColor: "#FF383C",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
    ...shadows.soft,
  },
  endText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  modeLabel: {
    backgroundColor: "#F2F7FD",
    borderColor: "#E4EFFA",
    borderRadius: 23,
    borderWidth: 2,
    color: "#1B6CAE",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeLabelPaused: {
    backgroundColor: "#E4EFFA",
    borderColor: "#C3DEF4",
    color: "#174A75",
  },
  modeRow: {
    alignItems: "center",
    flexDirection: "row",
    height: 30,
  },
  pauseButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    gap: 10,
    height: 48,
    justifyContent: "center",
    ...shadows.soft,
  },
  pauseButtonActive: {
    flex: 1,
    minWidth: 0,
  },
  pauseButtonPaused: {
    backgroundColor: "#404040",
    flex: 1,
    minWidth: 0,
  },
  pauseIcon: {
    height: 13,
    width: 6,
  },
  pauseText: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  pauseTextPaused: {
    color: "#FFFFFF",
  },
  photoCoachmark: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
  },
  photoCoachmarkTail: {
    borderLeftColor: "transparent",
    borderLeftWidth: 5,
    borderRightColor: "transparent",
    borderRightWidth: 5,
    borderTopColor: "#449DDD",
    borderTopWidth: 12,
    bottom: -10,
    position: "absolute",
  },
  photoCoachmarkText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    letterSpacing: -0.28,
  },
  pressed: {
    opacity: 0.74,
    transform: [{ scale: 0.98 }],
  },
  resumeIcon: {
    height: 12,
    width: 8,
  },
  statusBarBackdrop: {
    backgroundColor: "#FFFFFF",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  statItem: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  statLabel: {
    color: colors.subtle,
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  statLabelPaused: {
    color: "#193F61",
  },
  statUnit: {
    color: "#272727",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  statUnitPaused: {
    color: "#102841",
  },
  statValue: {
    color: "#272727",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  statValuePaused: {
    color: "#102841",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    height: 36,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  timerCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderColor: "#E6E6E6",
    borderWidth: 2,
    height: TIMER_CARD_ACTIVE_HEIGHT,
    left: 26,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingTop: 16,
    position: "absolute",
    right: 26,
  },
  timerCardPaused: {
    backgroundColor: "rgba(242,247,253,0.9)",
    borderColor: "#C3DEF4",
    borderWidth: 3,
  },
  timerText: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 32,
    letterSpacing: -2.56,
    lineHeight: getSafeLineHeight(32, fontFamilies.giantsRegular, 32),
  },
  timerTextPaused: {
    color: "#121212",
  },
  timerLine: {
    flexDirection: "row",
    marginTop: 12,
  },
  validationMessage: {
    color: "#727272",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    paddingHorizontal: 32,
    textAlign: "center",
  },
  validationRetry: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderRadius: 12,
    height: 47,
    justifyContent: "center",
    marginTop: 24,
    width: 200,
  },
  validationRetryText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
  },
  validationRoot: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    flex: 1,
    justifyContent: "center",
  },
  validationTitle: {
    color: "#121212",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
  },
});
