import { initializeKakaoSDK } from "@react-native-kakao/core";
import { login as kakaoLogin, logout as kakaoLogout } from "@react-native-kakao/user";

import { KAKAO_NATIVE_APP_KEY } from "@/src/shared/constants/env";

import { loginWithKakaoToken } from "../api";
import { saveSession } from "./session";

let initialized = false;

function ensureKakaoInitialized() {
  if (initialized) return;
  if (!KAKAO_NATIVE_APP_KEY) {
    throw new Error("카카오 네이티브 앱 키가 설정되지 않았습니다.");
  }
  initializeKakaoSDK(KAKAO_NATIVE_APP_KEY);
  initialized = true;
}

export function isKakaoLoginCanceled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "CANCELED" || code === "Canceled" || code === "E_CANCELLED_OPERATION";
}

export async function signInWithKakao() {
  ensureKakaoInitialized();

  if (__DEV__) {
    console.log("[kakao] sdk login start");
  }

  const result = await kakaoLogin();

  if (__DEV__) {
    console.log("[kakao] sdk login success", {
      accessTokenLength: result.accessToken?.length ?? 0,
      hasRefreshToken: Boolean(result.refreshToken),
    });
  }

  const session = await loginWithKakaoToken(result.accessToken);
  await saveSession(session);

  if (__DEV__) {
    console.log("[kakao] backend login success", {
      hasAccessToken: Boolean(session.accessToken),
      userId: session.userId,
    });
  }

  return session;
}

export async function signOutFromKakao() {
  try {
    ensureKakaoInitialized();
    await kakaoLogout();
  } catch (error) {
    if (__DEV__) {
      console.log("[kakao] sdk logout skipped", {
        message: error instanceof Error ? error.message : "unknown logout error",
      });
    }
  }
}
