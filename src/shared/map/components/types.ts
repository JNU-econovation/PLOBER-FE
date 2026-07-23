import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type TrashBinMarker = {
  id: number;
  latitude: number;
  longitude: number;
  tintColor?: string;
};

export type ToiletMarker = {
  id: number;
  latitude: number;
  longitude: number;
  tintColor?: string;
};

export type HotspotPolygon = {
  blobCoords: { latitude: number; longitude: number }[];
  id: string;
  center: { latitude: number; longitude: number };
  coords: { latitude: number; longitude: number }[];
  lod: "res7" | "res9" | "res11";
  trashScore: number;
};

export type PloggingMapProps = PropsWithChildren<{
  routeVisible?: boolean;
  routePoints?: { latitude: number; longitude: number }[];
  heatmapVisible?: boolean;
  heatmapLegendVisible?: boolean;
  heatmapLegendTop?: number;
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Used by the native Naver map implementation. Mock maps keep the prop for
   * API compatibility but intentionally ignore it.
   */
  zoom?: number;
  /**
   * When true (default), the native map shows the user's current location
   * overlay and the camera follows it. Mock maps ignore this prop.
   */
  followUserLocation?: boolean;
  /**
   * Increment this value to move the native map camera back to the user's
   * current location, even when the location coordinates have not changed.
   */
  recenterRequestId?: number;
  /**
   * Trash bin markers to render on the map. Mock maps ignore this prop.
   */
  trashBins?: TrashBinMarker[];
  /**
   * Toilet markers to render on the map. Mock maps ignore this prop.
   */
  toilets?: ToiletMarker[];
}>;
