type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteArrowMarker = RoutePoint & {
  bearing: number;
  id: string;
};

export type RouteGuideMarkers = {
  arrows: RouteArrowMarker[];
};

type RouteSegment = {
  bearing: number;
  distance: number;
  end: RoutePoint;
  endDistance: number;
  start: RoutePoint;
  startDistance: number;
};

const MAX_ARROW_MARKERS = 32;
const ARROW_SPACING_METERS = 90;
const MIN_SEGMENT_METERS = 1;

export function buildRouteGuideMarkers(
  routePoints: RoutePoint[]
): RouteGuideMarkers {
  if (routePoints.length < 2) {
    return {
      arrows: [],
    };
  }

  const segments = buildRouteSegments(routePoints);
  const totalDistance = segments[segments.length - 1]?.endDistance ?? 0;

  return {
    arrows: sampleRouteMarkers(
      segments,
      markerCount(totalDistance, ARROW_SPACING_METERS, MAX_ARROW_MARKERS),
      "route-arrow"
    ),
  };
}

function buildRouteSegments(routePoints: RoutePoint[]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  let totalDistance = 0;

  for (let index = 1; index < routePoints.length; index += 1) {
    const start = routePoints[index - 1];
    const end = routePoints[index];
    const distance = haversineMeters(start, end);
    if (distance < MIN_SEGMENT_METERS) continue;

    const startDistance = totalDistance;
    totalDistance += distance;
    segments.push({
      bearing: bearingDegrees(start, end),
      distance,
      end,
      endDistance: totalDistance,
      start,
      startDistance,
    });
  }

  return segments;
}

function markerCount(
  totalDistance: number,
  spacingMeters: number,
  maxCount: number
): number {
  if (totalDistance < MIN_SEGMENT_METERS) return 0;
  return Math.min(
    maxCount,
    Math.max(1, Math.round(totalDistance / spacingMeters))
  );
}

function sampleRouteMarkers(
  segments: RouteSegment[],
  count: number,
  idPrefix: string
): RouteArrowMarker[] {
  const totalDistance = segments[segments.length - 1]?.endDistance ?? 0;
  if (count <= 0 || totalDistance <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const targetDistance = (totalDistance * (index + 1)) / (count + 1);
    const sample = sampleRouteAtDistance(segments, targetDistance);

    return {
      bearing: sample.bearing,
      id: `${idPrefix}-${index}`,
      latitude: sample.latitude,
      longitude: sample.longitude,
    };
  });
}

function sampleRouteAtDistance(
  segments: RouteSegment[],
  targetDistance: number
): RouteArrowMarker {
  const fallback = segments[segments.length - 1];
  const segment =
    segments.find((candidate) => targetDistance <= candidate.endDistance) ??
    fallback;
  const ratio =
    segment.distance > 0
      ? clamp(
          (targetDistance - segment.startDistance) / segment.distance,
          0,
          1
        )
      : 0;

  return {
    bearing: segment.bearing,
    id: "route-sample",
    latitude:
      segment.start.latitude +
      (segment.end.latitude - segment.start.latitude) * ratio,
    longitude:
      segment.start.longitude +
      (segment.end.longitude - segment.start.longitude) * ratio,
  };
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

function bearingDegrees(a: RoutePoint, b: RoutePoint): number {
  const phi1 = toRadians(a.latitude);
  const phi2 = toRadians(b.latitude);
  const deltaLambda = toRadians(b.longitude - a.longitude);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
