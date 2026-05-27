import { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  NaverMapMarkerOverlay,
  NaverMapPolylineOverlay,
  NaverMapView,
  type Region,
} from "@mj-studio/react-native-naver-map";
import { captureRef } from "react-native-view-shot";

import type { RoutePoint } from "@/src/features/plogging-session";
import { colors } from "@/src/shared/theme";

type RouteSnapshotMapProps = {
  routePoints: RoutePoint[];
  onCaptured: (uri: string) => void;
  onCaptureFailed?: (error: unknown) => void;
  style?: StyleProp<ViewStyle>;
};

type SnapshotLayout = {
  height: number;
  width: number;
};

type ProjectedRoutePoint = {
  x: number;
  y: number;
};

type RouteSegment = {
  angle: string;
  key: string;
  left: number;
  length: number;
  top: number;
};

type RouteBounds = {
  maxLat: number;
  maxLng: number;
  minLat: number;
  minLng: number;
};

// 단일 좌표만 있을 때 보여줄 기본 영역 크기 (약 ±275m).
const SINGLE_POINT_DELTA = 0.005;

// 경로가 카드 모서리에 붙거나 잘리지 않도록 bounds를 넉넉하게 잡는다.
const REGION_PADDING_RATIO = 1.8;
const SNAPSHOT_MAP_PADDING = { bottom: 18, left: 18, right: 18, top: 18 };

// 카메라가 bounds로 맞춰진 뒤 타일이 실제로 그려지기까지 약간의 여유.
const MAP_READY_TIMEOUT_MS = 4_000;
const CAMERA_SETTLE_FALLBACK_MS = 350;
const CAPTURE_DELAY_MS = 750;
const NATIVE_CAPTURE_TIMEOUT_MS = 5_000;
const MAX_CAPTURE_ATTEMPTS = 3;
const FALLBACK_CAPTURE_DELAY_MS = 150;
const FALLBACK_CAPTURE_TIMEOUT_MS = 5_000;
const FALLBACK_ROUTE_PADDING = 28;
const FALLBACK_ROUTE_WIDTH = 8;
const MAX_FALLBACK_ROUTE_POINTS = 160;

export function RouteSnapshotMap({
  routePoints,
  onCaptured,
  onCaptureFailed,
  style,
}: RouteSnapshotMapProps) {
  const containerRef = useRef<View>(null);
  const fallbackRef = useRef<View>(null);
  const captureCompletedRef = useRef(false);
  const nativeCaptureInFlightRef = useRef(false);
  const routeSignature = useMemo(
    () => getRouteSignature(routePoints),
    [routePoints]
  );
  const region = useMemo(() => computeRegion(routePoints), [routePoints]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [cameraSettled, setCameraSettled] = useState(false);
  const [captureAttempt, setCaptureAttempt] = useState(0);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [fallbackLayout, setFallbackLayout] =
    useState<SnapshotLayout | null>(null);

  useEffect(() => {
    captureCompletedRef.current = false;
    nativeCaptureInFlightRef.current = false;
    setCameraSettled(false);
    setCaptureAttempt(0);
    setFallbackReason(null);
    setFallbackLayout(null);
  }, [routeSignature]);

  useEffect(() => {
    if (mapInitialized || fallbackReason || captureCompletedRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (captureCompletedRef.current) return;
      if (__DEV__) {
        console.log("[plogging-snapshot] map init timed out");
      }
      setFallbackReason("지도 초기화 시간이 초과되었습니다.");
    }, MAP_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [fallbackReason, mapInitialized, routeSignature]);

  useEffect(() => {
    if (!mapInitialized || fallbackReason) return;

    setCameraSettled(false);
    const timer = setTimeout(() => {
      setCameraSettled(true);
    }, CAMERA_SETTLE_FALLBACK_MS);

    return () => clearTimeout(timer);
  }, [fallbackReason, mapInitialized, region]);

  useEffect(() => {
    if (
      !mapInitialized ||
      !cameraSettled ||
      fallbackReason ||
      captureCompletedRef.current ||
      nativeCaptureInFlightRef.current
    ) {
      return;
    }
    nativeCaptureInFlightRef.current = true;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        if (__DEV__) {
          console.log("[plogging-snapshot] capturing native map", {
            attempt: captureAttempt + 1,
          });
        }
        const uri = await withTimeout(
          captureRef(containerRef, {
            format: "png",
            quality: 0.9,
            result: "tmpfile",
          }),
          NATIVE_CAPTURE_TIMEOUT_MS,
          "지도 이미지 캡처 시간이 초과되었습니다."
        );
        if (cancelled || captureCompletedRef.current) return;
        captureCompletedRef.current = true;
        if (__DEV__) {
          console.log("[plogging-snapshot] native map captured", { uri });
        }
        onCaptured(uri);
      } catch (error) {
        nativeCaptureInFlightRef.current = false;
        if (cancelled || captureCompletedRef.current) return;
        if (__DEV__) {
          console.log("[plogging-snapshot] capture failed", {
            attempt: captureAttempt + 1,
            message:
              error instanceof Error ? error.message : "unknown capture error",
          });
        }
        // 한 번 실패하더라도 다음 mount 시 재시도할 수 있도록 가드 해제.
        if (captureAttempt < MAX_CAPTURE_ATTEMPTS - 1) {
          setCaptureAttempt((attempt) => attempt + 1);
        } else {
          setFallbackReason(
            error instanceof Error
              ? error.message
              : "지도 이미지 캡처에 실패했습니다."
          );
        }
      }
    }, CAPTURE_DELAY_MS);

    return () => {
      cancelled = true;
      nativeCaptureInFlightRef.current = false;
      clearTimeout(timer);
    };
  }, [
    cameraSettled,
    captureAttempt,
    fallbackReason,
    mapInitialized,
    onCaptured,
  ]);

  useEffect(() => {
    if (!fallbackReason || !fallbackLayout || captureCompletedRef.current) {
      return;
    }
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        if (__DEV__) {
          console.log("[plogging-snapshot] capturing fallback", {
            reason: fallbackReason,
          });
        }
        const uri = await withTimeout(
          captureRef(fallbackRef, {
            format: "png",
            quality: 0.9,
            result: "tmpfile",
          }),
          FALLBACK_CAPTURE_TIMEOUT_MS,
          "대체 지도 이미지 캡처 시간이 초과되었습니다."
        );
        if (cancelled || captureCompletedRef.current) return;
        captureCompletedRef.current = true;
        if (__DEV__) {
          console.log("[plogging-snapshot] fallback captured", { uri });
        }
        onCaptured(uri);
      } catch (error) {
        if (cancelled || captureCompletedRef.current) return;
        if (__DEV__) {
          console.log("[plogging-snapshot] fallback capture failed", {
            message:
              error instanceof Error ? error.message : "unknown capture error",
          });
        }
        onCaptureFailed?.(error);
      }
    }, FALLBACK_CAPTURE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    fallbackLayout,
    fallbackReason,
    onCaptured,
    onCaptureFailed,
    routeSignature,
  ]);

  const handleFallbackLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height <= 0 || width <= 0) return;
    setFallbackLayout((prev) =>
      prev && prev.height === height && prev.width === width
        ? prev
        : { height, width }
    );
  };

  if (fallbackReason) {
    return (
      <View
        ref={fallbackRef}
        collapsable={false}
        onLayout={handleFallbackLayout}
        style={[styles.root, styles.fallbackRoot, style]}
      >
        <FallbackSnapshotMap
          layout={fallbackLayout}
          routePoints={routePoints}
        />
      </View>
    );
  }

  return (
    <View ref={containerRef} collapsable={false} style={[styles.root, style]}>
      <NaverMapView
        animationDuration={0}
        isShowLocationButton={false}
        isShowZoomControls={false}
        isUseTextureViewAndroid
        mapPadding={SNAPSHOT_MAP_PADDING}
        onCameraIdle={() => setCameraSettled(true)}
        onInitialized={() => setMapInitialized(true)}
        region={region}
        style={StyleSheet.absoluteFill}
      >
        {routePoints.length >= 2 ? (
          <NaverMapPolylineOverlay
            color={colors.primary}
            coords={routePoints}
            width={8}
          />
        ) : routePoints.length === 1 ? (
          <NaverMapMarkerOverlay
            latitude={routePoints[0].latitude}
            longitude={routePoints[0].longitude}
          />
        ) : null}
      </NaverMapView>
    </View>
  );
}

function FallbackSnapshotMap({
  layout,
  routePoints,
}: {
  layout: SnapshotLayout | null;
  routePoints: RoutePoint[];
}) {
  const projectedPoints = useMemo(
    () => (layout ? projectRoutePoints(routePoints, layout) : []),
    [layout, routePoints]
  );
  const segments = useMemo(
    () => buildRouteSegments(projectedPoints),
    [projectedPoints]
  );
  const startPoint = projectedPoints[0];
  const endPoint = projectedPoints[projectedPoints.length - 1];

  return (
    <View style={styles.fallbackBase}>
      <View style={[styles.fallbackRoad, styles.fallbackRoadOne]} />
      <View style={[styles.fallbackRoad, styles.fallbackRoadTwo]} />
      <View style={[styles.fallbackRoad, styles.fallbackRoadThree]} />
      <View style={[styles.fallbackPark, styles.fallbackParkOne]} />
      <View style={[styles.fallbackPark, styles.fallbackParkTwo]} />
      <View style={styles.fallbackWater} />
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={[
            styles.fallbackRouteSegment,
            {
              left: segment.left,
              top: segment.top,
              transform: [{ rotate: segment.angle }],
              width: segment.length,
            },
          ]}
        />
      ))}
      {startPoint ? (
        <View
          style={[
            styles.fallbackMarker,
            styles.fallbackStartMarker,
            {
              left: startPoint.x - 7,
              top: startPoint.y - 7,
            },
          ]}
        />
      ) : null}
      {endPoint ? (
        <View
          style={[
            styles.fallbackMarker,
            styles.fallbackEndMarker,
            {
              left: endPoint.x - 8,
              top: endPoint.y - 8,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function computeRegion(points: RoutePoint[]): Region {
  const bounds = getRouteBounds(points);

  if (!bounds) {
    // 호출 측에서 이 컴포넌트를 빈 경로일 때 렌더하지 않도록 가드해야 한다.
    // 방어용 fallback: 한반도 중앙.
    return {
      latitude: 36.5,
      latitudeDelta: 1,
      longitude: 127.8,
      longitudeDelta: 1,
    };
  }

  const rawLatSpan = bounds.maxLat - bounds.minLat;
  const rawLngSpan = bounds.maxLng - bounds.minLng;
  const latitudeDelta = Math.max(
    rawLatSpan * REGION_PADDING_RATIO,
    SINGLE_POINT_DELTA
  );
  const longitudeDelta = Math.max(
    rawLngSpan * REGION_PADDING_RATIO,
    SINGLE_POINT_DELTA
  );
  const centerLatitude = (bounds.minLat + bounds.maxLat) / 2;
  const centerLongitude = (bounds.minLng + bounds.maxLng) / 2;

  // @mj-studio/react-native-naver-map의 Region은 중심 좌표가 아니라
  // south-west(좌하단) 좌표 + delta를 받는다.
  return {
    latitude: centerLatitude - latitudeDelta / 2,
    latitudeDelta,
    longitude: centerLongitude - longitudeDelta / 2,
    longitudeDelta,
  };
}

function projectRoutePoints(
  points: RoutePoint[],
  layout: SnapshotLayout
): ProjectedRoutePoint[] {
  if (points.length === 0) return [];

  const bounds = getRouteBounds(points);
  if (!bounds) return [];

  const sampledPoints = sampleRoutePoints(points, MAX_FALLBACK_ROUTE_POINTS);
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const padding = Math.min(
    FALLBACK_ROUTE_PADDING,
    layout.width * 0.22,
    layout.height * 0.22
  );
  const drawableWidth = Math.max(1, layout.width - padding * 2);
  const drawableHeight = Math.max(1, layout.height - padding * 2);

  return sampledPoints.map((point) => ({
    x:
      lngSpan === 0
        ? layout.width / 2
        : padding +
          ((point.longitude - bounds.minLng) / lngSpan) * drawableWidth,
    y:
      latSpan === 0
        ? layout.height / 2
        : padding +
          ((bounds.maxLat - point.latitude) / latSpan) * drawableHeight,
  }));
}

function sampleRoutePoints(points: RoutePoint[], maxPoints: number) {
  if (points.length <= maxPoints) return points;

  const selectedIndexes = new Set<number>([0, points.length - 1]);
  const extremaIndexes = getRouteExtremaIndexes(points);
  for (const index of extremaIndexes) {
    selectedIndexes.add(index);
  }

  const remainingSlots = Math.max(0, maxPoints - selectedIndexes.size);
  for (let i = 0; i < remainingSlots; i += 1) {
    const index =
      remainingSlots <= 1
        ? 0
        : Math.round((i * (points.length - 1)) / (remainingSlots - 1));
    selectedIndexes.add(index);
  }

  return Array.from(selectedIndexes)
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

function getRouteBounds(points: RoutePoint[]): RouteBounds | null {
  if (points.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const point of points) {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      continue;
    }
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  }

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return null;
  }

  return { maxLat, maxLng, minLat, minLng };
}

function getRouteExtremaIndexes(points: RoutePoint[]) {
  const indexes = new Set<number>();
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLatIndex = 0;
  let maxLatIndex = 0;
  let minLngIndex = 0;
  let maxLngIndex = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      continue;
    }

    if (point.latitude < minLat) {
      minLat = point.latitude;
      minLatIndex = index;
    }
    if (point.latitude > maxLat) {
      maxLat = point.latitude;
      maxLatIndex = index;
    }
    if (point.longitude < minLng) {
      minLng = point.longitude;
      minLngIndex = index;
    }
    if (point.longitude > maxLng) {
      maxLng = point.longitude;
      maxLngIndex = index;
    }
  }

  indexes.add(minLatIndex);
  indexes.add(maxLatIndex);
  indexes.add(minLngIndex);
  indexes.add(maxLngIndex);
  return indexes;
}

function buildRouteSegments(points: ProjectedRoutePoint[]): RouteSegment[] {
  const segments: RouteSegment[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const length = Math.hypot(dx, dy);

    if (length < 2) continue;

    segments.push({
      angle: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`,
      key: `${index}-${current.x.toFixed(1)}-${current.y.toFixed(1)}`,
      left: (current.x + next.x) / 2 - length / 2,
      length,
      top: (current.y + next.y) / 2 - FALLBACK_ROUTE_WIDTH / 2,
    });
  }

  return segments;
}

function getRouteSignature(points: RoutePoint[]): string {
  if (points.length === 0) return "empty";

  const bounds = getRouteBounds(points);
  const first = points[0];
  const last = points[points.length - 1];
  return [
    points.length,
    first.latitude.toFixed(6),
    first.longitude.toFixed(6),
    last.latitude.toFixed(6),
    last.longitude.toFixed(6),
    bounds?.minLat.toFixed(6) ?? "nan",
    bounds?.maxLat.toFixed(6) ?? "nan",
    bounds?.minLng.toFixed(6) ?? "nan",
    bounds?.maxLng.toFixed(6) ?? "nan",
  ].join(":");
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const styles = StyleSheet.create({
  fallbackBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F6F3EA",
  },
  fallbackEndMarker: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.surface,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  fallbackMarker: {
    borderRadius: 999,
    position: "absolute",
    zIndex: 4,
  },
  fallbackPark: {
    backgroundColor: "#BEE8B1",
    borderRadius: 14,
    opacity: 0.8,
    position: "absolute",
  },
  fallbackParkOne: {
    height: "34%",
    right: "8%",
    top: "18%",
    transform: [{ rotate: "-10deg" }],
    width: "30%",
  },
  fallbackParkTwo: {
    bottom: "8%",
    height: "24%",
    left: "12%",
    transform: [{ rotate: "7deg" }],
    width: "34%",
  },
  fallbackRoad: {
    backgroundColor: colors.surface,
    borderColor: "#E2DED2",
    borderWidth: 1,
    height: 26,
    opacity: 0.92,
    position: "absolute",
    width: "125%",
  },
  fallbackRoadOne: {
    left: "-12%",
    top: "18%",
    transform: [{ rotate: "-5deg" }],
  },
  fallbackRoadThree: {
    left: "-14%",
    top: "73%",
    transform: [{ rotate: "-26deg" }],
  },
  fallbackRoadTwo: {
    left: "-12%",
    top: "47%",
    transform: [{ rotate: "22deg" }],
  },
  fallbackRoot: {
    backgroundColor: "#F6F3EA",
  },
  fallbackRouteSegment: {
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: FALLBACK_ROUTE_WIDTH,
    borderWidth: 1.5,
    height: FALLBACK_ROUTE_WIDTH,
    position: "absolute",
    zIndex: 3,
  },
  fallbackStartMarker: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 4,
    height: 14,
    width: 14,
  },
  fallbackWater: {
    backgroundColor: "#9ADDEA",
    borderRadius: 18,
    bottom: "18%",
    height: "28%",
    opacity: 0.78,
    position: "absolute",
    right: "15%",
    transform: [{ rotate: "-8deg" }],
    width: "25%",
  },
  root: {
    flex: 1,
    overflow: "hidden",
  },
});
