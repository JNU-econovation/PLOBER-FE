import { VectorTile } from "@mapbox/vector-tile";
import Pbf from "pbf";

import type { HotspotPolygon } from "../components/types";

const HOTSPOT_TILE_URL =
  "http://54.180.111.192:3000/predicted_hotspots/{z}/{x}/{y}";
const HOTSPOT_SOURCE_LAYER = "predicted_hotspots";
const HOTSPOT_ZOOM = 14;
const MAX_CENTER_TILE_POLYGONS = 420;
const MAX_NEIGHBOR_TILE_POLYGONS = 18;
const NEIGHBOR_TILE_OFFSETS = [-1, 0, 1] as const;
const hotspotTileCache = new Map<string, Promise<HotspotPolygon[]>>();

type TileCoordinate = {
  z: number;
  x: number;
  y: number;
};

type TileRequest = TileCoordinate & {
  maxPolygons: number;
};

type HotspotProgressPhase = "center" | "complete";

type TileDebugStats = {
  featureCount: number;
  scoreBands: {
    high: number;
    low: number;
    medium: number;
    veryHigh: number;
  };
  maxScore: number | null;
  minScore: number | null;
  polygonCount: number;
};

type RankedFeature = {
  index: number;
  trashScore: number;
};

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

type GeoJsonFeature = {
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon | null;
  properties?: Record<string, unknown>;
};

export async function getHotspotPolygonsNear(point: {
  latitude: number;
  longitude: number;
}): Promise<HotspotPolygon[]> {
  return getHotspotPolygonsNearProgressive(point);
}

export async function getHotspotPolygonsNearProgressive(
  point: {
    latitude: number;
    longitude: number;
  },
  onProgress?: (polygons: HotspotPolygon[], phase: HotspotProgressPhase) => void
): Promise<HotspotPolygon[]> {
  const center = lonLatToTile(point.longitude, point.latitude, HOTSPOT_ZOOM);
  const centerTile = {
    ...center,
    maxPolygons: MAX_CENTER_TILE_POLYGONS,
  };
  const neighborTiles = getNeighborTiles(center)
    .filter((tile) => tile.x !== center.x || tile.y !== center.y)
    .map((tile) => ({
      ...tile,
      maxPolygons: MAX_NEIGHBOR_TILE_POLYGONS,
    }));
  const tiles = [centerTile, ...neighborTiles];
  logHotspotDebug("load-near", {
    center,
    point,
    tiles: tiles.map((tile) => formatTile(tile)),
  });

  let centerPolygons: HotspotPolygon[] = [];
  let centerError: unknown = null;
  try {
    centerPolygons = await getHotspotPolygonsForTile(centerTile);
    onProgress?.(centerPolygons, "center");
    logHotspotDebug("center-ready", {
      polygonCount: centerPolygons.length,
      tile: formatTile(centerTile),
    });
  } catch (error) {
    centerError = error;
    logHotspotDebug("tile-error", {
      message: getErrorMessage(error),
      tile: formatTile(centerTile),
    });
  }

  const tileResults = await Promise.allSettled(
    neighborTiles.map(getHotspotPolygonsForTile)
  );
  const tilePolygons = tileResults.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    logHotspotDebug("tile-error", {
      message: getErrorMessage(result.reason),
      tile: formatTile(neighborTiles[index]),
    });
    return [];
  });
  const failedTileCount = tileResults.filter(
    (result) => result.status === "rejected"
  ).length + (centerError ? 1 : 0);
  const polygons = [...centerPolygons, ...tilePolygons.flat()];

  if (polygons.length === 0) {
    const firstError = tileResults.find(
      (result) => result.status === "rejected"
    );
    if (centerError) {
      throw new Error(getErrorMessage(centerError));
    }
    if (firstError?.status === "rejected") {
      throw new Error(getErrorMessage(firstError.reason));
    }
  }
  onProgress?.(polygons, "complete");
  logHotspotDebug("load-complete", {
    failedTileCount,
    polygonCount: polygons.length,
    tileCount: tiles.length,
  });

  return polygons;
}

export function getHotspotTileKey(point: {
  latitude: number;
  longitude: number;
}): string {
  const center = lonLatToTile(point.longitude, point.latitude, HOTSPOT_ZOOM);
  return `${center.z}:${center.x}:${center.y}`;
}

async function getHotspotPolygonsForTile(
  tile: TileRequest
): Promise<HotspotPolygon[]> {
  const cacheKey = `${formatTile(tile)}:${tile.maxPolygons}`;
  const cached = hotspotTileCache.get(cacheKey);
  if (cached) {
    logHotspotDebug("cache-hit", {
      maxPolygons: tile.maxPolygons,
      tile: formatTile(tile),
    });
    return cached;
  }

  const request = requestHotspotPolygonsForTile(tile).catch((error) => {
    hotspotTileCache.delete(cacheKey);
    throw error;
  });
  hotspotTileCache.set(cacheKey, request);
  return request;
}

async function requestHotspotPolygonsForTile(
  tile: TileRequest
): Promise<HotspotPolygon[]> {
  const url = getHotspotTileUrl(tile);
  const startedAt = Date.now();
  logHotspotDebug("request", {
    maxPolygons: tile.maxPolygons,
    tile: formatTile(tile),
    url,
  });

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    logHotspotDebug("request-error", {
      durationMs: Date.now() - startedAt,
      message: getErrorMessage(error),
      tile: formatTile(tile),
      url,
    });
    throw error;
  }
  logHotspotDebug("response", {
    durationMs: Date.now() - startedAt,
    status: response.status,
    tile: formatTile(tile),
    url,
  });

  if (response.status === 204) {
    logHotspotDebug("empty-tile", {
      reason: "204",
      tile: formatTile(tile),
    });
    return [];
  }
  if (!response.ok) {
    throw new Error(`히트맵 타일 요청 실패 (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  logHotspotDebug("array-buffer", {
    byteLength: buffer.byteLength,
    tile: formatTile(tile),
  });
  if (buffer.byteLength === 0) {
    logHotspotDebug("empty-tile", {
      reason: "zero-byte",
      tile: formatTile(tile),
    });
    return [];
  }
  const vectorTile = new VectorTile(new Pbf(buffer));
  const layer = vectorTile.layers[HOTSPOT_SOURCE_LAYER];
  if (!layer) {
    logHotspotDebug("empty-tile", {
      availableLayers: Object.keys(vectorTile.layers),
      reason: "missing-layer",
      tile: formatTile(tile),
    });
    return [];
  }

  const polygons: HotspotPolygon[] = [];
  const stats: TileDebugStats = {
    featureCount: layer.length,
    maxScore: null,
    minScore: null,
    polygonCount: 0,
    scoreBands: {
      high: 0,
      low: 0,
      medium: 0,
      veryHigh: 0,
    },
  };
  const rankedFeatures = Array.from({ length: layer.length }, (_, index) => {
    const feature = layer.feature(index);
    const trashScore = getTrashScore(feature.properties);
    stats.maxScore = Math.max(stats.maxScore ?? trashScore, trashScore);
    stats.minScore = Math.min(stats.minScore ?? trashScore, trashScore);
    if (trashScore >= 0.8) stats.scoreBands.veryHigh += 1;
    else if (trashScore >= 0.6) stats.scoreBands.high += 1;
    else if (trashScore >= 0.3) stats.scoreBands.medium += 1;
    else stats.scoreBands.low += 1;
    return {
      index,
      trashScore,
    };
  });
  const selectedFeatures = selectVisibleHotspotFeatures(
    rankedFeatures,
    tile.maxPolygons
  );

  for (const rankedFeature of selectedFeatures) {
    const feature = layer.feature(rankedFeature.index);
    const geoJson = feature.toGeoJSON(tile.x, tile.y, tile.z) as GeoJsonFeature;
    const rings = getOuterRings(geoJson.geometry);

    rings.forEach((ring, ringIndex) => {
      const coords = ring
        .map(([longitude, latitude]) => ({ latitude, longitude }))
        .filter(isValidCoord);
      const center = getRingCenter(coords);

      if (coords.length >= 3 && center) {
        polygons.push({
          blobCoords: getOrganicBlobCoords(
            center,
            rankedFeature.trashScore,
            `${tile.z}-${tile.x}-${tile.y}-${rankedFeature.index}-${ringIndex}`
          ),
          center,
          coords,
          id: `${tile.z}-${tile.x}-${tile.y}-${rankedFeature.index}-${ringIndex}`,
          trashScore: rankedFeature.trashScore,
        });
        stats.polygonCount += 1;
      }
    });
  }

  logHotspotDebug("parsed", {
    byteLength: buffer.byteLength,
    maxPolygons: tile.maxPolygons,
    selectedFeatureCount: selectedFeatures.length,
    stats,
    tile: formatTile(tile),
  });

  return polygons;
}

function selectVisibleHotspotFeatures(
  features: RankedFeature[],
  maxPolygons: number
): RankedFeature[] {
  const bands = [
    { max: 1.01, min: 0.8, ratio: 0.3 },
    { max: 0.8, min: 0.6, ratio: 0.28 },
    { max: 0.6, min: 0.3, ratio: 0.26 },
    { max: 0.3, min: 0, ratio: 0.16 },
  ];
  const selected: RankedFeature[] = [];
  const used = new Set<number>();

  for (const band of bands) {
    const quota = Math.max(1, Math.floor(maxPolygons * band.ratio));
    const bandFeatures = features
      .filter(
        (feature) =>
          feature.trashScore >= band.min && feature.trashScore < band.max
      )
      .sort((a, b) => b.trashScore - a.trashScore)
      .slice(0, quota);

    bandFeatures.forEach((feature) => {
      selected.push(feature);
      used.add(feature.index);
    });
  }

  if (selected.length < maxPolygons) {
    const remaining = features
      .filter((feature) => !used.has(feature.index))
      .sort((a, b) => b.trashScore - a.trashScore)
      .slice(0, maxPolygons - selected.length);
    selected.push(...remaining);
  }

  return selected
    .slice(0, maxPolygons)
    .sort((a, b) => a.trashScore - b.trashScore);
}

function getHotspotTileUrl(tile: TileCoordinate): string {
  return HOTSPOT_TILE_URL.replace("{z}", String(tile.z))
    .replace("{x}", String(tile.x))
    .replace("{y}", String(tile.y));
}

function formatTile(tile: TileCoordinate): string {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

function logHotspotDebug(message: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  console.log(`[hotspot] ${message}`, payload);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "히트맵 요청 실패";
}

function lonLatToTile(
  longitude: number,
  latitude: number,
  zoom: number
): TileCoordinate {
  const latRad = (latitude * Math.PI) / 180;
  const scale = 2 ** zoom;
  return {
    z: zoom,
    x: Math.floor(((longitude + 180) / 360) * scale),
    y: Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2) *
        scale
    ),
  };
}

function getNeighborTiles(center: TileCoordinate): TileCoordinate[] {
  const scale = 2 ** center.z;
  const maxY = scale - 1;

  return NEIGHBOR_TILE_OFFSETS.flatMap((dy) =>
    NEIGHBOR_TILE_OFFSETS.map((dx) => ({
      z: center.z,
      x: wrapTileX(center.x + dx, scale),
      y: clamp(center.y + dy, 0, maxY),
    }))
  );
}

function wrapTileX(x: number, scale: number): number {
  return ((x % scale) + scale) % scale;
}

function getOuterRings(
  geometry: GeoJsonFeature["geometry"]
): number[][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
  }
  return geometry.coordinates
    .map((polygon) => polygon[0])
    .filter((ring): ring is number[][] => Boolean(ring));
}

function getTrashScore(properties: Record<string, unknown> | undefined): number {
  const value = properties?.trash_score;
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clamp(value, 0, 1);
}

function isValidCoord(coord: {
  latitude: number;
  longitude: number;
}): boolean {
  return (
    Number.isFinite(coord.latitude) &&
    Number.isFinite(coord.longitude) &&
    Math.abs(coord.latitude) <= 90 &&
    Math.abs(coord.longitude) <= 180
  );
}

export function getHotspotColor(trashScore: number): string {
  if (trashScore >= 0.8) return "rgba(185, 28, 28, 0.90)";
  if (trashScore >= 0.6) return "rgba(239, 68, 68, 0.70)";
  if (trashScore >= 0.3) return "rgba(249, 115, 22, 0.50)";
  if (trashScore > 0) return "rgba(234, 179, 8, 0.30)";
  return "rgba(34, 197, 94, 0.05)";
}

export function getHotspotBlobColor(trashScore: number): string {
  if (trashScore >= 0.85) return "rgba(185, 28, 28, 0.13)";
  if (trashScore >= 0.7) return "rgba(239, 68, 68, 0.11)";
  if (trashScore >= 0.55) return "rgba(249, 115, 22, 0.10)";
  if (trashScore >= 0.35) return "rgba(250, 204, 21, 0.10)";
  return "rgba(34, 197, 94, 0.08)";
}

export function getHotspotBlobRadius(trashScore: number): number {
  return Math.round(18 + clamp(trashScore, 0, 1) * 22);
}

function getRingCenter(
  coords: { latitude: number; longitude: number }[]
): { latitude: number; longitude: number } | null {
  if (coords.length < 3) return null;
  const total = coords.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: total.latitude / coords.length,
    longitude: total.longitude / coords.length,
  };
}

function getOrganicBlobCoords(
  center: { latitude: number; longitude: number },
  trashScore: number,
  seed: string
): { latitude: number; longitude: number }[] {
  const radiusMeters = getHotspotBlobRadius(trashScore);
  const points = 9;
  const coords = Array.from({ length: points }, (_, index) => {
    const noise = seededNoise(`${seed}:${index}`);
    const angle = (Math.PI * 2 * index) / points + seededNoise(seed) * 0.22;
    const pointRadius = radiusMeters * (0.72 + noise * 0.42);
    return offsetCoord(center, pointRadius, angle);
  }).reverse();

  return [...coords, coords[0]];
}

function offsetCoord(
  center: { latitude: number; longitude: number },
  radiusMeters: number,
  angle: number
): { latitude: number; longitude: number } {
  const latitudeDelta = (Math.sin(angle) * radiusMeters) / 111_320;
  const longitudeDelta =
    (Math.cos(angle) * radiusMeters) /
    (111_320 * Math.cos((center.latitude * Math.PI) / 180));

  return {
    latitude: center.latitude + latitudeDelta,
    longitude: center.longitude + longitudeDelta,
  };
}

function seededNoise(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
