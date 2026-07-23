export type CrewRole = "LEADER" | "MEMBER";

export type CrewPloggingStatus =
  | "RECRUITING"
  | "IN_PROGRESS"
  | "COMPLETING"
  | "COMPLETED"
  | "CANCELED";

export type ActiveCrewPloggingStatus = Extract<
  CrewPloggingStatus,
  "RECRUITING" | "IN_PROGRESS" | "COMPLETING"
>;

export type CrewPloggingParticipantStatus =
  | "JOINED"
  | "PARTICIPATING"
  | "SUBMITTED"
  | "NOT_SUBMITTED"
  | "CANCELED";

export type CreateCrewRequest = {
  name: string;
};

export type JoinCrewRequest = {
  joinCode: string;
};

export type CrewResponse = {
  crewId: number;
  name: string;
  joinCode: string;
  role: CrewRole;
};

export type CrewListItem = {
  crewId: number;
  name: string;
  leaderNickname: string;
  memberCount: number;
  memberProfileImageUrls: string[];
  myRole: CrewRole;
  completedPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
  totalPloggingSeconds: number;
  hasActiveSession: boolean;
  activeSessionStatus: ActiveCrewPloggingStatus | null;
};

export type CrewListResponse = {
  crews: CrewListItem[];
};

export type CrewMember = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  role: CrewRole;
};

export type CrewPloggingSessionResponse = {
  crewPloggingSessionId: number;
  status: CrewPloggingStatus;
  startedAt: string | null;
  endedAt: string | null;
  submissionDeadlineAt: string | null;
  joinedByMe: boolean;
  participantStatus: CrewPloggingParticipantStatus | null;
  recordSubmittedByMe: boolean;
  participantCount: number;
  crewRecordCompleted: boolean;
};

export type CrewPloggingRecordSummary = {
  crewPloggingSessionId: number;
  ploggingDate: string;
  representativeNickname: string | null;
  stepCount: number | null;
  distanceMeters: number | null;
  ploggingSeconds: number | null;
  participantCount: number;
  sharedPhotoCount: number;
  representativePhotoUrl: string | null;
};

export type CrewDetailResponse = {
  crewId: number;
  name: string;
  joinCode: string;
  memberCount: number;
  members: CrewMember[];
  myRole: CrewRole;
  leader: boolean;
  completedPloggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
  totalPloggingSeconds: number;
  activeSession: CrewPloggingSessionResponse | null;
  completedRecords: CrewPloggingRecordSummary[];
};

export type CrewMemberListItem = CrewMember & {
  joinedAt: string;
};

export type CrewMemberListResponse = {
  members: CrewMemberListItem[];
};

export type CrewMemberProfileResponse = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  level: number;
  experience: number;
  ploggingCount: number;
  totalStepCount: number;
  totalDistanceMeters: number;
};

export type CrewPloggingRecordListResponse = {
  content: CrewPloggingRecordSummary[];
  hasNext: boolean;
};

export type CrewPloggingParticipant = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
};

export type CrewPloggingPhoto = {
  photoId: number;
  objectUrl: string;
  uploaderUserId: number;
  uploaderNickname: string;
  uploaderProfileImageUrl: string | null;
  registeredAt: string;
};

export type CrewPloggingRecordDetail = {
  crewPloggingSessionId: number;
  mode: "FREE";
  startedAt: string;
  endedAt: string;
  placeName: string | null;
  representativeUserId: number | null;
  representativeNickname: string | null;
  stepCount: number | null;
  distanceMeters: number | null;
  caloriesBurned: number | null;
  ploggingSeconds: number | null;
  mapImageUrl: string | null;
  participantCount: number;
  participants: CrewPloggingParticipant[];
  photos: CrewPloggingPhoto[];
};

export type GetCrewRequest = {
  crewId: number;
};

export type GetCrewMembersRequest = GetCrewRequest;

export type GetCrewMemberProfileRequest = GetCrewRequest & {
  targetUserId: number;
};

export type WithdrawCrewMemberRequest = GetCrewRequest;

export type RemoveCrewMemberRequest = GetCrewMemberProfileRequest;

export type CreateCrewPloggingSessionRequest = GetCrewRequest;

export type GetActiveCrewPloggingSessionRequest = GetCrewRequest;

export type CrewPloggingSessionRequest = {
  sessionId: number;
};

export type GetCrewPloggingRecordsRequest = GetCrewRequest & {
  page?: number;
  size?: number;
  sort?: string[];
};

export type GetCrewPloggingRecordDetailRequest = GetCrewRequest & {
  sessionId: number;
};
