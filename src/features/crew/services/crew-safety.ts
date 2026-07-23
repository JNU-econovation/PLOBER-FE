import * as SecureStore from "expo-secure-store";

import type { CrewPloggingRecordDetail } from "../types";

const BLOCKED_CREW_USERS_KEY = "plover.blocked-crew-users.v1";
export const CREW_SAFETY_CONTACT_EMAIL = "lewis177777@gmail.com";

// 서버 필터와 별개로 제출 전 클라이언트에서도 명백한 욕설·성적 표현을 막는다.
// 우회 표현과 이미지 내용은 서버/운영자 검수가 최종 방어선이어야 한다.
const DISALLOWED_TEXT_PATTERNS = [
  /개새끼/i,
  /병신/i,
  /씨+발/i,
  /시+발/i,
  /지랄/i,
  /fuck/i,
  /porn/i,
  /shit/i,
];

export function hasDisallowedUserGeneratedText(value: string): boolean {
  const normalized = value.normalize("NFKC").replace(/[\s._-]+/g, "");
  return DISALLOWED_TEXT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export async function getBlockedCrewUserIds(): Promise<number[]> {
  try {
    const stored = await SecureStore.getItemAsync(BLOCKED_CREW_USERS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (value): value is number =>
            typeof value === "number" && Number.isSafeInteger(value) && value > 0
        )
      )
    );
  } catch {
    return [];
  }
}

export async function setCrewUserBlocked(
  userId: number,
  blocked: boolean
): Promise<number[]> {
  const current = new Set(await getBlockedCrewUserIds());
  if (blocked) current.add(userId);
  else current.delete(userId);
  const next = [...current].sort((a, b) => a - b);
  await SecureStore.setItemAsync(BLOCKED_CREW_USERS_KEY, JSON.stringify(next));
  return next;
}

export function applyBlockedCrewUsers(
  record: CrewPloggingRecordDetail,
  blockedUserIds: readonly number[]
): CrewPloggingRecordDetail {
  if (blockedUserIds.length === 0) return record;
  const blocked = new Set(blockedUserIds);

  return {
    ...record,
    photos: record.photos.filter(
      (photo) => !blocked.has(photo.uploaderUserId)
    ),
    participants: record.participants.map((participant) =>
      blocked.has(participant.userId)
        ? {
            ...participant,
            nickname: "차단한 사용자",
            profileImageUrl: null,
          }
        : participant
    ),
    representativeNickname:
      record.representativeUserId !== null &&
      blocked.has(record.representativeUserId)
        ? "차단한 사용자"
        : record.representativeNickname,
  };
}

export function buildCrewSafetyReportUrl({
  crewId,
  nickname,
  userId,
}: {
  crewId: number;
  nickname: string;
  userId: number;
}): string {
  const subject = `[Plover 신고] 크루 사용자 ${userId}`;
  const body = [
    "아래 사용자 또는 공유 콘텐츠를 신고합니다.",
    "",
    `크루 ID: ${crewId}`,
    `사용자 ID: ${userId}`,
    `표시 닉네임: ${nickname}`,
    "신고 사유: ",
    "문제가 된 화면/일시: ",
  ].join("\n");

  return `mailto:${CREW_SAFETY_CONTACT_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
