import { apiClient } from "@/src/shared/api";

import type {
  GetNearbyToiletsRequest,
  GetNearbyToiletsResponse,
} from "./types";

const NEARBY_TOILETS_PATH = "/api/facilities/toilets";

export async function getNearbyToilets(
  params: GetNearbyToiletsRequest
): Promise<GetNearbyToiletsResponse> {
  const response = await apiClient.get<GetNearbyToiletsResponse>(
    NEARBY_TOILETS_PATH,
    { params }
  );
  return response.data;
}
