import { useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";

import { ensureForegroundLocationPermission } from "@/src/shared/location/permissions";

import { usePloggingSession } from "./use-plogging-session";

type PermissionStatus = "idle" | "granted" | "denied" | "unavailable";

export type PloggingTrackerState = {
  locationPermission: PermissionStatus;
  pedometerPermission: PermissionStatus;
  pedometerAvailable: boolean;
};

type UsePloggingTrackerOptions = {
  isPaused: boolean;
};

// 노이즈가 큰 좌표는 누적 거리를 부풀리므로 정확도가 30m보다 나쁜 좌표는 버린다.
const ACCURACY_THRESHOLD_METERS = 30;

export function usePloggingTracker({
  isPaused,
}: UsePloggingTrackerOptions): PloggingTrackerState {
  const { addSteps, appendRoutePoint, setPlaceName } = usePloggingSession();

  const [locationPermission, setLocationPermission] =
    useState<PermissionStatus>("idle");
  const [pedometerPermission, setPedometerPermission] =
    useState<PermissionStatus>("idle");
  const [pedometerAvailable, setPedometerAvailable] = useState(false);

  const isPausedRef = useRef(isPaused);
  const placeNameSetRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 위치 권한 + 구독
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const hasPermission = await ensureForegroundLocationPermission();
        if (cancelled) return;

        if (!hasPermission) {
          setLocationPermission("denied");
          return;
        }

        setLocationPermission("granted");

        if (__DEV__) {
          console.log("[plogging-tracker] starting location watch");
        }

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
        if (!cancelled) setLocationPermission("denied");
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [appendRoutePoint, setPlaceName]);

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

        subscription = Pedometer.watchStepCount((event) => {
          if (isPausedRef.current) return;
          addSteps(event.steps);
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

  return {
    locationPermission,
    pedometerAvailable,
    pedometerPermission,
  };
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
