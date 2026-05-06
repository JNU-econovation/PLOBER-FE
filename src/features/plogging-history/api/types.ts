import type { PloggingMode } from "@/src/features/plogging-session";

export type PloggingSessionSummary = {
  ploggingSessionId: number;
  mode: PloggingMode;
  placeName: string;
  startedAt: string;
  finishedAt: string;
  distanceMeters: number;
};

export type GetPloggingSessionsResponse = {
  content: PloggingSessionSummary[];
  hasNext: boolean;
};

export type PloggingSessionDetail = {
  ploggingSessionId: number;
  mode: PloggingMode;
  startedAt: string;
  finishedAt: string;
  placeName: string;
  distanceMeters: number;
  stepCount: number;
  caloriesBurned: number;
  ploggingSeconds: number;
  restSeconds: number;
  mapImageUrl: string;
  photoUrls: string[];
};

export type GetMonthlyPloggingSummaryRequest = {
  year: number;
  month: number;
};

export type MonthlyPloggingSummary = {
  year: number;
  month: number;
  totalStepCount: number;
  totalDistanceMeters: number;
  totalCaloriesBurned: number;
  totalPloggingCount: number;
  totalPloggingSeconds: number;
};
