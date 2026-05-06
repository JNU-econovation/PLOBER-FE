import { apiClient } from "@/src/shared/api";

import type { UserProfile } from "./types";

const USERS_PATH = "/api/users";

export async function getUserProfile(userId: number): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>(
    `${USERS_PATH}/${encodeURIComponent(userId)}`
  );
  return response.data;
}
