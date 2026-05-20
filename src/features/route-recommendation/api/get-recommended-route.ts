import { apiClient } from "@/src/shared/api";

import { decodePolyline } from "./polyline";
import type {
  GetRecommendedRouteRequest,
  GetRecommendedRouteResponse,
  RecommendedRoute,
} from "./types";

const RECOMMENDED_ROUTE_PATH = "/api/v1/routes";

export async function getRecommendedRoute(
  params: GetRecommendedRouteRequest
): Promise<RecommendedRoute> {
  const response = await apiClient.get<GetRecommendedRouteResponse>(
    RECOMMENDED_ROUTE_PATH,
    { params }
  );
  const routePoints = decodePolyline(response.data.encodedPath);

  return {
    ...response.data,
    routePoints,
  };
}
