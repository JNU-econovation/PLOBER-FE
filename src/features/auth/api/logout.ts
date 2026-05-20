import { apiClient } from "@/src/shared/api";

import type { LogoutRequest } from "./types";

const LOGOUT_PATH = "/api/auth/logout";

export async function logout({ userId }: LogoutRequest): Promise<void> {
  await apiClient.post<void>(LOGOUT_PATH, null, {
    params: { userId },
  });
}
