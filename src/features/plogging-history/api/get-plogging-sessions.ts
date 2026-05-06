import { apiClient } from "@/src/shared/api";

import type { GetPloggingSessionsResponse } from "./types";

const PLOGGING_SESSIONS_PATH = "/api/plogging-sessions";

export async function getPloggingSessions(): Promise<GetPloggingSessionsResponse> {
  const response = await apiClient.get<GetPloggingSessionsResponse>(
    PLOGGING_SESSIONS_PATH
  );
  return response.data;
}
