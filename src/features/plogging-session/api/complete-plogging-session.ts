import { apiClient } from "@/src/shared/api";

import type {
  CompletePloggingSessionRequest,
  CompletePloggingSessionResponse,
} from "./types";

const COMPLETE_PLOGGING_SESSION_PATH = "/api/plogging-sessions/complete";

export async function completePloggingSession(
  payload: CompletePloggingSessionRequest
): Promise<CompletePloggingSessionResponse> {
  const response = await apiClient.post<CompletePloggingSessionResponse>(
    COMPLETE_PLOGGING_SESSION_PATH,
    payload
  );
  return response.data;
}
