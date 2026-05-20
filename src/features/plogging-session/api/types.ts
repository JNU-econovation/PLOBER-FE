export type PloggingMode = "FREE" | "RECOMMENDED";

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

export type CompletePloggingSessionParams = {
  payload: CompletePloggingSessionRequest;
  userId: number;
};

export type CompletePloggingSessionResponse = {
  ploggingSessionId: number;
};

export type MapImageUploadContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif"
  | "image/avif";

export type GetMapImageUploadUrlRequest = {
  contentType: MapImageUploadContentType;
  userId: number;
};

export type GetMapImageUploadUrlResponse = {
  uploadUrl: string;
  objectUrl: string;
};

export type PhotoUploadContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif"
  | "image/avif";

export type GetPhotoUploadUrlRequest = {
  contentType: PhotoUploadContentType;
  userId: number;
};

export type GetPhotoUploadUrlResponse = {
  uploadUrl: string;
  objectUrl: string;
};
