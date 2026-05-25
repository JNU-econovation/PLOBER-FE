import type { RoutePoint } from "@/src/features/plogging-session/api/types";

export type RouteRecommendationMode = "PLOGGING";

export type GetRecommendedRouteRequest = {
  lat: number;
  lon: number;
  time: number;
  mode?: RouteRecommendationMode;
};

export type RecommendedRouteResponse = {
  distanceMeter: number;
  encodedPath: string;
  ploggingScore: number;
  timeMillis: number;
};

export type GetRecommendedRoutesResponse = {
  routes: RecommendedRouteResponse[];
};

export type RecommendedRoute = RecommendedRouteResponse & {
  id: string;
  routePoints: RoutePoint[];
};
