import { apiClient } from "@/src/shared/api";

import type {
  CrewPloggingRecordDetail,
  CrewPloggingRecordListResponse,
  GetCrewPloggingRecordDetailRequest,
  GetCrewPloggingRecordsRequest,
} from "../types";

const CREWS_PATH = "/api/crews";

function getCrewRecordsPath(crewId: number): string {
  return `${CREWS_PATH}/${encodeURIComponent(String(crewId))}/plogging-records`;
}

export async function getCrewPloggingRecords({
  crewId,
  page,
  size,
  sort,
}: GetCrewPloggingRecordsRequest): Promise<CrewPloggingRecordListResponse> {
  const response = await apiClient.get<CrewPloggingRecordListResponse>(
    getCrewRecordsPath(crewId),
    { params: { page, size, sort } }
  );
  return response.data;
}

export async function getCrewPloggingRecordDetail({
  crewId,
  sessionId,
}: GetCrewPloggingRecordDetailRequest): Promise<CrewPloggingRecordDetail> {
  const response = await apiClient.get<CrewPloggingRecordDetail>(
    `${getCrewRecordsPath(crewId)}/${encodeURIComponent(String(sessionId))}`
  );
  return {
    ...response.data,
    caloriesBurned: response.data.caloriesBurned ?? null,
    mapImageUrl: response.data.mapImageUrl ?? null,
    placeName: response.data.placeName ?? null,
  };
}
