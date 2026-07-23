import { apiClient } from "@/src/shared/api";

const MY_ACCOUNT_PATH = "/api/users/me";

export async function deleteMyAccount(): Promise<void> {
  await apiClient.delete<void>(MY_ACCOUNT_PATH);
}
