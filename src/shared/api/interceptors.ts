import type { AxiosError, AxiosInstance } from "axios";

import { getSession } from "@/src/shared/auth";

import { ApiError } from "./types";

type ServerErrorBody = {
  message?: string;
  code?: string;
};

export function attachInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(async (config) => {
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `${session.tokenType} ${session.accessToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ServerErrorBody>) => {
      const status = error.response?.status;
      const body = error.response?.data;
      const message =
        error.message === "Network Error"
          ? "서버에 연결할 수 없습니다. 웹 실행 포트와 백엔드 CORS 설정을 확인해주세요."
          : body?.message ?? error.message;

      throw new ApiError(message, {
        status,
        code: body?.code,
        details: error.response?.data,
      });
    }
  );
}
