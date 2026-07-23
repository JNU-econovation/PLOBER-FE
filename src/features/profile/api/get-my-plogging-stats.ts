import { apiClient } from "@/src/shared/api";

import type { MyPloggingStats } from "./types";

const MY_PLOGGING_STATS_PATH = "/api/users/me/plogging-stats";

export async function getMyPloggingStats(): Promise<MyPloggingStats> {
  const response = await apiClient.get<MyPloggingStats>(
    MY_PLOGGING_STATS_PATH
  );
  return response.data;
}
