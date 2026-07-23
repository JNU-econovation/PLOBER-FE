import { apiClient } from "@/src/shared/api";

import type {
  CreateCrewPloggingSessionRequest,
  CrewPloggingSessionRequest,
  CrewPloggingSessionResponse,
  GetActiveCrewPloggingSessionRequest,
} from "../types";

const CREWS_PATH = "/api/crews";
const CREW_PLOGGING_SESSIONS_PATH = "/api/crew-plogging-sessions";

function getSessionPath(sessionId: number): string {
  return `${CREW_PLOGGING_SESSIONS_PATH}/${encodeURIComponent(
    String(sessionId)
  )}`;
}

export async function createCrewPloggingSession({
  crewId,
}: CreateCrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.post<CrewPloggingSessionResponse>(
    `${CREWS_PATH}/${encodeURIComponent(String(crewId))}/plogging-sessions`
  );
  return response.data;
}

export async function getActiveCrewPloggingSession({
  crewId,
}: GetActiveCrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse | null> {
  const response = await apiClient.get<
    CrewPloggingSessionResponse | null | ""
  >(
    `${CREWS_PATH}/${encodeURIComponent(
      String(crewId)
    )}/plogging-sessions/active`
  );

  return response.data || null;
}

export async function getCrewPloggingSession({
  sessionId,
}: CrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.get<CrewPloggingSessionResponse>(
    getSessionPath(sessionId)
  );
  return response.data;
}

export async function joinCrewPloggingSession({
  sessionId,
}: CrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.post<CrewPloggingSessionResponse>(
    `${getSessionPath(sessionId)}/participants/me`
  );
  return response.data;
}

export async function cancelCrewPloggingParticipation({
  sessionId,
}: CrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.delete<CrewPloggingSessionResponse>(
    `${getSessionPath(sessionId)}/participants/me`
  );
  return response.data;
}

export async function cancelCrewPloggingSession({
  sessionId,
}: CrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.post<CrewPloggingSessionResponse>(
    `${getSessionPath(sessionId)}/cancel`
  );
  return response.data;
}

export async function startCrewPloggingSession({
  sessionId,
}: CrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.post<CrewPloggingSessionResponse>(
    `${getSessionPath(sessionId)}/start`
  );
  return response.data;
}

export async function endCrewPloggingSession({
  sessionId,
}: CrewPloggingSessionRequest): Promise<CrewPloggingSessionResponse> {
  const response = await apiClient.post<CrewPloggingSessionResponse>(
    `${getSessionPath(sessionId)}/end`
  );
  return response.data;
}
