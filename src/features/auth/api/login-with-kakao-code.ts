import { apiClient } from "@/src/shared/api";

import type { KakaoLoginRequest, KakaoLoginResponse } from "./types";

const KAKAO_LOGIN_PATH = "/api/auth/kakao/login";

export async function loginWithKakaoCode(
  code: string
): Promise<KakaoLoginResponse> {
  const response = await apiClient.post<KakaoLoginResponse>(KAKAO_LOGIN_PATH, {
    code,
  } satisfies KakaoLoginRequest);
  return response.data;
}
