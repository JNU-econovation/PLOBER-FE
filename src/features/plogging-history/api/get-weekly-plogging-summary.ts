import { apiClient } from "@/src/shared/api";

import type {
  GetWeeklyPloggingSummaryRequest,
  WeeklyPloggingSummary,
} from "./types";

const WEEKLY_PLOGGING_SUMMARY_PATH = "/api/plogging-sessions/weekly";

export async function getWeeklyPloggingSummary(
  params: GetWeeklyPloggingSummaryRequest
): Promise<WeeklyPloggingSummary> {
  const response = await apiClient.get<WeeklyPloggingSummary>(
    WEEKLY_PLOGGING_SUMMARY_PATH,
    { params }
  );
  return response.data;
}
