import { Alert, Linking } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import "./plogging-background-location-task";
import {
  PLOGGING_LOCATION_TASK_NAME,
  resetBackgroundPloggingSession,
  setBackgroundPloggingPaused,
  stopBackgroundPloggingSession,
} from "./plogging-background-store";

export type BackgroundTrackingStartResult =
  | { status: "started" }
  | { status: "foreground-only"; message: string }
  | { status: "denied"; message: string };

const BACKGROUND_PERMISSION_MESSAGE =
  "화면을 끄거나 다른 앱을 사용해도 플로깅 경로를 기록하려면 위치 권한을 항상 허용으로 설정해주세요.";

export async function startPloggingBackgroundLocation({
  startedAtMs,
}: {
  startedAtMs: number;
}): Promise<BackgroundTrackingStartResult> {
  const foreground = await ensureForegroundPermission();
  if (foreground !== "granted") {
    return {
      status: "denied",
      message: "위치 권한이 없어 플로깅 경로를 기록할 수 없습니다.",
    };
  }

  const background = await ensureBackgroundPermission();
  if (background !== "granted") {
    return {
      status: "foreground-only",
      message:
        "백그라운드 위치 권한이 없어 앱이 열린 동안에만 경로를 기록합니다.",
    };
  }

  const taskAvailable = await TaskManager.isAvailableAsync();
  if (!taskAvailable) {
    return {
      status: "foreground-only",
      message:
        "현재 실행 환경에서는 백그라운드 위치 기록을 사용할 수 없습니다. 개발 빌드나 실제 앱 빌드에서 동작합니다.",
    };
  }

  await resetBackgroundPloggingSession({
    sessionId: String(startedAtMs),
    startedAtMs,
  });

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    PLOGGING_LOCATION_TASK_NAME
  );
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(PLOGGING_LOCATION_TASK_NAME);
  }

  await Location.startLocationUpdatesAsync(PLOGGING_LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    activityType: Location.ActivityType.Fitness,
    distanceInterval: 5,
    foregroundService: {
      killServiceOnDestroy: false,
      notificationBody: "화면을 꺼도 거리와 경로를 계속 기록합니다.",
      notificationColor: "#449DDD",
      notificationTitle: "플로버 플로깅 기록 중",
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    timeInterval: 2_000,
  });

  return { status: "started" };
}

export async function stopPloggingBackgroundLocation() {
  await stopBackgroundPloggingSession();

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(
      PLOGGING_LOCATION_TASK_NAME
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(PLOGGING_LOCATION_TASK_NAME);
    }
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-background-location] stop failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
  }
}

export async function pausePloggingBackgroundLocation(isPaused: boolean) {
  await setBackgroundPloggingPaused(isPaused);
}

async function ensureForegroundPermission() {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted") return "granted";
  if (!current.canAskAgain) {
    showSettingsAlert(
      "위치 권한이 필요합니다",
      "플로깅 경로를 기록하려면 설정에서 위치 권한을 허용해주세요."
    );
    return current.status;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status;
}

async function ensureBackgroundPermission() {
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.status === "granted") return "granted";

  if (!current.canAskAgain) {
    showSettingsAlert("백그라운드 위치 권한이 필요합니다", BACKGROUND_PERMISSION_MESSAGE);
    return current.status;
  }

  const requested = await Location.requestBackgroundPermissionsAsync();
  if (requested.status !== "granted") {
    showSettingsAlert("백그라운드 위치 권한이 필요합니다", BACKGROUND_PERMISSION_MESSAGE);
  }
  return requested.status;
}

function showSettingsAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { style: "cancel", text: "취소" },
    {
      onPress: () => {
        Linking.openSettings().catch(() => undefined);
      },
      text: "설정 열기",
    },
  ]);
}
