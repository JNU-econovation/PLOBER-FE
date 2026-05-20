import { ApiError } from "@/src/shared/api";
import { API_BASE_URL } from "@/src/shared/constants/env";

import type { AppleLoginRequest, AppleLoginResponse } from "./types";

const APPLE_LOGIN_PATH = "/api/auth/apple/login";

type ServerErrorBody = {
  code?: string;
  message?: string;
  status?: number;
};

export async function loginWithAppleToken(
  identityToken: string
): Promise<AppleLoginResponse> {
  const url = new URL(APPLE_LOGIN_PATH, API_BASE_URL).toString();

  if (__DEV__) {
    console.log("[apple] login fetch request", {
      identityTokenLength: identityToken.length,
      url,
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      body: JSON.stringify({
        identityToken,
      } satisfies AppleLoginRequest),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    if (__DEV__) {
      console.log("[apple] login fetch network error", {
        message:
          error instanceof Error ? error.message : "unknown network error",
      });
    }

    throw new ApiError(
      "서버에 연결할 수 없습니다. 백엔드 주소와 HTTP 통신 허용 설정을 확인해주세요."
    );
  }

  const body = (await response.json().catch(() => null)) as
    | AppleLoginResponse
    | ServerErrorBody
    | null;

  if (__DEV__) {
    console.log("[apple] login fetch response", {
      body,
      status: response.status,
    });
  }

  if (!response.ok) {
    const errorBody = body as ServerErrorBody | null;
    throw new ApiError(errorBody?.message ?? "Apple 로그인에 실패했습니다.", {
      code: errorBody?.code,
      details: errorBody,
      status: response.status,
    });
  }

  return body as AppleLoginResponse;
}
