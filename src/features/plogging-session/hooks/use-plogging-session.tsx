import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PloggingMode, RoutePoint } from "../api/types";
import { caloriesFromSteps } from "../services/calculate-calories";

type PloggingSessionContextValue = {
  // 누적 데이터
  mode: PloggingMode;
  startedAtMs: number | null;
  finishedAtMs: number | null;
  restSeconds: number;
  photoUris: string[];
  // 로컬 URI → S3 objectUrl 매핑. 업로드 성공한 사진만 키로 존재한다.
  photoObjectUrls: Record<string, string>;
  routePoints: RoutePoint[];
  distanceMeters: number;
  stepCount: number;
  caloriesBurned: number;
  startCoord: RoutePoint | null;
  endCoord: RoutePoint | null;
  placeName: string;
  mapImageUri: string | null;
  mapImageObjectUrl: string | null;

  // 변경 액션
  setMode: (mode: PloggingMode) => void;
  startSession: () => void;
  finishSession: (restSeconds: number) => void;
  addPhoto: (uri: string) => void;
  removePhoto: (uri: string) => void;
  addPhotoObjectUrl: (localUri: string, objectUrl: string) => void;
  appendRoutePoint: (point: RoutePoint) => void;
  addSteps: (delta: number) => void;
  setPlaceName: (name: string) => void;
  setMapImageUri: (uri: string | null) => void;
  setMapImageObjectUrl: (url: string | null) => void;
  resetSession: () => void;
};

const PloggingSessionContext =
  createContext<PloggingSessionContextValue | null>(null);

export function PloggingSessionProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PloggingMode>("FREE");
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [photoObjectUrls, setPhotoObjectUrls] = useState<
    Record<string, string>
  >({});
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [startCoord, setStartCoord] = useState<RoutePoint | null>(null);
  const [endCoord, setEndCoord] = useState<RoutePoint | null>(null);
  const [placeName, setPlaceNameState] = useState("");
  const [mapImageUri, setMapImageUriState] = useState<string | null>(null);
  const [mapImageObjectUrl, setMapImageObjectUrlState] = useState<
    string | null
  >(null);

  const addPhoto = useCallback((uri: string) => {
    setPhotoUris((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
  }, []);

  const removePhoto = useCallback((uri: string) => {
    setPhotoUris((prev) => prev.filter((existing) => existing !== uri));
    setPhotoObjectUrls((prev) => {
      if (!(uri in prev)) return prev;
      const { [uri]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const addPhotoObjectUrl = useCallback(
    (localUri: string, objectUrl: string) => {
      setPhotoObjectUrls((prev) => {
        if (prev[localUri] === objectUrl) return prev;
        return { ...prev, [localUri]: objectUrl };
      });
    },
    []
  );

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

  const setMapImageUri = useCallback((uri: string | null) => {
    setMapImageUriState(uri);
  }, []);

  const setMapImageObjectUrl = useCallback((url: string | null) => {
    setMapImageObjectUrlState(url);
  }, []);

  const setMode = useCallback((next: PloggingMode) => {
    setModeState(next);
  }, []);

  // 세션 시작 시각 고정. 같은 세션 내 재호출은 무시한다.
  const startSession = useCallback(() => {
    setStartedAtMs((prev) => (prev !== null ? prev : Date.now()));
    setFinishedAtMs(null);
  }, []);

  // 종료 시각과 누적 휴식 시간 확정.
  const finishSession = useCallback((nextRestSeconds: number) => {
    setFinishedAtMs(Date.now());
    setRestSeconds(Math.max(0, Math.floor(nextRestSeconds)));
  }, []);

  const resetSession = useCallback(() => {
    setPhotoUris([]);
    setPhotoObjectUrls({});
    setRoutePoints([]);
    setDistanceMeters(0);
    setStepCount(0);
    setStartCoord(null);
    setEndCoord(null);
    setPlaceNameState("");
    setMapImageUriState(null);
    setMapImageObjectUrlState(null);
    setStartedAtMs(null);
    setFinishedAtMs(null);
    setRestSeconds(0);
  }, []);

  const value = useMemo<PloggingSessionContextValue>(
    () => ({
      addPhoto,
      addPhotoObjectUrl,
      addSteps,
      appendRoutePoint,
      caloriesBurned: caloriesFromSteps(stepCount),
      distanceMeters,
      endCoord,
      finishedAtMs,
      finishSession,
      mapImageObjectUrl,
      mapImageUri,
      mode,
      photoObjectUrls,
      photoUris,
      placeName,
      removePhoto,
      resetSession,
      restSeconds,
      routePoints,
      setMapImageObjectUrl,
      setMapImageUri,
      setMode,
      setPlaceName,
      startCoord,
      startedAtMs,
      startSession,
      stepCount,
    }),
    [
      addPhoto,
      addPhotoObjectUrl,
      addSteps,
      appendRoutePoint,
      distanceMeters,
      endCoord,
      finishedAtMs,
      finishSession,
      mapImageObjectUrl,
      mapImageUri,
      mode,
      photoObjectUrls,
      photoUris,
      placeName,
      removePhoto,
      resetSession,
      restSeconds,
      routePoints,
      setMapImageObjectUrl,
      setMapImageUri,
      setMode,
      setPlaceName,
      startCoord,
      startedAtMs,
      startSession,
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
