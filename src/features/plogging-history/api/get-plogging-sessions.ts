import { apiClient } from "@/src/shared/api";

import type {
  GetPloggingSessionsRequest,
  GetPloggingSessionsResponse,
} from "./types";

const PLOGGING_SESSIONS_PATH = "/api/plogging-sessions";

export async function getPloggingSessions({
  page,
  size,
  sort,
}: GetPloggingSessionsRequest): Promise<GetPloggingSessionsResponse> {
  const response = await apiClient.get<GetPloggingSessionsResponse>(
    PLOGGING_SESSIONS_PATH,
    { params: { page, size, sort } }
  );
  return response.data;
}
