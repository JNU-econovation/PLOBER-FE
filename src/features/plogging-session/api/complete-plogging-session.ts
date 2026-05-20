import { apiClient } from "@/src/shared/api";

import type {
  CompletePloggingSessionParams,
  CompletePloggingSessionResponse,
} from "./types";

const COMPLETE_PLOGGING_SESSION_PATH = "/api/plogging-sessions/complete";

export async function completePloggingSession(
  { payload, userId }: CompletePloggingSessionParams
): Promise<CompletePloggingSessionResponse> {
  const response = await apiClient.post<CompletePloggingSessionResponse>(
    COMPLETE_PLOGGING_SESSION_PATH,
    payload,
    { params: { userId } }
  );
  return response.data;
}
