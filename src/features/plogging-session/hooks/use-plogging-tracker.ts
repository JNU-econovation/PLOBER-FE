import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";

import { usePloggingSession } from "./use-plogging-session";
import {
  pausePloggingBackgroundLocation,
  startPloggingBackgroundLocation,
  stopPloggingBackgroundLocation,
} from "../services/plogging-background-location";
import {
  appendBackgroundPloggingLocations,
  isBackgroundPloggingSnapshotForSession,
  readBackgroundPloggingSnapshot,
  setBackgroundPloggingStepCount,
  subscribeBackgroundPloggingSnapshot,
  type BackgroundPloggingSnapshot,
} from "../services/plogging-background-store";

type PermissionStatus = "idle" | "granted" | "denied" | "unavailable";
type BackgroundTrackingStatus =
  | "idle"
  | "running"
  | "foreground-only"
  | "unavailable";

export type PloggingTrackerState = {
  backgroundLocationPermission: PermissionStatus;
  backgroundTracking: BackgroundTrackingStatus;
  locationPermission: PermissionStatus;
  pedometerPermission: PermissionStatus;
  pedometerAvailable: boolean;
};

type UsePloggingTrackerOptions = {
  enabled?: boolean;
  isPaused: boolean;
  sessionId?: string;
  startedAtMs: number;
};

// 노이즈가 큰 좌표는 누적 거리를 부풀리므로 정확도가 30m보다 나쁜 좌표는 버린다.
const ACCURACY_THRESHOLD_METERS = 30;

export function usePloggingTracker({
  enabled = true,
  isPaused,
  sessionId,
  startedAtMs,
}: UsePloggingTrackerOptions): PloggingTrackerState {
  const {
    addSteps,
    appendRoutePoints,
    setPlaceName,
    stepCount,
  } = usePloggingSession();
  const backgroundSessionId = sessionId ?? String(startedAtMs);

  const [locationPermission, setLocationPermission] =
    useState<PermissionStatus>("idle");
  const [backgroundLocationPermission, setBackgroundLocationPermission] =
    useState<PermissionStatus>("idle");
  const [backgroundTracking, setBackgroundTracking] =
    useState<BackgroundTrackingStatus>("idle");
  const [pedometerPermission, setPedometerPermission] =
    useState<PermissionStatus>("idle");
  const [pedometerAvailable, setPedometerAvailable] = useState(false);

  const isPausedRef = useRef(isPaused);
  const appBackgroundedAtRef = useRef<number | null>(null);
  const appliedBackgroundRouteCursorRef = useRef<{
    key: string;
    recordedAtMs: number;
  } | null>(null);
  const appliedBackgroundStepCountRef = useRef(0);
  const lastPedometerStepsRef = useRef<number | null>(null);
  const placeNameSetRef = useRef(false);
  const skipNextPedometerBaselineRef = useRef(false);
  const pedometerSyncInProgressRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const applyBackgroundSnapshot = useCallback(
    (snapshot: BackgroundPloggingSnapshot) => {
      if (
        !isBackgroundPloggingSnapshotForSession(
          snapshot,
          backgroundSessionId
        )
      ) {
        appliedBackgroundRouteCursorRef.current = null;
        appliedBackgroundStepCountRef.current = 0;
        return;
      }

      let firstNewPointIndex = 0;
      const cursor = appliedBackgroundRouteCursorRef.current;
      if (cursor) {
        const cursorIndex = snapshot.routePoints.findIndex(
          (point) => getBackgroundRoutePointKey(point) === cursor.key,
        );
        if (cursorIndex >= 0) {
          firstNewPointIndex = cursorIndex + 1;
        } else {
          const newerPointIndex = snapshot.routePoints.findIndex(
            (point) => point.recordedAtMs > cursor.recordedAtMs,
          );
          firstNewPointIndex =
            newerPointIndex < 0
              ? snapshot.routePoints.length
              : newerPointIndex;
        }
      }

      const newPoints = snapshot.routePoints
        .slice(firstNewPointIndex)
        .map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));

      if (newPoints.length > 0) {
        appendRoutePoints(newPoints);
        const lastPoint = snapshot.routePoints[snapshot.routePoints.length - 1];
        if (lastPoint) {
          appliedBackgroundRouteCursorRef.current = {
            key: getBackgroundRoutePointKey(lastPoint),
            recordedAtMs: lastPoint.recordedAtMs,
          };
        }

        if (!placeNameSetRef.current) {
          placeNameSetRef.current = true;
          resolvePlaceName(newPoints[0]).then((name) => {
            if (name) setPlaceName(name);
          });
        }
      }

      const stepDelta =
        snapshot.stepCount - appliedBackgroundStepCountRef.current;
      if (stepDelta > 0) addSteps(stepDelta);
      appliedBackgroundStepCountRef.current = Math.max(
        appliedBackgroundStepCountRef.current,
        snapshot.stepCount
      );
    },
    [addSteps, appendRoutePoints, backgroundSessionId, setPlaceName]
  );

  useEffect(() => {
    if (!enabled) return;
    return subscribeBackgroundPloggingSnapshot(applyBackgroundSnapshot);
  }, [applyBackgroundSnapshot, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const intervalId = setInterval(() => {
      readBackgroundPloggingSnapshot()
        .then(applyBackgroundSnapshot)
        .catch(() => undefined);
    }, 2_000);

    return () => clearInterval(intervalId);
  }, [applyBackgroundSnapshot, enabled]);

  // 백그라운드 GPS 태스크를 우선 사용하고, 현재 실행 환경에서 불가능하면 기존 foreground watch로 폴백한다.
  useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const backgroundResult = await startPloggingBackgroundLocation({
          sessionId: backgroundSessionId,
          startedAtMs,
        });
        if (cancelled) return;

        const currentSnapshot = await readBackgroundPloggingSnapshot().catch(
          () => null
        );
        if (!cancelled && currentSnapshot) {
          applyBackgroundSnapshot(currentSnapshot);
        }

        if (backgroundResult.status === "started") {
          setLocationPermission("granted");
          setBackgroundLocationPermission("granted");
          setBackgroundTracking("running");

          return;
        }

        if (backgroundResult.status === "denied") {
          setLocationPermission("denied");
          setBackgroundLocationPermission("denied");
          setBackgroundTracking("unavailable");
          return;
        }

        if (__DEV__) {
          console.log("[plogging-tracker] foreground fallback", {
            message: backgroundResult.message,
          });
        }

        setLocationPermission("granted");
        setBackgroundLocationPermission("denied");
        setBackgroundTracking("foreground-only");

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 2_000,
          },
          (event) => {
            if (isPausedRef.current) return;
            if (
              typeof event.coords.accuracy === "number" &&
              event.coords.accuracy > ACCURACY_THRESHOLD_METERS
            ) {
              return;
            }
            const point = {
              latitude: event.coords.latitude,
              longitude: event.coords.longitude,
            };
            void appendBackgroundPloggingLocations([
              {
                accuracy: event.coords.accuracy ?? null,
                ...point,
                recordedAtMs: event.timestamp,
              },
            ]);

            if (!placeNameSetRef.current) {
              placeNameSetRef.current = true;
              resolvePlaceName(point).then((name) => {
                if (name) setPlaceName(name);
              });
            }
          }
        );
      } catch (error) {
        if (__DEV__) {
          console.log("[plogging-tracker] location error", {
            message:
              error instanceof Error ? error.message : "unknown location error",
          });
        }
        if (!cancelled) {
          setBackgroundTracking("unavailable");
          setBackgroundLocationPermission("unavailable");
          setLocationPermission("denied");
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      void stopPloggingBackgroundLocation();
    };
  }, [
    applyBackgroundSnapshot,
    backgroundSessionId,
    enabled,
    setPlaceName,
    startedAtMs,
  ]);

  useEffect(() => {
    if (!enabled) return;
    void pausePloggingBackgroundLocation(isPaused);
  }, [enabled, isPaused]);

  useEffect(() => {
    if (!enabled) return;
    appliedBackgroundStepCountRef.current = Math.max(
      appliedBackgroundStepCountRef.current,
      stepCount
    );
    void setBackgroundPloggingStepCount(stepCount);
  }, [enabled, stepCount]);

  // 만보기 가용성 + 권한 + 구독
  useEffect(() => {
    if (!enabled) return;
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    let cancelled = false;

    (async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        if (cancelled) return;
        setPedometerAvailable(available);
        if (!available) {
          setPedometerPermission("unavailable");
          return;
        }

        const current = await Pedometer.getPermissionsAsync();
        let status = current.status;
        let canAskAgain = current.canAskAgain;

        if (status !== "granted" && canAskAgain) {
          const requested = await Pedometer.requestPermissionsAsync();
          status = requested.status;
          canAskAgain = requested.canAskAgain;
        }

        if (cancelled) return;

        if (status !== "granted") {
          setPedometerPermission("denied");
          if (!canAskAgain) {
            showSettingsAlert(
              "동작 인식 권한이 필요합니다",
              "걸음 수 측정을 위해 설정에서 동작/체력 권한을 허용해주세요."
            );
          }
          return;
        }

        setPedometerPermission("granted");

        if (__DEV__) {
          console.log("[plogging-pedometer] starting watch");
        }

        lastPedometerStepsRef.current = null;
        subscription = Pedometer.watchStepCount((event) => {
          const observedSteps = toWholeStepCount(event.steps);
          if (observedSteps === null) return;

          if (pedometerSyncInProgressRef.current) {
            lastPedometerStepsRef.current = observedSteps;
            return;
          }

          const previousSteps = lastPedometerStepsRef.current;
          lastPedometerStepsRef.current = observedSteps;

          if (previousSteps === null) {
            if (skipNextPedometerBaselineRef.current) {
              skipNextPedometerBaselineRef.current = false;
              return;
            }

            if (!isPausedRef.current && observedSteps > 0) {
              addSteps(observedSteps);
            }
            return;
          }

          // Native pedometer updates are cumulative since the native watch started.
          // If the native watch restarts and the value drops, use the new value as
          // the baseline rather than subtracting across two different counters.
          if (observedSteps < previousSteps) {
            return;
          }

          const delta = observedSteps - previousSteps;
          if (isPausedRef.current || delta <= 0) return;
          addSteps(delta);
        });
      } catch (error) {
        if (__DEV__) {
          console.log("[plogging-pedometer] error", {
            message:
              error instanceof Error
                ? error.message
                : "unknown pedometer error",
          });
        }
        if (!cancelled) setPedometerPermission("denied");
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [addSteps, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        appBackgroundedAtRef.current ??= Date.now();
        return;
      }

      if (nextState !== "active") return;

      readBackgroundPloggingSnapshot()
        .then(applyBackgroundSnapshot)
        .catch(() => undefined);

      const backgroundedAt = appBackgroundedAtRef.current;
      appBackgroundedAtRef.current = null;

      if (
        backgroundedAt === null ||
        isPausedRef.current ||
        Platform.OS !== "ios"
      ) {
        return;
      }

      pedometerSyncInProgressRef.current = true;
      const syncUntil = Date.now();
      syncPedometerSteps(backgroundedAt, syncUntil, addSteps)
        .then((synced) => {
          if (synced) {
            lastPedometerStepsRef.current = null;
            skipNextPedometerBaselineRef.current = true;
          }
        })
        .finally(() => {
          // 포그라운드 watch가 백그라운드 누적분을 다시 전달하더라도
          // 동기화 구간을 중복 가산하지 않도록 새 기준점부터 재개한다.
          lastPedometerStepsRef.current = null;
          skipNextPedometerBaselineRef.current = true;
          pedometerSyncInProgressRef.current = false;
        });
    });

    return () => subscription.remove();
  }, [addSteps, applyBackgroundSnapshot, enabled]);

  return {
    backgroundLocationPermission,
    backgroundTracking,
    locationPermission,
    pedometerAvailable,
    pedometerPermission,
  };
}

function getBackgroundRoutePointKey(point: {
  latitude: number;
  longitude: number;
  recordedAtMs: number;
}): string {
  return `${point.recordedAtMs}:${point.latitude}:${point.longitude}`;
}

async function syncPedometerSteps(
  fromMs: number,
  toMs: number,
  addSteps: (delta: number) => void
): Promise<boolean> {
  if (toMs <= fromMs) return false;

  try {
    const result = await Pedometer.getStepCountAsync(
      new Date(fromMs),
      new Date(toMs)
    );
    const steps = toWholeStepCount(result.steps);
    if (steps === null || steps <= 0) return false;
    addSteps(steps);
    return true;
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-pedometer] background sync skipped", {
        message:
          error instanceof Error ? error.message : "unknown pedometer error",
      });
    }
    return false;
  }
}

async function resolvePlaceName(point: {
  latitude: number;
  longitude: number;
}): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync(point);
    const first = results[0];
    if (!first) return null;
    // 한국 주소 우선순위: 동/읍/면 → 시/구 → 도로명 → 이름
    return (
      first.district ??
      first.subregion ??
      first.city ??
      first.street ??
      first.name ??
      null
    );
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-tracker] reverse geocode failed", {
        message:
          error instanceof Error ? error.message : "unknown geocode error",
      });
    }
    return null;
  }
}

function toWholeStepCount(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function showSettingsAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { style: "cancel", text: "취소" },
    {
      text: "설정 열기",
      onPress: () => {
        Linking.openSettings().catch(() => {
          // 설정 진입 실패는 무시
        });
      },
    },
  ]);
}
