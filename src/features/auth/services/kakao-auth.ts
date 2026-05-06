import { KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from "@/src/shared/constants/env";

import { loginWithKakaoCode } from "../api";
import { saveSession } from "./session";

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";

export function buildKakaoAuthorizeUrl() {
  if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
    throw new Error("카카오 로그인 환경변수가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
  });

  const authorizeUrl = `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;

  if (__DEV__) {
    console.log("[kakao] build authorize url", {
      redirectUri: KAKAO_REDIRECT_URI,
      restApiKeyLength: KAKAO_REST_API_KEY.length,
    });
  }

  return authorizeUrl;
}

function normalizeUrlForCompare(url: string) {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/$/, "")}`;
  } catch {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

export function isKakaoRedirectUrl(url: string) {
  const currentUrl = normalizeUrlForCompare(url);
  const expectedUrl = normalizeUrlForCompare(KAKAO_REDIRECT_URI);
  const matches = currentUrl === expectedUrl;

  if (__DEV__ && matches) {
    console.log("[kakao] redirect matched", {
      expectedUrl,
      receivedUrl: currentUrl,
    });
  }

  return matches;
}

export function getKakaoRedirectResult(url: string) {
  const queryString = url.includes("?") ? url.split("?")[1] : "";
  const params = new URLSearchParams(queryString);
  const code = params.get("code");
  const error = params.get("error");
  const errorDescription = params.get("error_description");

  if (error) {
    if (__DEV__) {
      console.log("[kakao] redirect error", {
        error,
        errorDescription,
      });
    }
    throw new Error(errorDescription ?? error);
  }

  if (__DEV__) {
    console.log("[kakao] redirect code parsed", {
      hasCode: Boolean(code),
      codeLength: code?.length ?? 0,
    });
  }

  return code;
}

export async function completeKakaoLogin(code: string) {
  if (!code) {
    throw new Error("카카오 인가 코드를 찾을 수 없습니다.");
  }

  if (__DEV__) {
    console.log("[kakao] login api start", {
      codeLength: code.length,
    });
  }

  const session = await loginWithKakaoCode(code);
  await saveSession(session);

  if (__DEV__) {
    console.log("[kakao] login api success", {
      hasAccessToken: Boolean(session.accessToken),
      userId: session.userId,
    });
  }

  return session;
}
