import { Redirect, useLocalSearchParams } from "expo-router";

import { CrewMemberProfileScreen } from "@/src/features/crew";

export default function CrewMemberProfileRoute() {
  const { crewId, userId } = useLocalSearchParams<{
    crewId: string | string[];
    userId: string | string[];
  }>();
  const parsedCrewId = parseId(crewId);
  const parsedUserId = parseId(userId);
  if (parsedCrewId === null || parsedUserId === null) {
    return <Redirect href="/crews" />;
  }
  return (
    <CrewMemberProfileScreen crewId={parsedCrewId} userId={parsedUserId} />
  );
}

function parseId(value: string | string[] | undefined): number | null {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
