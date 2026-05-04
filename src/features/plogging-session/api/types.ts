export type PloggingMode = "FREE" | "AI";

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type CompletePloggingSessionRequest = {
  mode: PloggingMode;
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
  stepCount: number;
  caloriesBurned: number;
  ploggingSeconds: number;
  restSeconds: number;
  placeName: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  routePoints: RoutePoint[];
  mapImageUrl: string;
  photoUrls: string[];
};

export type CompletePloggingSessionResponse = {
  ploggingSessionId: number;
};
