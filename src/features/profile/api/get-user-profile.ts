import { apiClient } from "@/src/shared/api";

import type { UserProfile } from "./types";

const MY_PROFILE_PATH = "/api/users/me";

export async function getUserProfile(userId: number): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>(MY_PROFILE_PATH, {
    params: { userId },
  });
  return response.data;
}
