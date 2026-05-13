import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";

let locationSettingsAlertVisible = false;

export async function ensureForegroundLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  let status = current.status;

  if (status !== "granted" && current.canAskAgain) {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status === "granted") {
    return true;
  }

  showLocationSettingsAlert();
  return false;
}

export function showLocationSettingsAlert() {
  if (locationSettingsAlertVisible) return;

  locationSettingsAlertVisible = true;
  Alert.alert(
    "위치 권한을 켜주세요",
    Platform.OS === "ios"
      ? "플로깅 경로를 기록하려면 설정에서 위치 접근을 '앱을 사용하는 동안'으로 허용해주세요."
      : "플로깅 경로를 기록하려면 설정에서 위치 권한을 허용해주세요.",
    [
      {
        onPress: () => {
          locationSettingsAlertVisible = false;
        },
        style: "cancel",
        text: "나중에",
      },
      {
        text: "설정 열기",
        onPress: () => {
          locationSettingsAlertVisible = false;
          openAppSettings();
        },
      },
    ]
  );
}

function openAppSettings() {
  Linking.openSettings().catch(() => {
    if (Platform.OS !== "ios") return;
    Linking.openURL("app-settings:").catch(() => {
      // 설정 진입 실패는 무시
    });
  });
}
