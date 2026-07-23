import { useLocalSearchParams } from "expo-router";

import {
  parseCrewPloggingRouteContext,
  type CrewPloggingRouteParams,
} from "@/src/features/crew/model";
import { LeaderEndConfirmationModal } from "@/src/features/crew/components/leader-end-modals";
import { ActivePloggingScreen } from "@/src/features/plogging-session/screens/active-plogging-screen";

export default function Plogging() {
  const params = useLocalSearchParams<CrewPloggingRouteParams>();
  const crewContext = parseCrewPloggingRouteContext(params);

  return (
    <ActivePloggingScreen
      crewContext={crewContext}
      renderLeaderEndConfirmation={(props) => (
        <LeaderEndConfirmationModal {...props} />
      )}
    />
  );
}
