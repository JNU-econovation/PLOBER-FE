import { apiClient } from "@/src/shared/api";

import { decodePolyline } from "./polyline";
import type {
  GetRecommendedRouteRequest,
  GetRecommendedRoutesResponse,
  RecommendedRoute,
} from "./types";

const RECOMMENDED_ROUTE_PATH = "/api/v1/routes";

export async function getRecommendedRoutes(
  params: GetRecommendedRouteRequest
): Promise<RecommendedRoute[]> {
  const response = await apiClient.get<GetRecommendedRoutesResponse>(
    RECOMMENDED_ROUTE_PATH,
    { params }
  );

  return response.data.routes.map((route, index) => ({
    ...route,
    id: `recommended-${index + 1}`,
    routePoints: decodePolyline(route.encodedPath),
  }));
}
