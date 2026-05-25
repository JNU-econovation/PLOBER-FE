import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as Location from "expo-location";

// 부정확한 좌표는 지도 카메라 점프를 유발하므로 버린다.
const ACCURACY_THRESHOLD_METERS = 50;
// 첫 위치가 잡히기 전에는 실내 GPS 오차를 감안해 조금 더 관대하게 받는다.
const INITIAL_ACCURACY_THRESHOLD_METERS = 200;

export type DevicePosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export type LocationPermissionStatus =
  | "idle"
  | "granted"
  | "denied"
  | "unavailable";

export type DeviceLocationState = {
  permission: LocationPermissionStatus;
  position: DevicePosition | null;
};

const DeviceLocationContext = createContext<DeviceLocationState | null>(null);

// 앱 전역에서 공유되는 사용자 현재 위치.
// Naver SDK의 자체 위치 캐시(서울 폴백)를 우회하기 위해 Expo Location으로 직접 관리한다.
export function DeviceLocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DeviceLocationState>({
    permission: "idle",
    position: null,
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    let hasResolvedPosition = false;

    (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        let permissionStatus = current.status;
        if (permissionStatus !== "granted" && current.canAskAgain) {
          const requested = await Location.requestForegroundPermissionsAsync();
          permissionStatus = requested.status;
        }
        if (cancelled) return;
        if (permissionStatus !== "granted") {
          if (__DEV__) {
            console.log("[device-location] permission denied", {
              permissionStatus,
            });
          }
          setState({ permission: "denied", position: null });
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (cancelled) return;

        const lastKnownAccurate =
          lastKnown &&
          isAccurateEnough(
            lastKnown.coords.accuracy,
            INITIAL_ACCURACY_THRESHOLD_METERS
          );
        hasResolvedPosition = Boolean(lastKnownAccurate);

        setState({
          permission: "granted",
          position: lastKnownAccurate
            ? {
                latitude: lastKnown.coords.latitude,
                longitude: lastKnown.coords.longitude,
                accuracy: lastKnown.coords.accuracy,
                timestamp: lastKnown.timestamp,
              }
            : null,
        });

        if (__DEV__) {
          console.log("[device-location] permission granted", {
            usedLastKnown: Boolean(lastKnownAccurate),
            lastKnownAccuracy: lastKnown?.coords.accuracy,
          });
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 3_000,
          },
          (event) => {
            const accuracyThreshold = hasResolvedPosition
              ? ACCURACY_THRESHOLD_METERS
              : INITIAL_ACCURACY_THRESHOLD_METERS;
            if (
              typeof event.coords.accuracy === "number" &&
              event.coords.accuracy > accuracyThreshold
            ) {
              return;
            }
            hasResolvedPosition = true;
            setState({
              permission: "granted",
              position: {
                latitude: event.coords.latitude,
                longitude: event.coords.longitude,
                accuracy: event.coords.accuracy,
                timestamp: event.timestamp,
              },
            });
          }
        );
      } catch (error) {
        if (cancelled) return;
        if (__DEV__) {
          console.log("[device-location] error", {
            message: error instanceof Error ? error.message : "unknown",
          });
        }
        setState({ permission: "unavailable", position: null });
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return (
    <DeviceLocationContext.Provider value={state}>
      {children}
    </DeviceLocationContext.Provider>
  );
}

function isAccurateEnough(accuracy: number | null, threshold: number): boolean {
  return typeof accuracy !== "number" || accuracy <= threshold;
}

export function useDeviceLocation(): DeviceLocationState {
  const ctx = useContext(DeviceLocationContext);
  if (!ctx) {
    throw new Error(
      "useDeviceLocation must be used within DeviceLocationProvider."
    );
  }
  return ctx;
}
