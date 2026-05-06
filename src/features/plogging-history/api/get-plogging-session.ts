import { apiClient } from "@/src/shared/api";

import type { PloggingSessionDetail } from "./types";

const PLOGGING_SESSIONS_PATH = "/api/plogging-sessions";

export async function getPloggingSession(
  ploggingSessionId: number
): Promise<PloggingSessionDetail> {
  const response = await apiClient.get<PloggingSessionDetail>(
    `${PLOGGING_SESSIONS_PATH}/${encodeURIComponent(ploggingSessionId)}`
  );
  return response.data;
}
