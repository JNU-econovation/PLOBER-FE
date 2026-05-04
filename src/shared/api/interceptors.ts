import type { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "./types";

type ServerErrorBody = {
  message?: string;
  code?: string;
};

export function attachInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    // TODO(kakao-oauth): 카카오 OAuth 도입 시 Authorization 헤더 주입
    // const token = await getKakaoAccessToken();
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ServerErrorBody>) => {
      const status = error.response?.status;
      const body = error.response?.data;

      throw new ApiError(body?.message ?? error.message, {
        status,
        code: body?.code,
        details: error.response?.data,
      });
    }
  );
}
