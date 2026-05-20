import { apiClient } from "@/src/shared/api";

import type {
  GetPloggingSessionRequest,
  PloggingSessionDetail,
} from "./types";

const PLOGGING_SESSIONS_PATH = "/api/plogging-sessions";

export async function getPloggingSession({
  ploggingSessionId,
  userId,
}: GetPloggingSessionRequest): Promise<PloggingSessionDetail> {
  const response = await apiClient.get<PloggingSessionDetail>(
    `${PLOGGING_SESSIONS_PATH}/${encodeURIComponent(ploggingSessionId)}`,
    { params: { userId } }
  );
  return response.data;
}
