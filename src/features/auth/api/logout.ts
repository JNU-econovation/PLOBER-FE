import { apiClient } from "@/src/shared/api";

const LOGOUT_PATH = "/api/auth/logout";

export async function logout(): Promise<void> {
  await apiClient.post<void>(LOGOUT_PATH);
}
