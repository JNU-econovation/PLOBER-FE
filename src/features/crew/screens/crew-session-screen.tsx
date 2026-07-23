import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePloggingSession } from "@/src/features/plogging-session";
import {
  isBackgroundPloggingSnapshotForSession,
  readBackgroundPloggingSnapshot,
} from "@/src/features/plogging-session/services/plogging-background-store";
import { stopPloggingBackgroundLocation } from "@/src/features/plogging-session/services/plogging-background-location";
import { useRestroomToggle } from "@/src/features/public-facilities";
import { PloggingMap } from "@/src/shared/map";
import { fontFamilies } from "@/src/shared/theme";
import { CenterToast, useTabBarHeight } from "@/src/shared/ui";

import {
  cancelCrewPloggingParticipation,
  cancelCrewPloggingSession,
  endCrewPloggingSession,
  getCrewDetail,
  joinCrewPloggingSession,
  startCrewPloggingSession,
  type CrewDetailResponse,
  type CrewPloggingSessionResponse,
} from "../api";
import {
  CrewErrorState,
  CrewLoadingState,
  CrewScreenHeader,
  getApiErrorMessage,
} from "../components/crew-ui";
import {
  LeaderEndConfirmationModal,
  RecruitingCancelModal,
} from "../components/leader-end-modals";
import {
  useCrewPloggingSessionPolling,
  useCrewPloggingTransitionGuard,
} from "../hooks";
import { resolveCrewPloggingFlow } from "../model";

export function CrewSessionScreen({
  crewId,
  sessionId,
}: {
  crewId: number;
  sessionId: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [crew, setCrew] = useState<CrewDetailResponse | null>(null);
  const [crewError, setCrewError] = useState("");
  const [action, setAction] = useState<
    "join" | "leave" | "cancel" | "start" | "end" | null
  >(null);
  const [endConfirmationVisible, setEndConfirmationVisible] = useState(false);
  const [recruitingCancelMode, setRecruitingCancelMode] = useState<
    "leave" | "cancel" | null
  >(null);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [recenterRequestId, setRecenterRequestId] = useState(0);
  const navigationRef = useRef(false);
  const cancellationAlertRef = useRef(false);
  const polling = useCrewPloggingSessionPolling({ sessionId });
  const { claimTransition, releaseTransition } =
    useCrewPloggingTransitionGuard(String(sessionId));
  const {
    caloriesBurned,
    distanceMeters,
    finishSession,
    finishedAtMs,
    replaceRoutePoints,
    replaceStepCount,
    resetSession,
    routePoints,
    sessionKey,
    setMode: setSessionMode,
    setRecommendedRoutePoints,
    startedAtMs,
    startSession,
    stepCount,
  } = usePloggingSession();
  const {
    noNearbyToiletsMessage,
    noNearbyToiletsNoticeVisible,
    restroomVisible,
    toggleRestroom,
    toiletMarkers,
  } = useRestroomToggle();

  const loadCrew = useCallback(async () => {
    try {
      const response = await getCrewDetail({ crewId });
      setCrew(response);
      setCrewError("");
    } catch (error) {
      setCrewError(getApiErrorMessage(error));
    }
  }, [crewId]);

  useEffect(() => {
    void loadCrew();
  }, [loadCrew]);

  const navigateToPlogging = useCallback(() => {
    if (!crew || navigationRef.current) return;
    navigationRef.current = true;
    router.replace({
      pathname: "/plogging",
      params: {
        crewId: String(crewId),
        role: crew.myRole,
        sessionId: String(sessionId),
      },
    });
  }, [crew, crewId, router, sessionId]);

  const navigateToReport = useCallback(async (current: CrewPloggingSessionResponse) => {
    if (!crew || navigationRef.current) return;
    navigationRef.current = true;

    const backgroundSessionId = `crew:${sessionId}`;
    if (startedAtMs === null || sessionKey !== backgroundSessionId) {
      const snapshot = await readBackgroundPloggingSnapshot().catch(() => null);
      const finishedAt = parseDateTime(current.endedAt) ?? Date.now();
      const startedAt =
        snapshot &&
        isBackgroundPloggingSnapshotForSession(snapshot, backgroundSessionId) &&
        snapshot.startedAtMs !== null
          ? snapshot.startedAtMs
          : parseDateTime(current.startedAt) ?? finishedAt;

      resetSession();
      startSession(startedAt, backgroundSessionId);

      if (
        snapshot &&
        isBackgroundPloggingSnapshotForSession(snapshot, backgroundSessionId)
      ) {
        const route = snapshot.routePoints
          .filter((point) => point.recordedAtMs <= finishedAt)
          .map((point) => ({
            latitude: point.latitude,
            longitude: point.longitude,
          }));
        const cutoffStepSample = [...snapshot.stepSamples]
          .reverse()
          .find((sample) => sample.recordedAtMs <= finishedAt);
        const pausedAtEndMs =
          snapshot.isPaused && snapshot.pausedAtMs !== null
            ? Math.max(0, finishedAt - snapshot.pausedAtMs)
            : 0;

        replaceRoutePoints(route);
        replaceStepCount(
          cutoffStepSample?.stepCount ??
            (snapshot.updatedAtMs <= finishedAt ? snapshot.stepCount : 0)
        );
        finishSession(
          Math.floor((snapshot.pausedTotalMs + pausedAtEndMs) / 1_000),
          finishedAt
        );
      } else {
        finishSession(0, finishedAt);
      }
      await stopPloggingBackgroundLocation().catch(() => undefined);
    }

    router.replace({
      pathname: "/report",
      params: {
        crewId: String(crewId),
        role: crew.myRole,
        sessionId: String(sessionId),
      },
    });
  }, [
    crew,
    crewId,
    finishSession,
    replaceRoutePoints,
    replaceStepCount,
    resetSession,
    router,
    sessionId,
    sessionKey,
    startedAtMs,
    startSession,
  ]);

  const navigateToRecord = useCallback(() => {
    if (navigationRef.current) return;
    navigationRef.current = true;
    resetSession();
    router.replace(`/crews/${crewId}/records/${sessionId}`);
  }, [crewId, resetSession, router, sessionId]);

  useEffect(() => {
    const current = polling.session;
    if (!current || !crew) return;
    const resolved = resolveCrewPloggingFlow(current);

    if (
      resolved.destination === "IDLE" ||
      resolved.destination === "RECRUITING" ||
      resolved.destination === "SUBMISSION_WAITING"
    ) {
      return;
    }
    if (!claimTransition(resolved.transitionKey)) return;

    if (resolved.destination === "ACTIVE_PLOGGING") {
      navigateToPlogging();
      return;
    }
    if (resolved.destination === "PERSONAL_REPORT") {
      if (hasSubmissionDeadlinePassed(current.submissionDeadlineAt)) {
        releaseTransition(resolved.transitionKey);
        return;
      }
      void navigateToReport(current);
      return;
    }
    if (resolved.destination === "COMPLETED_RECORD") {
      navigateToRecord();
      return;
    }
    if (resolved.destination === "CANCELED") {
      if (!cancellationAlertRef.current) {
        cancellationAlertRef.current = true;
        resetSession();
        router.replace(`/crews/${crewId}`);
        Alert.alert(
          "같이줍기 취소",
          "크루장이 같이줍기 모집을 취소했습니다."
        );
      }
      return;
    }

    releaseTransition(resolved.transitionKey);
  }, [
    claimTransition,
    crew,
    crewId,
    navigateToPlogging,
    navigateToRecord,
    navigateToReport,
    polling.session,
    releaseTransition,
    resetSession,
    router,
  ]);

  const performAction = useCallback(
    async (
      nextAction: NonNullable<typeof action>,
      request: () => Promise<CrewPloggingSessionResponse>
    ) => {
      if (action) return null;
      setAction(nextAction);
      try {
        const response = await request();
        await polling.refetch().catch(() => response);
        return response;
      } catch (error) {
        Alert.alert("요청을 처리하지 못했어요", getApiErrorMessage(error));
        await polling.refetch().catch(() => null);
        return null;
      } finally {
        setAction(null);
      }
    },
    [action, polling]
  );

  const handleJoin = useCallback(async () => {
    await performAction("join", () =>
      joinCrewPloggingSession({ sessionId })
    );
  }, [performAction, sessionId]);

  const handleLeave = useCallback(() => {
    setRecruitingCancelMode("leave");
  }, []);

  const handleCancelRecruiting = useCallback(() => {
    setRecruitingCancelMode("cancel");
  }, []);

  const handleConfirmRecruitingCancel = useCallback(async () => {
    const mode = recruitingCancelMode;
    if (!mode) return;
    const response = await performAction(mode, () =>
      mode === "cancel"
        ? cancelCrewPloggingSession({ sessionId })
        : cancelCrewPloggingParticipation({ sessionId })
    );
    if (!response) return;
    setRecruitingCancelMode(null);
    router.replace(`/crews/${crewId}`);
  }, [crewId, performAction, recruitingCancelMode, router, sessionId]);

  const handleStart = useCallback(async () => {
    const response = await performAction("start", () =>
      startCrewPloggingSession({ sessionId })
    );
    if (response?.status === "IN_PROGRESS") navigateToPlogging();
  }, [navigateToPlogging, performAction, sessionId]);

  const handleEndAll = useCallback(async () => {
    const response = await performAction("end", () =>
      endCrewPloggingSession({ sessionId })
    );
    if (response) setEndConfirmationVisible(false);
  }, [performAction, sessionId]);

  if (!crew && crewError) {
    return (
      <View style={styles.root}>
        <CrewScreenHeader onBack={() => router.back()} title="같이줍기" />
        <CrewErrorState message={crewError} onRetry={() => void loadCrew()} />
      </View>
    );
  }

  if (!polling.session && polling.status === "error") {
    return (
      <View style={styles.root}>
        <CrewScreenHeader onBack={() => router.back()} title="같이줍기" />
        <CrewErrorState
          message={polling.errorMessage ?? "같이줍기 상태를 불러오지 못했습니다."}
          onRetry={() => void polling.refetch().catch(() => null)}
        />
      </View>
    );
  }

  if (!crew || !polling.session) {
    return (
      <View style={styles.root}>
        <CrewScreenHeader onBack={() => router.back()} title="같이줍기" />
        <CrewLoadingState />
      </View>
    );
  }

  const current = polling.session;
  const submitted =
    current.recordSubmittedByMe || current.participantStatus === "SUBMITTED";

  if (submitted) {
    const elapsedSeconds =
      startedAtMs !== null && finishedAtMs !== null
        ? Math.max(0, Math.floor((finishedAtMs - startedAtMs) / 1_000))
        : 0;
    return (
      <View style={styles.root}>
        <PloggingMap
          routePoints={routePoints}
          routeVisible={routePoints.length >= 2}
          zoom={17}
        >
          <WaitingSummaryCard
            calories={caloriesBurned}
            distanceMeters={distanceMeters}
            elapsedSeconds={elapsedSeconds}
            stepCount={stepCount}
            top={insets.top + 20}
          />
          <View
            style={[
              styles.waitingPanel,
              {
                bottom: tabBarHeight,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.checkCircle}>
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-photo-check.svg")}
                style={styles.waitingCheckIcon}
              />
            </View>
            <Text style={styles.waitingTitle}>내 기록 제출 완료</Text>
            <Text style={styles.waitingDescription}>
              {crew.myRole === "LEADER" && current.status === "IN_PROGRESS"
                ? "전체 같이줍기를 종료할 시점을 선택해 주세요."
                : current.status === "COMPLETING"
                  ? "다른 크루원의 기록 제출을 기다리고 있어요."
                  : "크루장이 같이줍기를 종료할 때까지 기다려주세요."}
            </Text>
            {current.submissionDeadlineAt && current.status === "COMPLETING" ? (
              <Text style={styles.deadlineText}>
                제출 마감 {formatDeadline(current.submissionDeadlineAt)}
              </Text>
            ) : null}
            {crew.myRole === "LEADER" && current.status === "IN_PROGRESS" ? (
              <Pressable
                onPress={() => setEndConfirmationVisible(true)}
                style={({ pressed }) => [
                  styles.waitingButton,
                  styles.endAllButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.waitingButtonText}>전체 같이줍기 종료</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  resetSession();
                  router.replace("/");
                }}
                style={({ pressed }) => [
                  styles.waitingButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.waitingButtonText}>홈으로</Text>
              </Pressable>
            )}
          </View>
        </PloggingMap>
        <LeaderEndConfirmationModal
          confirming={action === "end"}
          onCancel={() => setEndConfirmationVisible(false)}
          onConfirm={() => void handleEndAll()}
          visible={endConfirmationVisible}
        />
      </View>
    );
  }

  if (current.status !== "RECRUITING") {
    return (
      <View style={styles.root}>
        <PloggingMap zoom={17}>
          <View
            style={[
              styles.unavailablePanel,
              {
                bottom: tabBarHeight,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.unavailableIcon}>
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-state-clock.svg")}
                style={styles.unavailableClockIcon}
              />
            </View>
            <Text style={styles.unavailableTitle}>
              {current.status === "IN_PROGRESS"
                ? "이미 시작된 같이줍기예요"
                : "기록을 제출 중인 같이줍기예요"}
            </Text>
            <Text style={styles.unavailableDescription}>
              모집 중에 참여한 크루원만 이번 같이줍기에 참여할 수 있습니다.
            </Text>
            <Pressable
              onPress={() => router.replace(`/crews/${crewId}`)}
              style={({ pressed }) => [
                styles.waitingButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.waitingButtonText}>크루로 돌아가기</Text>
            </Pressable>
          </View>
        </PloggingMap>
      </View>
    );
  }

  const joined =
    current.joinedByMe ||
    current.participantStatus === "JOINED" ||
    current.participantStatus === "PARTICIPATING";
  const role = crew.myRole;

  return (
    <View style={styles.root}>
      <PloggingMap
        heatmapVisible={heatmapVisible}
        recenterRequestId={recenterRequestId}
        toilets={toiletMarkers}
        zoom={17}
      >
        {role !== "LEADER" && !joined ? (
          <View
            accessibilityRole="tablist"
            style={[styles.freeModeSwitch, { top: insets.top + 24 }]}
          >
            <View
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
              style={styles.freeModeActive}
            >
              <Text style={styles.freeModeText}>자유모드</Text>
            </View>
            <View
              accessibilityRole="tab"
              accessibilityState={{ disabled: true }}
              style={styles.aiModeDisabled}
            >
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-ai.svg")}
                style={styles.aiModeIcon}
              />
              <Text style={styles.aiModeText}>AI 경로추천</Text>
            </View>
          </View>
        ) : null}
        <SessionMapControls
          heatmapActive={heatmapVisible}
          onToggleHeatmap={() => setHeatmapVisible((value) => !value)}
          onToggleRestroom={toggleRestroom}
          restroomActive={restroomVisible}
          top={Math.max(insets.top, 44) + 146}
        />
        <CenterToast
          message={noNearbyToiletsMessage}
          visible={noNearbyToiletsNoticeVisible}
        />

        <View
          style={[
            styles.recruitingArea,
            {
              bottom:
                tabBarHeight + 175,
            },
          ]}
        >
          <View style={styles.recruitingPill}>
            <View style={styles.recruitingCopyPill}>
              <Text numberOfLines={1} style={styles.recruitingText}>
                <Text style={styles.recruitingStrongText}>{crew.name}</Text>{" "}
                {role === "LEADER" || joined ? (
                  <>
                    같이 뛰기 모집중{" "}
                    <Text style={styles.recruitingCountText}>
                      {current.participantCount}명 참여 중
                    </Text>
                  </>
                ) : (
                  "같이 뛰기 모집!"
                )}
              </Text>
            </View>
            {role === "LEADER" || joined ? (
              <Pressable
                disabled={action !== null}
                hitSlop={8}
                onPress={role === "LEADER" ? handleCancelRecruiting : handleLeave}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>취소하기</Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={action !== null}
                onPress={() => void handleJoin()}
                style={styles.joinButton}
              >
                <Text style={styles.joinText}>
                  {action === "join" ? "참여 중" : "참가하기"}
                </Text>
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityLabel="현재 위치로 지도 이동"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRecenterRequestId((value) => value + 1)}
            style={({ pressed }) => [
              styles.locationPill,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.locationText}>위치로 돌아가기</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.bottomActions,
            {
              bottom:
                tabBarHeight + 43,
            },
          ]}
        >
          <View style={styles.sideAction}>
            <View style={styles.sideCircle}>
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-session-users.svg")}
                style={styles.sessionUsersIcon}
              />
            </View>
            <Text style={styles.sideLabel}>같이 줍기</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: (role !== "LEADER" && joined) || action !== null,
            }}
            disabled={(role !== "LEADER" && joined) || action !== null}
            onPress={() => {
              if (role !== "LEADER" && !joined) {
                setSessionMode("FREE");
                setRecommendedRoutePoints([]);
                router.push("/plogging");
                return;
              }
              void handleStart();
            }}
            style={({ pressed }) => [
              styles.startButton,
              role !== "LEADER" && joined
                ? styles.startButtonWaiting
                : null,
              pressed ? styles.pressed : null,
            ]}
          >
            {action === "start" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.startText}>
                {role === "LEADER" ? "시작" : joined ? "대기 중" : "시작"}
              </Text>
            )}
          </Pressable>
          <View style={styles.sideAction}>
            <View style={styles.sideCircle}>
              <Image
                contentFit="contain"
                source={require("@/assets/icons/crew-session-trash.svg")}
                style={styles.sessionTrashIcon}
              />
            </View>
            <Text style={styles.sideLabel}>쓰레기 제보</Text>
          </View>
        </View>
      </PloggingMap>
      <RecruitingCancelModal
        confirming={action === "leave" || action === "cancel"}
        onCancel={() => setRecruitingCancelMode(null)}
        onConfirm={() => void handleConfirmRecruitingCancel()}
        visible={recruitingCancelMode !== null}
      />
    </View>
  );
}

function WaitingSummaryCard({
  calories,
  distanceMeters,
  elapsedSeconds,
  stepCount,
  top,
}: {
  calories: number;
  distanceMeters: number;
  elapsedSeconds: number;
  stepCount: number;
  top: number;
}) {
  const hours = Math.floor(elapsedSeconds / 3_600);
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60);
  const seconds = elapsedSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");
  return (
    <View style={[styles.summaryCard, { top }]}>
      <View style={styles.summaryModeTag}>
        <Text style={styles.summaryModeText}>자유모드</Text>
      </View>
      <Text style={styles.summaryTimer}>
        {hours > 0
          ? `${hours} : ${paddedMinutes} : ${paddedSeconds}`
          : `${paddedMinutes} : ${paddedSeconds}`}
      </Text>
      <View style={styles.summaryStatsRow}>
        <SummaryStat label="거리" unit="km" value={(distanceMeters / 1_000).toFixed(1)} />
        <SummaryStat label="걸음" unit="step" value={Math.round(stepCount).toLocaleString("ko-KR")} />
        <SummaryStat label="예상 칼로리" unit="kcal" value={Math.round(calories).toLocaleString("ko-KR")} />
      </View>
    </View>
  );
}

function SummaryStat({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryStatValue}>
        {value} <Text style={styles.summaryStatUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

function SessionMapControls({
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
    <View style={[styles.sessionMapControls, { top }] }>
      <Pressable
        accessibilityLabel={heatmapActive ? "히트맵 숨기기" : "히트맵 표시"}
        accessibilityRole="button"
        accessibilityState={{ selected: heatmapActive }}
        onPress={onToggleHeatmap}
        style={({ pressed }) => [
          styles.mapControlButton,
          heatmapActive ? styles.mapControlButtonActive : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Image
          contentFit="contain"
          source={require("@/assets/icons/map-control-heatmap.svg")}
          style={styles.mapControlIcon}
          tintColor={heatmapActive ? "#FFFFFF" : null}
        />
      </Pressable>
      <Pressable
        accessibilityLabel={restroomActive ? "화장실 숨기기" : "화장실 표시"}
        accessibilityRole="button"
        accessibilityState={{ selected: restroomActive }}
        onPress={onToggleRestroom}
        style={({ pressed }) => [
          styles.mapControlButton,
          restroomActive ? styles.mapControlButtonActive : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Image
          contentFit="contain"
          source={require("@/assets/icons/map-control-restroom.svg")}
          style={styles.mapControlIcon}
          tintColor={restroomActive ? "#FFFFFF" : null}
        />
      </Pressable>
    </View>
  );
}

function formatDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseDateTime(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function hasSubmissionDeadlinePassed(value: string | null): boolean {
  if (!value) return false;
  const deadlineMs = new Date(value).getTime();
  return Number.isFinite(deadlineMs) && Date.now() >= deadlineMs;
}

const styles = StyleSheet.create({
  aiModeDisabled: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 38,
    justifyContent: "center",
    marginLeft: 16,
  },
  aiModeIcon: {
    height: 16,
    width: 16,
  },
  aiModeText: {
    color: "#1B6CAE",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  bottomActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 42,
    position: "absolute",
    right: 42,
  },
  cancelText: {
    color: "#FF383C",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    borderColor: "#F29B38",
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  checkCircle: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#2A88CD",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  deadlineText: {
    color: "#A3A3A3",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
  endAllButton: {
    backgroundColor: "#FF383C",
  },
  freeModeActive: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    boxShadow: "0 0 8.85px rgba(0,0,0,0.09)",
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  freeModeSwitch: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    boxShadow: "0 0 9.8px rgba(0,0,0,0.09)",
    flexDirection: "row",
    height: 46,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 12,
    paddingTop: 4,
    position: "absolute",
  },
  freeModeText: {
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    letterSpacing: -0.32,
  },
  joinButton: {
    backgroundColor: "#F29B38",
    borderRadius: 32,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  joinText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
  },
  locationPill: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 32,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationText: {
    color: "#121212",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  mapControlButton: {
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 24,
    boxShadow: "0 0 20.6px rgba(0,0,0,0.09)",
    elevation: 3,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  mapControlButtonActive: {
    backgroundColor: "#0A0A0A",
  },
  mapControlIcon: {
    height: 28,
    width: 28,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  recruitingArea: {
    alignItems: "center",
    left: 12,
    position: "absolute",
    right: 12,
  },
  recruitingPill: {
    alignItems: "center",
    flexDirection: "row",
    maxWidth: "100%",
  },
  recruitingCopyPill: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 32,
    borderColor: "#F29B38",
    borderTopLeftRadius: 32,
    borderWidth: 2,
    flexShrink: 1,
    marginRight: -15,
    paddingLeft: 14,
    paddingRight: 20,
    paddingVertical: 7,
  },
  recruitingCountText: {
    fontFamily: fontFamilies.gothicA1SemiBold,
  },
  recruitingText: {
    color: "#121212",
    flexShrink: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  recruitingStrongText: {
    fontFamily: fontFamilies.semiBold,
  },
  root: {
    backgroundColor: "#FAFAFA",
    flex: 1,
  },
  sideAction: {
    alignItems: "center",
    width: 54,
  },
  sideCircle: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    boxShadow: "0 0 20.6px rgba(0,0,0,0.09)",
    elevation: 3,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  sideLabel: {
    color: "#0A0A0A",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    letterSpacing: -0.24,
    marginTop: 8,
    textAlign: "center",
  },
  startButton: {
    alignItems: "center",
    backgroundColor: "#2A88CD",
    borderRadius: 44,
    boxShadow: "0 0 20.6px rgba(0,0,0,0.09)",
    elevation: 4,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  startButtonWaiting: {
    backgroundColor: "#8DC3EC",
  },
  startText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 20,
    letterSpacing: 0.2,
  },
  sessionTrashIcon: {
    height: 23,
    width: 26,
  },
  sessionUsersIcon: {
    height: 32,
    width: 32,
  },
  sessionMapControls: {
    gap: 26,
    position: "absolute",
    right: 24,
  },
  summaryCard: {
    backgroundColor: "rgba(242,247,253,0.9)",
    borderColor: "#C3DEF4",
    borderRadius: 12,
    borderWidth: 3,
    height: 154,
    left: 15,
    paddingHorizontal: 30,
    paddingTop: 18,
    position: "absolute",
    right: 15,
  },
  summaryModeTag: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E4EFFA",
    borderColor: "#C3DEF4",
    borderRadius: 23,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  summaryModeText: {
    color: "#174A75",
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
  },
  summaryStat: {
    flex: 1,
    minWidth: 0,
  },
  summaryStatLabel: {
    color: "#193F61",
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
  },
  summaryStatsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 8,
  },
  summaryStatUnit: {
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 10,
  },
  summaryStatValue: {
    color: "#102841",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 16,
    marginTop: 4,
  },
  summaryTimer: {
    color: "#121212",
    fontFamily: fontFamilies.giantsRegular,
    fontSize: 32,
    letterSpacing: -2.1,
    marginTop: 8,
  },
  unavailableDescription: {
    color: "#5C635C",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  unavailableIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#F2F7FD",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  unavailableClockIcon: {
    height: 20,
    width: 20,
  },
  unavailablePanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
    elevation: 12,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 22,
    position: "absolute",
    right: 0,
  },
  unavailableTitle: {
    color: "#141C14",
    fontFamily: fontFamilies.extraBold,
    fontSize: 18,
    lineHeight: 25,
    marginTop: 10,
    textAlign: "center",
  },
  waitingButton: {
    alignItems: "center",
    backgroundColor: "#449DDD",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    marginTop: 20,
    width: "100%",
  },
  waitingButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    letterSpacing: -0.36,
  },
  waitingDescription: {
    color: "#5C635C",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  waitingPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
    elevation: 12,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 22,
    position: "absolute",
    right: 0,
  },
  waitingTitle: {
    color: "#141C14",
    fontFamily: fontFamilies.extraBold,
    fontSize: 18,
    lineHeight: 25,
    marginTop: 10,
    textAlign: "center",
  },
  waitingCheckIcon: {
    height: 15,
    width: 15,
  },
});
