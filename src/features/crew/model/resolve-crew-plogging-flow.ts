import type { CrewPloggingSessionResponse } from "../types";

export type CrewPloggingFlowDestination =
  | "IDLE"
  | "RECRUITING"
  | "ACTIVE_PLOGGING"
  | "PERSONAL_REPORT"
  | "SUBMISSION_WAITING"
  | "COMPLETED_RECORD"
  | "CANCELED";

export type ResolvedCrewPloggingFlow = {
  destination: CrewPloggingFlowDestination;
  transitionKey: string;
};

/**
 * 서버 세션 상태를 화면 전환 의도로만 변환한다.
 * 네트워크 호출이나 navigation을 포함하지 않아 폴링 화면들이 같은 규칙을 공유할 수 있다.
 */
export function resolveCrewPloggingFlow(
  session: CrewPloggingSessionResponse | null
): ResolvedCrewPloggingFlow {
  if (!session) {
    return { destination: "IDLE", transitionKey: "idle" };
  }

  const transitionKey = [
    session.crewPloggingSessionId,
    session.status,
    session.participantStatus ?? "NONE",
    session.recordSubmittedByMe ? "SUBMITTED" : "NOT_SUBMITTED",
  ].join(":");

  if (session.status === "CANCELED") {
    return { destination: "CANCELED", transitionKey };
  }

  if (session.status === "COMPLETED") {
    return { destination: "COMPLETED_RECORD", transitionKey };
  }

  if (session.participantStatus === "NOT_SUBMITTED") {
    return { destination: "COMPLETED_RECORD", transitionKey };
  }

  if (
    session.recordSubmittedByMe ||
    session.participantStatus === "SUBMITTED"
  ) {
    return { destination: "SUBMISSION_WAITING", transitionKey };
  }

  if (
    session.status === "COMPLETING" &&
    session.participantStatus === "PARTICIPATING"
  ) {
    return { destination: "PERSONAL_REPORT", transitionKey };
  }

  if (
    session.status === "IN_PROGRESS" &&
    session.participantStatus === "PARTICIPATING"
  ) {
    return { destination: "ACTIVE_PLOGGING", transitionKey };
  }

  if (session.status === "RECRUITING") {
    return { destination: "RECRUITING", transitionKey };
  }

  return { destination: "IDLE", transitionKey };
}
