import { ApiError } from "@/src/shared/api";
import { API_BASE_URL } from "@/src/shared/constants/env";

import type { KakaoLoginRequest, KakaoLoginResponse } from "./types";

const KAKAO_LOGIN_PATH = "/api/auth/kakao/login";

type ServerErrorBody = {
  code?: string;
  message?: string;
  status?: number;
};

export async function loginWithKakaoCode(
  code: string
): Promise<KakaoLoginResponse> {
  const url = new URL(KAKAO_LOGIN_PATH, API_BASE_URL).toString();

  if (__DEV__) {
    console.log("[kakao] login fetch request", {
      url,
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      body: JSON.stringify({ code } satisfies KakaoLoginRequest),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    if (__DEV__) {
      console.log("[kakao] login fetch network error", {
        message:
          error instanceof Error ? error.message : "unknown network error",
      });
    }

    throw new ApiError(
      "서버에 연결할 수 없습니다. 백엔드 주소와 HTTP 통신 허용 설정을 확인해주세요."
    );
  }

  const body = (await response.json().catch(() => null)) as
    | KakaoLoginResponse
    | ServerErrorBody
    | null;

  if (__DEV__) {
    console.log("[kakao] login fetch response", {
      body,
      status: response.status,
    });
  }

  if (!response.ok) {
    const errorBody = body as ServerErrorBody | null;
    throw new ApiError(errorBody?.message ?? "카카오 로그인에 실패했습니다.", {
      code: errorBody?.code,
      details: errorBody,
      status: response.status,
    });
  }

  return body as KakaoLoginResponse;
}
