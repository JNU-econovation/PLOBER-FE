import { useLocalSearchParams } from "expo-router";

import {
  parseCrewPloggingRouteContext,
  type CrewPloggingRouteParams,
} from "@/src/features/crew/model";
import { ReportScreen } from "@/src/features/plogging-report";

export default function Report() {
  const params = useLocalSearchParams<CrewPloggingRouteParams>();
  const crewContext = parseCrewPloggingRouteContext(params);

  return <ReportScreen crewContext={crewContext} />;
}
