import type { AxiosError, AxiosInstance } from "axios";
import { Platform } from "react-native";

import { clearSession, getSession } from "@/src/shared/auth";

import { ApiError } from "./types";

type ServerErrorBody = {
  message?: string;
  code?: string;
};

let clearExpiredSessionPromise: Promise<void> | null = null;

function getAuthorizationHeader(error: AxiosError<ServerErrorBody>) {
  const headers = error.config?.headers;
  if (!headers) return null;

  if (typeof headers.get === "function") {
    return headers.get("Authorization");
  }

  const rawHeaders = headers as Record<string, unknown>;
  return rawHeaders.Authorization ?? rawHeaders.authorization ?? null;
}

function isTokenExpiredResponse(
  status: number | undefined,
  body: ServerErrorBody | undefined,
  error: AxiosError<ServerErrorBody>
) {
  if (status !== 401) return false;
  if (getAuthorizationHeader(error)) return true;

  const code = body?.code?.toLowerCase() ?? "";
  const message = body?.message?.toLowerCase() ?? "";

  return (
    (code.includes("token") &&
      (code.includes("expired") || code.includes("invalid"))) ||
    (message.includes("token") &&
      (message.includes("expired") || message.includes("invalid"))) ||
    (message.includes("토큰") && message.includes("만료"))
  );
}

function clearExpiredSession() {
  if (!clearExpiredSessionPromise) {
    clearExpiredSessionPromise = clearSession()
      .catch((sessionError: unknown) => {
        if (__DEV__) {
          console.log("[api] session clear failed", {
            message:
              sessionError instanceof Error
                ? sessionError.message
                : "unknown session clear error",
          });
        }
      })
      .finally(() => {
        clearExpiredSessionPromise = null;
      });
  }

  return clearExpiredSessionPromise;
}

function getApiErrorMessage(
  error: AxiosError<ServerErrorBody>,
  body: ServerErrorBody | undefined,
  tokenExpired: boolean
) {
  if (tokenExpired) {
    return "로그인 세션이 만료되었습니다. 다시 로그인해주세요.";
  }

  if (error.message === "Network Error") {
    return Platform.OS === "web"
      ? "서버에 연결할 수 없습니다. 웹 실행 포트와 백엔드 CORS 설정을 확인해주세요."
      : "서버에 연결할 수 없습니다. 백엔드 주소와 HTTP 통신 허용 설정을 확인해주세요.";
  }

  return body?.message ?? error.message;
}

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
    async (error: AxiosError<ServerErrorBody>) => {
      const status = error.response?.status;
      const body = error.response?.data;
      const tokenExpired = isTokenExpiredResponse(status, body, error);
      const message = getApiErrorMessage(error, body, tokenExpired);

      if (tokenExpired) {
        await clearExpiredSession();
      }

      if (__DEV__) {
        console.log("[api] error", {
          message: error.message,
          method: error.config?.method,
          responseBody: body,
          status,
          tokenExpired,
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
