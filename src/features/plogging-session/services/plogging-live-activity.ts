import { NativeModules, Platform } from "react-native";

import type { BackgroundPloggingSnapshot } from "./plogging-background-store";
import { caloriesFromSteps } from "./calculate-calories";

export type PloggingLiveActivityPayload = {
  calories: number;
  distanceMeters: number;
  elapsedSeconds: number;
  isPaused: boolean;
  modeLabel: string;
  stepCount: number;
};

type NativePloverLiveActivityModule = {
  end: (payload: PloggingLiveActivityPayload) => Promise<unknown>;
  start: (payload: PloggingLiveActivityPayload) => Promise<unknown>;
  update: (payload: PloggingLiveActivityPayload) => Promise<unknown>;
};

const nativeLiveActivity =
  Platform.OS === "ios"
    ? (NativeModules.PloverLiveActivityModule as
        | NativePloverLiveActivityModule
        | undefined)
    : undefined;

export async function startPloggingLiveActivity(
  payload: PloggingLiveActivityPayload
) {
  if (!nativeLiveActivity?.start) return;
  await safelyRunLiveActivityAction("start", () =>
    nativeLiveActivity.start(normalizePayload(payload))
  );
}

export async function updatePloggingLiveActivity(
  payload: PloggingLiveActivityPayload
) {
  if (!nativeLiveActivity?.update) return;
  await safelyRunLiveActivityAction("update", () =>
    nativeLiveActivity.update(normalizePayload(payload))
  );
}

export async function endPloggingLiveActivity(
  payload: PloggingLiveActivityPayload
) {
  if (!nativeLiveActivity?.end) return;
  await safelyRunLiveActivityAction("end", () =>
    nativeLiveActivity.end(normalizePayload(payload))
  );
}

export async function updatePloggingLiveActivityFromSnapshot(
  snapshot: BackgroundPloggingSnapshot
) {
  if (!snapshot.startedAtMs) return;

  const now = Date.now();
  const elapsedMs = snapshot.isPaused
    ? Math.max(0, (snapshot.pausedAtMs ?? now) - snapshot.startedAtMs)
    : Math.max(0, now - snapshot.startedAtMs);
  const activeElapsedMs = Math.max(0, elapsedMs - snapshot.pausedTotalMs);

  await updatePloggingLiveActivity({
    calories: caloriesFromSteps(snapshot.stepCount),
    distanceMeters: snapshot.distanceMeters,
    elapsedSeconds: Math.floor(activeElapsedMs / 1000),
    isPaused: snapshot.isPaused,
    modeLabel: "플로깅",
    stepCount: snapshot.stepCount,
  });
}

function normalizePayload(
  payload: PloggingLiveActivityPayload
): PloggingLiveActivityPayload {
  return {
    calories: Math.max(0, Math.round(payload.calories)),
    distanceMeters: Math.max(0, payload.distanceMeters),
    elapsedSeconds: Math.max(0, Math.floor(payload.elapsedSeconds)),
    isPaused: payload.isPaused,
    modeLabel: payload.modeLabel,
    stepCount: Math.max(0, Math.round(payload.stepCount)),
  };
}

async function safelyRunLiveActivityAction(
  action: "end" | "start" | "update",
  run: () => Promise<unknown>
) {
  try {
    await run();
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-live-activity] action failed", {
        action,
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
  }
}
