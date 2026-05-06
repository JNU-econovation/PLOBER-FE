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

      throw new ApiError(body?.message ?? error.message, {
        status,
        code: body?.code,
        details: error.response?.data,
      });
    }
  );
}
