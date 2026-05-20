import { apiClient } from "@/src/shared/api";

import type {
  GetNearbyTrashBinsRequest,
  GetNearbyTrashBinsResponse,
} from "./types";

const NEARBY_TRASH_BINS_PATH = "/api/facilities/trash-bins";

export async function getNearbyTrashBins(
  params: GetNearbyTrashBinsRequest
): Promise<GetNearbyTrashBinsResponse> {
  const response = await apiClient.get<GetNearbyTrashBinsResponse>(
    NEARBY_TRASH_BINS_PATH,
    { params }
  );
  return response.data;
}
