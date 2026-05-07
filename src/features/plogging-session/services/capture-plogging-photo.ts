import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";

export type CapturePloggingPhotoResult =
  | { status: "captured"; uri: string }
  | { status: "canceled" }
  | { status: "permission-denied" }
  | { status: "error"; message: string };

export async function capturePloggingPhoto(): Promise<CapturePloggingPhotoResult> {
  try {
    const permission = await ensureCameraPermission();
    if (!permission.granted) {
      if (permission.canAskAgain === false) {
        showOpenSettingsAlert();
      }
      return { status: "permission-denied" };
    }

    if (__DEV__) {
      console.log("[plogging-photo] launching camera");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      exif: false,
    });

    if (result.canceled) {
      if (__DEV__) {
        console.log("[plogging-photo] capture canceled");
      }
      return { status: "canceled" };
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      return { status: "error", message: "촬영된 사진을 찾을 수 없습니다." };
    }

    if (__DEV__) {
      console.log("[plogging-photo] captured", {
        height: asset.height,
        width: asset.width,
      });
    }

    return { status: "captured", uri: asset.uri };
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-photo] capture failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "사진 촬영 중 문제가 발생했습니다.",
    };
  }
}

async function ensureCameraPermission() {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) {
    return current;
  }
  if (!current.canAskAgain) {
    return current;
  }
  return ImagePicker.requestCameraPermissionsAsync();
}

function showOpenSettingsAlert() {
  Alert.alert(
    "카메라 권한이 필요합니다",
    "플로깅 인증샷을 촬영하려면 설정에서 카메라 권한을 허용해주세요.",
    [
      { style: "cancel", text: "취소" },
      {
        text: "설정 열기",
        onPress: () => {
          Linking.openSettings().catch(() => {
            // 설정 앱 진입 실패는 무시 — 사용자가 수동으로 열어야 함
          });
        },
      },
    ]
  );
}
