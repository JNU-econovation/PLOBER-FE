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
  isPaused: boolean;
  startedAtMs: number;
};

// 노이즈가 큰 좌표는 누적 거리를 부풀리므로 정확도가 30m보다 나쁜 좌표는 버린다.
const ACCURACY_THRESHOLD_METERS = 30;

export function usePloggingTracker({
  isPaused,
  startedAtMs,
}: UsePloggingTrackerOptions): PloggingTrackerState {
  const { addSteps, appendRoutePoint, appendRoutePoints, setPlaceName, stepCount } =
    usePloggingSession();

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
  const appliedBackgroundRouteCountRef = useRef(0);
  const lastPedometerStepsRef = useRef<number | null>(null);
  const placeNameSetRef = useRef(false);
  const skipNextPedometerBaselineRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const applyBackgroundSnapshot = useCallback(
    (snapshot: BackgroundPloggingSnapshot) => {
      if (snapshot.routePoints.length < appliedBackgroundRouteCountRef.current) {
        appliedBackgroundRouteCountRef.current = 0;
      }

      const newPoints = snapshot.routePoints
        .slice(appliedBackgroundRouteCountRef.current)
        .map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));

      if (newPoints.length > 0) {
        appendRoutePoints(newPoints);
        appliedBackgroundRouteCountRef.current = snapshot.routePoints.length;

        if (!placeNameSetRef.current) {
          placeNameSetRef.current = true;
          resolvePlaceName(newPoints[0]).then((name) => {
            if (name) setPlaceName(name);
          });
        }
      }
    },
    [appendRoutePoints, setPlaceName]
  );

  useEffect(() => {
    return subscribeBackgroundPloggingSnapshot(applyBackgroundSnapshot);
  }, [applyBackgroundSnapshot]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      readBackgroundPloggingSnapshot()
        .then(applyBackgroundSnapshot)
        .catch(() => undefined);
    }, 2_000);

    return () => clearInterval(intervalId);
  }, [applyBackgroundSnapshot]);

  // 백그라운드 GPS 태스크를 우선 사용하고, 현재 실행 환경에서 불가능하면 기존 foreground watch로 폴백한다.
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const backgroundResult = await startPloggingBackgroundLocation({
          startedAtMs,
        });
        if (cancelled) return;

        if (backgroundResult.status === "started") {
          setLocationPermission("granted");
          setBackgroundLocationPermission("granted");
          setBackgroundTracking("running");

          const snapshot = await readBackgroundPloggingSnapshot();
          if (!cancelled) applyBackgroundSnapshot(snapshot);
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
            appendRoutePoint(point);

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
  }, [appendRoutePoint, applyBackgroundSnapshot, setPlaceName, startedAtMs]);

  useEffect(() => {
    void pausePloggingBackgroundLocation(isPaused);
  }, [isPaused]);

  useEffect(() => {
    void setBackgroundPloggingStepCount(stepCount);
  }, [stepCount]);

  // 만보기 가용성 + 권한 + 구독
  useEffect(() => {
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
  }, [addSteps]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        appBackgroundedAtRef.current = Date.now();
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

      syncPedometerSteps(backgroundedAt, Date.now(), addSteps).then((synced) => {
        if (synced) {
          lastPedometerStepsRef.current = null;
          skipNextPedometerBaselineRef.current = true;
        }
      });
    });

    return () => subscription.remove();
  }, [addSteps, applyBackgroundSnapshot]);

  return {
    backgroundLocationPermission,
    backgroundTracking,
    locationPermission,
    pedometerAvailable,
    pedometerPermission,
  };
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
