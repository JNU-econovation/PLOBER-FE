import type { RoutePoint } from "@/src/features/plogging-session/api/types";

export type RouteRecommendationMode = "PLOGGING";

export type GetRecommendedRouteRequest = {
  lat: number;
  lon: number;
  time: number;
  mode: RouteRecommendationMode;
};

export type GetRecommendedRouteResponse = {
  distanceMeter: number;
  timeMillis: number;
  encodedPath: string;
};

export type RecommendedRoute = GetRecommendedRouteResponse & {
  routePoints: RoutePoint[];
};
