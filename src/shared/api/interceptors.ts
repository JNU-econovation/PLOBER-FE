import type { AxiosError, AxiosInstance } from "axios";
import { Platform } from "react-native";

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
    if (__DEV__) {
      console.log("[api] request", {
        baseURL: config.baseURL,
        method: config.method,
        url: config.url,
        hasAuthorization: Boolean(config.headers.Authorization),
      });
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      if (__DEV__) {
        console.log("[api] response", {
          method: response.config.method,
          status: response.status,
          url: response.config.url,
        });
      }

      return response;
    },
    (error: AxiosError<ServerErrorBody>) => {
      const status = error.response?.status;
      const body = error.response?.data;
      const message =
        error.message === "Network Error"
          ? Platform.OS === "web"
            ? "서버에 연결할 수 없습니다. 웹 실행 포트와 백엔드 CORS 설정을 확인해주세요."
            : "서버에 연결할 수 없습니다. 백엔드 주소와 HTTP 통신 허용 설정을 확인해주세요."
          : body?.message ?? error.message;

      if (__DEV__) {
        console.log("[api] error", {
          message: error.message,
          method: error.config?.method,
          responseBody: body,
          status,
          url: error.config?.url,
        });
      }

      throw new ApiError(message, {
        status,
        code: body?.code,
        details: error.response?.data,
      });
    }
  );
}
