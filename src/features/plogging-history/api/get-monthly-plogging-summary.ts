import { apiClient } from "@/src/shared/api";

import type {
  GetMonthlyPloggingSummaryRequest,
  MonthlyPloggingSummary,
} from "./types";

const MONTHLY_PLOGGING_SUMMARY_PATH = "/api/plogging-sessions/monthly";

export async function getMonthlyPloggingSummary(
  params: GetMonthlyPloggingSummaryRequest
): Promise<MonthlyPloggingSummary> {
  const response = await apiClient.get<MonthlyPloggingSummary>(
    MONTHLY_PLOGGING_SUMMARY_PATH,
    { params }
  );
  return response.data;
}
