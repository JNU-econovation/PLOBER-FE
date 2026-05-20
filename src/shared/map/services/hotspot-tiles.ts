import { VectorTile } from "@mapbox/vector-tile";
import Pbf from "pbf";

import type { HotspotPolygon } from "../components/types";

const HOTSPOT_TILE_URL =
  "http://54.180.111.192:3000/predicted_hotspots/{z}/{x}/{y}";
const HOTSPOT_SOURCE_LAYER = "predicted_hotspots";
const HOTSPOT_ZOOM = 14;
const MAX_POLYGONS_PER_TILE = 160;

type TileCoordinate = {
  z: number;
  x: number;
  y: number;
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
  const center = lonLatToTile(point.longitude, point.latitude, HOTSPOT_ZOOM);
  return getHotspotPolygonsForTile(center);
}

async function getHotspotPolygonsForTile(
  tile: TileCoordinate
): Promise<HotspotPolygon[]> {
  const response = await fetch(
    HOTSPOT_TILE_URL.replace("{z}", String(tile.z))
      .replace("{x}", String(tile.x))
      .replace("{y}", String(tile.y))
  );
  if (response.status === 204) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`히트맵 타일 요청 실패 (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    return [];
  }
  const vectorTile = new VectorTile(new Pbf(buffer));
  const layer = vectorTile.layers[HOTSPOT_SOURCE_LAYER];
  if (!layer) return [];

  const polygons: HotspotPolygon[] = [];
  const rankedFeatures = Array.from({ length: layer.length }, (_, index) => {
    const feature = layer.feature(index);
    return {
      index,
      trashScore: getTrashScore(feature.properties),
    };
  })
    .sort((a, b) => b.trashScore - a.trashScore)
    .slice(0, MAX_POLYGONS_PER_TILE);

  for (const rankedFeature of rankedFeatures) {
    const feature = layer.feature(rankedFeature.index);
    const geoJson = feature.toGeoJSON(tile.x, tile.y, tile.z) as GeoJsonFeature;
    const rings = getOuterRings(geoJson.geometry);

    rings.forEach((ring, ringIndex) => {
      const coords = ring
        .map(([longitude, latitude]) => ({ latitude, longitude }))
        .filter(isValidCoord);

      if (coords.length >= 3) {
        polygons.push({
          coords,
          id: `${tile.z}-${tile.x}-${tile.y}-${rankedFeature.index}-${ringIndex}`,
          trashScore: rankedFeature.trashScore,
        });
      }
    });
  }

  return polygons;
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
  return Math.max(0, Math.min(1, value));
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
  if (trashScore >= 0.8) return "rgba(185, 28, 28, 0.58)";
  if (trashScore >= 0.6) return "rgba(239, 68, 68, 0.46)";
  if (trashScore >= 0.3) return "rgba(249, 115, 22, 0.34)";
  if (trashScore > 0) return "rgba(234, 179, 8, 0.24)";
  return "rgba(34, 197, 94, 0.12)";
}
