import { KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from "@/src/shared/constants/env";

import { loginWithKakaoToken } from "../api";
import { saveSession } from "./session";

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";

type KakaoTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

type KakaoTokenErrorResponse = {
  error?: string;
  error_description?: string;
  error_code?: string;
};

async function exchangeKakaoCodeForToken(code: string): Promise<string> {
  if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
    throw new Error("카카오 로그인 환경변수가 설정되지 않았습니다.");
  }

  const body = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    code,
    grant_type: "authorization_code",
    redirect_uri: KAKAO_REDIRECT_URI,
  });

  if (__DEV__) {
    console.log("[kakao] token exchange request", {
      redirectUri: KAKAO_REDIRECT_URI,
      codeLength: code.length,
    });
  }

  let response: Response;
  try {
    response = await fetch(KAKAO_TOKEN_URL, {
      body: body.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      method: "POST",
    });
  } catch (error) {
    if (__DEV__) {
      console.log("[kakao] token exchange network error", {
        message:
          error instanceof Error ? error.message : "unknown network error",
      });
    }
    throw new Error(
      "카카오 서버에 연결할 수 없습니다. 네트워크 상태를 확인하고 다시 시도해주세요."
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | KakaoTokenResponse
    | KakaoTokenErrorResponse
    | null;

  if (__DEV__) {
    console.log("[kakao] token exchange response", {
      status: response.status,
      hasAccessToken: Boolean(
        payload && "access_token" in payload && payload.access_token
      ),
    });
  }

  if (!response.ok || !payload || !("access_token" in payload)) {
    const errorBody = payload as KakaoTokenErrorResponse | null;
    throw new Error(
      errorBody?.error_description ??
        errorBody?.error ??
        "카카오 액세스 토큰 발급에 실패했습니다."
    );
  }

  return payload.access_token;
}

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
    console.log("[kakao] login flow start", {
      codeLength: code.length,
    });
  }

  const kakaoAccessToken = await exchangeKakaoCodeForToken(code);

  if (__DEV__) {
    console.log("[kakao] login api start", {
      accessTokenLength: kakaoAccessToken.length,
    });
  }

  const session = await loginWithKakaoToken(kakaoAccessToken);
  await saveSession(session);

  if (__DEV__) {
    console.log("[kakao] login api success", {
      hasAccessToken: Boolean(session.accessToken),
      userId: session.userId,
    });
  }

  return session;
}
