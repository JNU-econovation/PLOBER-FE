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
