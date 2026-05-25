import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";

import {
  appendBackgroundPloggingLocations,
  PLOGGING_LOCATION_TASK_NAME,
  readBackgroundPloggingSnapshot,
} from "./plogging-background-store";
import { updatePloggingLiveActivityFromSnapshot } from "./plogging-live-activity";

type LocationTaskData = {
  locations?: LocationObject[];
};

if (!TaskManager.isTaskDefined(PLOGGING_LOCATION_TASK_NAME)) {
  TaskManager.defineTask<LocationTaskData>(
    PLOGGING_LOCATION_TASK_NAME,
    async ({ data, error }) => {
      if (error) {
        if (__DEV__) {
          console.log("[plogging-background-location] task error", {
            message: error.message,
          });
        }
        return;
      }

      const locations = data?.locations ?? [];
      await appendBackgroundPloggingLocations(
        locations.map((location) => ({
          accuracy: location.coords.accuracy,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          recordedAtMs: location.timestamp,
        }))
      );

      const snapshot = await readBackgroundPloggingSnapshot();
      await updatePloggingLiveActivityFromSnapshot(snapshot);
    }
  );
}
