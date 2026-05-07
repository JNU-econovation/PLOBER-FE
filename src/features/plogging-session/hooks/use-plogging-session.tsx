import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { RoutePoint } from "../api/types";
import { caloriesFromSteps } from "../services/calculate-calories";

type PloggingSessionContextValue = {
  // 누적 데이터
  photoUris: string[];
  routePoints: RoutePoint[];
  distanceMeters: number;
  stepCount: number;
  caloriesBurned: number;
  startCoord: RoutePoint | null;
  endCoord: RoutePoint | null;
  placeName: string;

  // 변경 액션
  addPhoto: (uri: string) => void;
  removePhoto: (uri: string) => void;
  appendRoutePoint: (point: RoutePoint) => void;
  addSteps: (delta: number) => void;
  setPlaceName: (name: string) => void;
  resetSession: () => void;
};

const PloggingSessionContext =
  createContext<PloggingSessionContextValue | null>(null);

export function PloggingSessionProvider({ children }: { children: ReactNode }) {
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [startCoord, setStartCoord] = useState<RoutePoint | null>(null);
  const [endCoord, setEndCoord] = useState<RoutePoint | null>(null);
  const [placeName, setPlaceNameState] = useState("");

  const addPhoto = useCallback((uri: string) => {
    setPhotoUris((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
  }, []);

  const removePhoto = useCallback((uri: string) => {
    setPhotoUris((prev) => prev.filter((existing) => existing !== uri));
  }, []);

  // 좌표 한 개 추가 시 거리/시작-종료 좌표를 함께 갱신.
  // 거리 계산은 이전 마지막 좌표와의 haversine으로 누적한다.
  const appendRoutePoint = useCallback((point: RoutePoint) => {
    setRoutePoints((prev) => {
      const previous = prev[prev.length - 1];
      if (previous) {
        const delta = haversineMeters(previous, point);
        if (delta > 0) {
          setDistanceMeters((dist) => dist + delta);
        }
      } else {
        setStartCoord(point);
      }
      setEndCoord(point);
      return [...prev, point];
    });
  }, []);

  const addSteps = useCallback((delta: number) => {
    if (delta <= 0) return;
    setStepCount((prev) => prev + delta);
  }, []);

  const setPlaceName = useCallback((name: string) => {
    setPlaceNameState(name);
  }, []);

  const resetSession = useCallback(() => {
    setPhotoUris([]);
    setRoutePoints([]);
    setDistanceMeters(0);
    setStepCount(0);
    setStartCoord(null);
    setEndCoord(null);
    setPlaceNameState("");
  }, []);

  const value = useMemo<PloggingSessionContextValue>(
    () => ({
      addPhoto,
      addSteps,
      appendRoutePoint,
      caloriesBurned: caloriesFromSteps(stepCount),
      distanceMeters,
      endCoord,
      photoUris,
      placeName,
      removePhoto,
      resetSession,
      routePoints,
      setPlaceName,
      startCoord,
      stepCount,
    }),
    [
      addPhoto,
      addSteps,
      appendRoutePoint,
      distanceMeters,
      endCoord,
      photoUris,
      placeName,
      removePhoto,
      resetSession,
      routePoints,
      setPlaceName,
      startCoord,
      stepCount,
    ]
  );

  return (
    <PloggingSessionContext.Provider value={value}>
      {children}
    </PloggingSessionContext.Provider>
  );
}

export function usePloggingSession() {
  const value = useContext(PloggingSessionContext);
  if (!value) {
    throw new Error(
      "usePloggingSession must be used within PloggingSessionProvider."
    );
  }
  return value;
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
