import "@/src/shared/polyfills/text-decoder";
import { VectorTile } from "@mapbox/vector-tile";
import { cellToBoundary, isValidCell } from "h3-js";
import Pbf from "pbf";

import type { HotspotPolygon } from "../components/types";

const HOTSPOT_TILE_URL = "http://54.180.111.192:3000/hotspots/{z}/{x}/{y}";
const HOTSPOT_MIN_ZOOM = 8;
const HOTSPOT_MAX_ZOOM = 18;
const DEFAULT_HOTSPOT_ZOOM = 14;
const NEIGHBOR_TILE_OFFSETS = [-1, 0, 1] as const;
const hotspotTileCache = new Map<string, Promise<HotspotPolygon[]>>();

type HotspotLod = HotspotPolygon["lod"];

type HotspotLayerConfig = {
  lod: HotspotLod;
  maxCenterPolygons: number;
  maxNeighborPolygons: number;
  sourceLayer: string;
};

type TileCoordinate = {
  z: number;
  x: number;
  y: number;
};

type TileLayerRequest = HotspotLayerConfig & {
  maxPolygons: number;
};

type TileRequest = TileCoordinate & {
  layers: TileLayerRequest[];
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

type MapCoord = {
  latitude: number;
  longitude: number;
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

const HOTSPOT_LAYER_CONFIGS: HotspotLayerConfig[] = [
  {
    lod: "res7",
    maxCenterPolygons: 120,
    maxNeighborPolygons: 12,
    sourceLayer: "hotspots_res7",
  },
  {
    lod: "res9",
    maxCenterPolygons: 420,
    maxNeighborPolygons: 18,
    sourceLayer: "hotspots_res9",
  },
  {
    lod: "res11",
    maxCenterPolygons: 560,
    maxNeighborPolygons: 20,
    sourceLayer: "hotspots_res11",
  },
];

export async function getHotspotPolygonsNear(
  point: {
    latitude: number;
    longitude: number;
  },
  zoomLevel = DEFAULT_HOTSPOT_ZOOM
): Promise<HotspotPolygon[]> {
  return getHotspotPolygonsNearProgressive(point, zoomLevel);
}

export async function getHotspotPolygonsNearProgressive(
  point: {
    latitude: number;
    longitude: number;
  },
  zoomLevel = DEFAULT_HOTSPOT_ZOOM,
  onProgress?: (polygons: HotspotPolygon[], phase: HotspotProgressPhase) => void
): Promise<HotspotPolygon[]> {
  const tileZoom = getHotspotDataZoom(zoomLevel);
  const layerConfigs = getActiveHotspotLayerConfigs(zoomLevel);
  const center = lonLatToTile(point.longitude, point.latitude, tileZoom);
  const centerTile: TileRequest = {
    ...center,
    layers: layerConfigs.map((layer) => ({
      ...layer,
      maxPolygons: layer.maxCenterPolygons,
    })),
  };
  const neighborTiles: TileRequest[] = getNeighborTiles(center)
    .filter((tile) => tile.x !== center.x || tile.y !== center.y)
    .map((tile) => ({
      ...tile,
      layers: layerConfigs.map((layer) => ({
        ...layer,
        maxPolygons: layer.maxNeighborPolygons,
      })),
    }));
  const tiles = [centerTile, ...neighborTiles];
  logHotspotDebug("load-near", {
    center,
    layers: layerConfigs.map((layer) => layer.sourceLayer),
    point,
    tiles: tiles.map((tile) => formatTile(tile)),
    zoomLevel,
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
  const failedTileCount =
    tileResults.filter((result) => result.status === "rejected").length +
    (centerError ? 1 : 0);
  const polygons = dedupeHotspotPolygons([
    ...centerPolygons,
    ...tilePolygons.flat(),
  ]);

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

export function getHotspotTileKey(
  point: {
    latitude: number;
    longitude: number;
  },
  zoomLevel = DEFAULT_HOTSPOT_ZOOM
): string {
  const tileZoom = getHotspotDataZoom(zoomLevel);
  const center = lonLatToTile(point.longitude, point.latitude, tileZoom);
  const layers = getActiveHotspotLayerConfigs(zoomLevel)
    .map((layer) => layer.lod)
    .join(",");
  return `${center.z}:${center.x}:${center.y}:${layers}`;
}

async function getHotspotPolygonsForTile(
  tile: TileRequest
): Promise<HotspotPolygon[]> {
  const cacheKey = `${formatTile(tile)}:${tile.layers
    .map((layer) => `${layer.sourceLayer}:${layer.maxPolygons}`)
    .join("|")}`;
  const cached = hotspotTileCache.get(cacheKey);
  if (cached) {
    logHotspotDebug("cache-hit", {
      layers: tile.layers.map((layer) => layer.sourceLayer),
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
    layers: tile.layers.map((layer) => layer.sourceLayer),
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
  return tile.layers.flatMap((layerRequest) =>
    parseHotspotLayer(vectorTile, layerRequest, tile, buffer.byteLength)
  );
}

function parseHotspotLayer(
  vectorTile: VectorTile,
  layerRequest: TileLayerRequest,
  tile: TileCoordinate,
  byteLength: number
): HotspotPolygon[] {
  const layer = vectorTile.layers[layerRequest.sourceLayer];
  if (!layer) {
    logHotspotDebug("empty-tile", {
      availableLayers: Object.keys(vectorTile.layers),
      reason: "missing-layer",
      sourceLayer: layerRequest.sourceLayer,
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
    layerRequest.maxPolygons
  );

  for (const rankedFeature of selectedFeatures) {
    const feature = layer.feature(rankedFeature.index);
    const h3Cell = getH3Cell(feature.properties);
    // MVT geometry is clipped at tile edges, so rebuild full H3 cells when possible.
    const h3Ring = getH3CellBoundaryRing(h3Cell);
    const rings = h3Ring
      ? [h3Ring]
      : getGeometryRings(
          (feature.toGeoJSON(tile.x, tile.y, tile.z) as GeoJsonFeature).geometry
        );

    rings.forEach((coords, ringIndex) => {
      const center = getRingCenter(coords);

      if (coords.length >= 3 && center) {
        const id = h3Cell
          ? `${layerRequest.lod}-${h3Cell}`
          : `${layerRequest.lod}-${tile.z}-${tile.x}-${tile.y}-${rankedFeature.index}-${ringIndex}`;
        polygons.push({
          blobCoords: getOrganicBlobCoords(
            center,
            rankedFeature.trashScore,
            id
          ),
          center,
          coords,
          id,
          lod: layerRequest.lod,
          trashScore: rankedFeature.trashScore,
        });
        stats.polygonCount += 1;
      }
    });
  }

  logHotspotDebug("parsed", {
    byteLength,
    maxPolygons: layerRequest.maxPolygons,
    selectedFeatureCount: selectedFeatures.length,
    sourceLayer: layerRequest.sourceLayer,
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

function getActiveHotspotLayerConfigs(zoomLevel: number): HotspotLayerConfig[] {
  return HOTSPOT_LAYER_CONFIGS.filter(
    (layer) => getHotspotLayerFillOpacity(layer.lod, zoomLevel) > 0
  );
}

function getHotspotDataZoom(zoomLevel: number): number {
  const safeZoom = Number.isFinite(zoomLevel) ? zoomLevel : DEFAULT_HOTSPOT_ZOOM;
  return clamp(Math.round(safeZoom), HOTSPOT_MIN_ZOOM, HOTSPOT_MAX_ZOOM);
}

export function getHotspotLayerFillOpacity(
  lod: HotspotLod,
  zoomLevel: number
): number {
  if (lod === "res7") {
    if (zoomLevel <= 12) return 0.45;
    if (zoomLevel >= 12.8) return 0;
    return interpolate(zoomLevel, 12, 12.8, 0.45, 0);
  }

  if (lod === "res9") {
    if (zoomLevel <= 12) return 0;
    if (zoomLevel < 12.8) return interpolate(zoomLevel, 12, 12.8, 0, 0.6);
    if (zoomLevel <= 16.5) return 0.6;
    if (zoomLevel >= 17.2) return 0;
    return interpolate(zoomLevel, 16.5, 17.2, 0.6, 0);
  }

  if (zoomLevel <= 16.5) return 0;
  if (zoomLevel >= 17.2) return 0.55;
  return interpolate(zoomLevel, 16.5, 17.2, 0, 0.55);
}

export function getHotspotFillColor(
  trashScore: number,
  lod: HotspotLod,
  zoomLevel: number
): string {
  return getTrashScoreColor(
    trashScore,
    getHotspotLayerFillOpacity(lod, zoomLevel)
  );
}

export function getHotspotOutlineColor(
  lod: HotspotLod,
  zoomLevel: number
): string {
  if (lod === "res11") return "rgba(255, 255, 255, 0)";
  const fillOpacity = getHotspotLayerFillOpacity(lod, zoomLevel);
  const alpha = lod === "res7" ? fillOpacity * 0.32 : fillOpacity * 0.42;
  return `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
}

export function getHotspotOutlineWidth(lod: HotspotLod): number {
  if (lod === "res11") return 0;
  return lod === "res7" ? 0.8 : 1;
}

function getTrashScoreColor(trashScore: number, opacity: number): string {
  const score = clamp(trashScore, 0, 1);
  const blue = { r: 51, g: 204, b: 255 };
  const orange = { r: 255, g: 153, b: 0 };
  const red = { r: 255, g: 51, b: 102 };
  const from = score < 0.5 ? blue : orange;
  const to = score < 0.5 ? orange : red;
  const localProgress = score < 0.5 ? score / 0.5 : (score - 0.5) / 0.5;
  const r = Math.round(interpolate(localProgress, 0, 1, from.r, to.r));
  const g = Math.round(interpolate(localProgress, 0, 1, from.g, to.g));
  const b = Math.round(interpolate(localProgress, 0, 1, from.b, to.b));

  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1).toFixed(3)})`;
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

function getOuterRings(geometry: GeoJsonFeature["geometry"]): number[][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
  }
  return geometry.coordinates
    .map((polygon) => polygon[0])
    .filter((ring): ring is number[][] => Boolean(ring));
}

function getGeometryRings(geometry: GeoJsonFeature["geometry"]): MapCoord[][] {
  return getOuterRings(geometry)
    .map((ring) =>
      normalizePolygonRing(
        ring.map(([longitude, latitude]) => ({ latitude, longitude }))
      )
    )
    .filter((ring) => ring.length >= 4);
}

export function getH3CellBoundaryRing(h3Cell: string | null): MapCoord[] | null {
  if (!h3Cell || !isValidCell(h3Cell)) return null;

  try {
    const boundary = cellToBoundary(h3Cell, true).map(
      ([longitude, latitude]) => ({
        latitude,
        longitude,
      })
    );
    const ring = normalizePolygonRing(boundary);
    return ring.length >= 4 ? ring : null;
  } catch {
    return null;
  }
}

function getTrashScore(properties: Record<string, unknown> | undefined): number {
  const value = properties?.trash_score_avg ?? properties?.trash_score;
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return clamp(value, 0, 1);
}

function getH3Cell(properties: Record<string, unknown> | undefined): string | null {
  const value = properties?.h3_cell;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function dedupeHotspotPolygons(polygons: HotspotPolygon[]): HotspotPolygon[] {
  const deduped = new Map<string, HotspotPolygon>();

  polygons.forEach((polygon) => {
    if (!deduped.has(polygon.id)) {
      deduped.set(polygon.id, polygon);
    }
  });

  return [...deduped.values()];
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

function normalizePolygonRing(coords: MapCoord[]): MapCoord[] {
  const openRing = removeClosingCoord(coords.filter(isValidCoord));
  if (openRing.length < 3) return [];

  const clockwiseRing =
    getSignedRingArea(openRing) > 0 ? [...openRing].reverse() : openRing;
  return [...clockwiseRing, clockwiseRing[0]];
}

function removeClosingCoord(coords: MapCoord[]): MapCoord[] {
  if (coords.length < 2) return coords;

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (coordsEqual(first, last)) {
    return coords.slice(0, -1);
  }
  return coords;
}

function coordsEqual(a: MapCoord, b: MapCoord): boolean {
  const epsilon = 1e-12;
  return (
    Math.abs(a.latitude - b.latitude) <= epsilon &&
    Math.abs(a.longitude - b.longitude) <= epsilon
  );
}

function getSignedRingArea(coords: MapCoord[]): number {
  return coords.reduce((area, coord, index) => {
    const next = coords[(index + 1) % coords.length];
    return (
      area + coord.longitude * next.latitude - next.longitude * coord.latitude
    );
  }, 0);
}

export function getHotspotBlobRadius(trashScore: number): number {
  return Math.round(18 + clamp(trashScore, 0, 1) * 22);
}

function getRingCenter(
  coords: MapCoord[]
): MapCoord | null {
  if (coords.length < 3) return null;
  const openRing = removeClosingCoord(coords);
  const total = openRing.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: total.latitude / openRing.length,
    longitude: total.longitude / openRing.length,
  };
}

function getOrganicBlobCoords(
  center: MapCoord,
  trashScore: number,
  seed: string
): MapCoord[] {
  const radiusMeters = getHotspotBlobRadius(trashScore);
  const points = 9;
  const coords = Array.from({ length: points }, (_, index) => {
    const noise = seededNoise(`${seed}:${index}`);
    const angle = (Math.PI * 2 * index) / points + seededNoise(seed) * 0.22;
    const pointRadius = radiusMeters * (0.72 + noise * 0.42);
    return offsetCoord(center, pointRadius, angle);
  }).reverse();

  return normalizePolygonRing(coords);
}

function offsetCoord(
  center: MapCoord,
  radiusMeters: number,
  angle: number
): MapCoord {
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

function interpolate(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  if (inputMax === inputMin) return outputMax;
  const progress = clamp((value - inputMin) / (inputMax - inputMin), 0, 1);
  return outputMin + (outputMax - outputMin) * progress;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
