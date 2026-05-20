import { apiClient } from "@/src/shared/api";

import type { DeleteMyAccountRequest } from "./types";

const MY_ACCOUNT_PATH = "/api/users/me";

export async function deleteMyAccount({
  userId,
}: DeleteMyAccountRequest): Promise<void> {
  await apiClient.delete<void>(MY_ACCOUNT_PATH, {
    params: { userId },
  });
}
