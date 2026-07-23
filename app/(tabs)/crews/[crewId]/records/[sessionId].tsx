import { Redirect, useLocalSearchParams } from "expo-router";

import { CrewRecordDetailScreen } from "@/src/features/crew";

export default function CrewRecordDetailRoute() {
  const { crewId, sessionId } = useLocalSearchParams<{
    crewId: string | string[];
    sessionId: string | string[];
  }>();
  const parsedCrewId = parseId(crewId);
  const parsedSessionId = parseId(sessionId);
  if (parsedCrewId === null || parsedSessionId === null) {
    return <Redirect href="/crews" />;
  }
  return (
    <CrewRecordDetailScreen
      crewId={parsedCrewId}
      sessionId={parsedSessionId}
    />
  );
}

function parseId(value: string | string[] | undefined): number | null {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
