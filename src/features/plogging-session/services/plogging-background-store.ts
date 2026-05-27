import * as FileSystem from "expo-file-system/legacy";

import type { RoutePoint } from "../api/types";

export type BackgroundRoutePoint = RoutePoint & {
  accuracy: number | null;
  recordedAtMs: number;
};

export type BackgroundPloggingSnapshot = {
  active: boolean;
  distanceMeters: number;
  isPaused: boolean;
  pausedAtMs: number | null;
  pausedTotalMs: number;
  routePoints: BackgroundRoutePoint[];
  sessionId: string | null;
  startedAtMs: number | null;
  stepCount: number;
  updatedAtMs: number;
};

type BackgroundLocationInput = {
  accuracy: number | null;
  latitude: number;
  longitude: number;
  recordedAtMs: number;
};

type SnapshotListener = (snapshot: BackgroundPloggingSnapshot) => void;

const ACCURACY_THRESHOLD_METERS = 30;
const DUPLICATE_DISTANCE_METERS = 2;
const MAX_ROUTE_POINTS = 8_000;
const STORE_DIR = `${FileSystem.documentDirectory ?? ""}plogging/`;
const STORE_FILE = `${STORE_DIR}active-session.json`;

const emptySnapshot: BackgroundPloggingSnapshot = {
  active: false,
  distanceMeters: 0,
  isPaused: false,
  pausedAtMs: null,
  pausedTotalMs: 0,
  routePoints: [],
  sessionId: null,
  startedAtMs: null,
  stepCount: 0,
  updatedAtMs: 0,
};

let memorySnapshot: BackgroundPloggingSnapshot = emptySnapshot;
let loaded = false;
let writeQueue = Promise.resolve();
const listeners = new Set<SnapshotListener>();

export const PLOGGING_LOCATION_TASK_NAME = "plover-plogging-location";

export function subscribeBackgroundPloggingSnapshot(
  listener: SnapshotListener
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function readBackgroundPloggingSnapshot() {
  await ensureLoaded();
  return cloneSnapshot(memorySnapshot);
}

export function isBackgroundPloggingSnapshotForSession(
  snapshot: BackgroundPloggingSnapshot,
  sessionId: string
) {
  return snapshot.active && snapshot.sessionId === sessionId;
}

export async function resetBackgroundPloggingSession({
  sessionId,
  startedAtMs,
}: {
  sessionId: string;
  startedAtMs: number;
}) {
  await writeSnapshot({
    ...emptySnapshot,
    active: true,
    sessionId,
    startedAtMs,
    updatedAtMs: Date.now(),
  });
}

export async function setBackgroundPloggingPaused(isPaused: boolean) {
  await updateSnapshot((snapshot) => {
    if (!snapshot.active) return snapshot;

    const now = Date.now();
    if (isPaused) {
      if (snapshot.isPaused) return snapshot;
      return {
        ...snapshot,
        isPaused: true,
        pausedAtMs: now,
        updatedAtMs: now,
      };
    }

    if (!snapshot.isPaused) return snapshot;
    const pausedDeltaMs =
      snapshot.pausedAtMs === null ? 0 : Math.max(0, now - snapshot.pausedAtMs);

    return {
      ...snapshot,
      isPaused: false,
      pausedAtMs: null,
      pausedTotalMs: snapshot.pausedTotalMs + pausedDeltaMs,
      updatedAtMs: now,
    };
  });
}

export async function setBackgroundPloggingStepCount(stepCount: number) {
  await updateSnapshot((snapshot) => {
    if (!snapshot.active) return snapshot;
    return {
      ...snapshot,
      stepCount: Math.max(snapshot.stepCount, Math.floor(stepCount)),
      updatedAtMs: Date.now(),
    };
  });
}

export async function stopBackgroundPloggingSession() {
  await updateSnapshot(() => ({
    ...emptySnapshot,
    updatedAtMs: Date.now(),
  }));
}

export async function appendBackgroundPloggingLocations(
  locations: BackgroundLocationInput[]
) {
  if (locations.length === 0) return;

  await updateSnapshot((snapshot) => {
    if (!snapshot.active || snapshot.isPaused) return snapshot;

    let distanceMeters = snapshot.distanceMeters;
    let routePoints = snapshot.routePoints;
    let changed = false;

    for (const location of locations) {
      if (!isUsableLocation(location)) continue;

      const nextPoint: BackgroundRoutePoint = {
        accuracy: location.accuracy,
        latitude: location.latitude,
        longitude: location.longitude,
        recordedAtMs: location.recordedAtMs,
      };
      const previous = routePoints[routePoints.length - 1];

      if (previous) {
        const delta = haversineMeters(previous, nextPoint);
        if (delta < DUPLICATE_DISTANCE_METERS) {
          continue;
        }
        distanceMeters += delta;
      }

      routePoints =
        routePoints.length >= MAX_ROUTE_POINTS
          ? [...routePoints.slice(1), nextPoint]
          : [...routePoints, nextPoint];
      changed = true;
    }

    if (!changed) return snapshot;

    return {
      ...snapshot,
      distanceMeters,
      routePoints,
      updatedAtMs: Date.now(),
    };
  });
}

async function updateSnapshot(
  updater: (
    snapshot: BackgroundPloggingSnapshot
  ) => BackgroundPloggingSnapshot
) {
  await ensureLoaded();
  await writeSnapshot(updater(memorySnapshot));
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;

  if (!FileSystem.documentDirectory) return;

  try {
    const fileInfo = await FileSystem.getInfoAsync(STORE_FILE);
    if (!fileInfo.exists || fileInfo.isDirectory) return;

    const raw = await FileSystem.readAsStringAsync(STORE_FILE);
    memorySnapshot = sanitizeSnapshot(JSON.parse(raw));
  } catch (error) {
    if (__DEV__) {
      console.log("[plogging-background-store] read failed", {
        message: error instanceof Error ? error.message : "unknown error",
      });
    }
    memorySnapshot = emptySnapshot;
  }
}

async function writeSnapshot(snapshot: BackgroundPloggingSnapshot) {
  memorySnapshot = cloneSnapshot(snapshot);
  notifyListeners(memorySnapshot);

  if (!FileSystem.documentDirectory) return;

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const dirInfo = await FileSystem.getInfoAsync(STORE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(STORE_DIR, { intermediates: true });
      }
      await FileSystem.writeAsStringAsync(
        STORE_FILE,
        JSON.stringify(memorySnapshot)
      );
    })
    .catch((error) => {
      if (__DEV__) {
        console.log("[plogging-background-store] write failed", {
          message: error instanceof Error ? error.message : "unknown error",
        });
      }
    });

  await writeQueue;
}

function notifyListeners(snapshot: BackgroundPloggingSnapshot) {
  const cloned = cloneSnapshot(snapshot);
  listeners.forEach((listener) => listener(cloned));
}

function cloneSnapshot(
  snapshot: BackgroundPloggingSnapshot
): BackgroundPloggingSnapshot {
  return {
    ...snapshot,
    routePoints: snapshot.routePoints.map((point) => ({ ...point })),
  };
}

function sanitizeSnapshot(value: unknown): BackgroundPloggingSnapshot {
  if (!value || typeof value !== "object") return emptySnapshot;

  const candidate = value as Partial<BackgroundPloggingSnapshot>;
  const routePoints = Array.isArray(candidate.routePoints)
    ? candidate.routePoints.filter(isRoutePoint)
    : [];

  return {
    active: candidate.active === true,
    distanceMeters:
      typeof candidate.distanceMeters === "number"
        ? Math.max(0, candidate.distanceMeters)
        : 0,
    isPaused: candidate.isPaused === true,
    pausedAtMs:
      typeof candidate.pausedAtMs === "number" ? candidate.pausedAtMs : null,
    pausedTotalMs:
      typeof candidate.pausedTotalMs === "number"
        ? Math.max(0, candidate.pausedTotalMs)
        : 0,
    routePoints,
    sessionId:
      typeof candidate.sessionId === "string" ? candidate.sessionId : null,
    startedAtMs:
      typeof candidate.startedAtMs === "number" ? candidate.startedAtMs : null,
    stepCount:
      typeof candidate.stepCount === "number"
        ? Math.max(0, Math.floor(candidate.stepCount))
        : 0,
    updatedAtMs:
      typeof candidate.updatedAtMs === "number" ? candidate.updatedAtMs : 0,
  };
}

function isRoutePoint(value: unknown): value is BackgroundRoutePoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<BackgroundRoutePoint>;
  return (
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    typeof point.recordedAtMs === "number"
  );
}

function isUsableLocation(location: BackgroundLocationInput) {
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) {
    return false;
  }

  return (
    typeof location.accuracy !== "number" ||
    location.accuracy <= ACCURACY_THRESHOLD_METERS
  );
}

const EARTH_RADIUS_METERS = 6_371_000;

function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const phi1 = toRadians(a.latitude);
  const phi2 = toRadians(b.latitude);
  const deltaPhi = toRadians(b.latitude - a.latitude);
  const deltaLambda = toRadians(b.longitude - a.longitude);

  const sinDeltaPhi = Math.sin(deltaPhi / 2);
  const sinDeltaLambda = Math.sin(deltaLambda / 2);

  const h =
    sinDeltaPhi * sinDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
