import { Redirect, useLocalSearchParams } from "expo-router";

import { CrewRecordsScreen } from "@/src/features/crew";

export default function CrewRecordsRoute() {
  const { crewId } = useLocalSearchParams<{ crewId: string | string[] }>();
  const parsedCrewId = parseId(crewId);
  if (parsedCrewId === null) return <Redirect href="/crews" />;
  return <CrewRecordsScreen crewId={parsedCrewId} />;
}

function parseId(value: string | string[] | undefined): number | null {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
