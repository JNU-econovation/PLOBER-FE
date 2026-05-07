import { apiClient } from "@/src/shared/api";

import type {
  GetMyPloggingStatsRequest,
  MyPloggingStats,
} from "./types";

const MY_PLOGGING_STATS_PATH = "/api/users/me/plogging-stats";

export async function getMyPloggingStats({
  userId,
}: GetMyPloggingStatsRequest): Promise<MyPloggingStats> {
  const response = await apiClient.get<MyPloggingStats>(
    MY_PLOGGING_STATS_PATH,
    { params: { userId } }
  );
  return response.data;
}
