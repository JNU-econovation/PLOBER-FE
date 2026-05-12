import { useLocalSearchParams } from "expo-router";

import { PloggingSessionDetailScreen } from "@/src/features/plogging-history/screens/plogging-session-detail-screen";

export default function PloggingSessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const parsed = id ? Number(id) : NaN;
  const ploggingSessionId = Number.isFinite(parsed) ? parsed : null;

  return <PloggingSessionDetailScreen ploggingSessionId={ploggingSessionId} />;
}
