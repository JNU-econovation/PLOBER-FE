import { apiClient } from "@/src/shared/api";

import type { UserProfile } from "./types";

const MY_PROFILE_PATH = "/api/users/me";

export async function getUserProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>(MY_PROFILE_PATH);

  if (__DEV__) {
    console.log(
      "[api/users/me] data",
      JSON.stringify(response.data, null, 2)
    );
  }

  return response.data;
}
