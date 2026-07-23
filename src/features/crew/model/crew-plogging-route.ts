import type { CrewRole } from "../types";

export type CrewPloggingRouteContext = {
  crewId: number;
  sessionId: number;
  role: CrewRole;
};

export type CrewPloggingRouteParams = {
  crewId?: string | string[];
  role?: string | string[];
  sessionId?: string | string[];
};

export function parseCrewPloggingRouteContext(
  params: CrewPloggingRouteParams
): CrewPloggingRouteContext | null {
  const crewId = parsePositiveInteger(firstParam(params.crewId));
  const sessionId = parsePositiveInteger(firstParam(params.sessionId));
  const role = firstParam(params.role);

  if (crewId === null || sessionId === null) {
    return null;
  }

  // 역할 파라미터가 유실되더라도 개인 기록으로 잘못 저장하지 않도록
  // 크루 연결은 유지하고 권한이 더 낮은 MEMBER로 처리한다.
  return { crewId, role: role === "LEADER" ? "LEADER" : "MEMBER", sessionId };
}

export function toCrewPloggingRouteParams(
  context: CrewPloggingRouteContext
): Record<"crewId" | "role" | "sessionId", string> {
  return {
    crewId: String(context.crewId),
    role: context.role,
    sessionId: String(context.sessionId),
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}
