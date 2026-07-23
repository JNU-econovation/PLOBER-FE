import { apiClient } from "@/src/shared/api";

import type {
  CreateCrewRequest,
  CrewDetailResponse,
  CrewListResponse,
  CrewMemberListResponse,
  CrewMemberProfileResponse,
  CrewResponse,
  GetCrewMemberProfileRequest,
  GetCrewMembersRequest,
  GetCrewRequest,
  JoinCrewRequest,
  RemoveCrewMemberRequest,
  WithdrawCrewMemberRequest,
} from "../types";

const CREWS_PATH = "/api/crews";

function getCrewPath(crewId: number): string {
  return `${CREWS_PATH}/${encodeURIComponent(String(crewId))}`;
}

function getCrewMembersPath(crewId: number): string {
  return `${getCrewPath(crewId)}/members`;
}

export async function createCrew(
  payload: CreateCrewRequest
): Promise<CrewResponse> {
  const response = await apiClient.post<CrewResponse>(CREWS_PATH, payload);
  return response.data;
}

export async function joinCrew(
  payload: JoinCrewRequest
): Promise<CrewResponse> {
  const response = await apiClient.post<CrewResponse>(
    `${CREWS_PATH}/join`,
    payload
  );
  return response.data;
}

export async function getMyCrews(): Promise<CrewListResponse> {
  const response = await apiClient.get<CrewListResponse>(CREWS_PATH);
  return {
    ...response.data,
    crews: (response.data.crews ?? []).map((crew) => ({
      ...crew,
      leaderNickname: crew.leaderNickname ?? "",
      memberProfileImageUrls: crew.memberProfileImageUrls ?? [],
    })),
  };
}

export async function getCrewDetail({
  crewId,
}: GetCrewRequest): Promise<CrewDetailResponse> {
  const response = await apiClient.get<CrewDetailResponse>(
    getCrewPath(crewId)
  );
  return response.data;
}

export async function getCrewMembers({
  crewId,
}: GetCrewMembersRequest): Promise<CrewMemberListResponse> {
  const response = await apiClient.get<CrewMemberListResponse>(
    getCrewMembersPath(crewId)
  );
  return response.data;
}

export async function getCrewMemberProfile({
  crewId,
  targetUserId,
}: GetCrewMemberProfileRequest): Promise<CrewMemberProfileResponse> {
  const response = await apiClient.get<CrewMemberProfileResponse>(
    `${getCrewMembersPath(crewId)}/${encodeURIComponent(String(targetUserId))}`
  );
  return response.data;
}

export async function withdrawCrewMember({
  crewId,
}: WithdrawCrewMemberRequest): Promise<void> {
  await apiClient.delete<void>(`${getCrewMembersPath(crewId)}/me`);
}

export async function removeCrewMember({
  crewId,
  targetUserId,
}: RemoveCrewMemberRequest): Promise<void> {
  await apiClient.delete<void>(
    `${getCrewMembersPath(crewId)}/${encodeURIComponent(String(targetUserId))}`
  );
}
