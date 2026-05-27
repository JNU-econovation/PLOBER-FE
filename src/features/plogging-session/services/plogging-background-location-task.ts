import type { LocationObject } from "expo-location";

import {
  appendBackgroundPloggingLocations,
  PLOGGING_LOCATION_TASK_NAME,
  readBackgroundPloggingSnapshot,
} from "./plogging-background-store";
import { updatePloggingLiveActivityFromSnapshot } from "./plogging-live-activity";

type LocationTaskData = {
  locations?: LocationObject[];
};

type TaskManagerModule = typeof import("expo-task-manager");

function loadTaskManager(): TaskManagerModule | null {
  try {
    // TaskManager tasks must be registered while the JS bundle is initializing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-task-manager") as TaskManagerModule;
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-background-location] task manager unavailable", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    return null;
  }
}

const TaskManager = loadTaskManager();

if (TaskManager && !TaskManager.isTaskDefined(PLOGGING_LOCATION_TASK_NAME)) {
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
