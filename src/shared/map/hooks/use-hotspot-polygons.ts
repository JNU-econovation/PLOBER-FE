import { useEffect, useRef, useState } from "react";

import { useDeviceLocation } from "@/src/shared/location";

import type { HotspotPolygon } from "../components/types";
import {
  getHotspotPolygonsNearProgressive,
  getHotspotTileKey,
} from "../services/hotspot-tiles";

type HotspotPolygonsState =
  | { status: "idle" | "loading"; polygons: HotspotPolygon[] }
  | { status: "success"; polygons: HotspotPolygon[] }
  | { status: "error"; message: string; polygons: HotspotPolygon[] };

export function useHotspotPolygons(
  enabled: boolean,
  zoomLevel: number
): HotspotPolygonsState {
  const { permission, position } = useDeviceLocation();
  const [state, setState] = useState<HotspotPolygonsState>({
    polygons: [],
    status: "idle",
  });
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      logHotspotHookDebug("disabled");
      setState({ polygons: [], status: "idle" });
      fetchedKeyRef.current = null;
      return;
    }
    if (permission === "denied" || permission === "unavailable") {
      logHotspotHookDebug("permission-blocked", { permission });
      setState({
        message: "위치 권한이 필요합니다.",
        polygons: [],
        status: "error",
      });
      return;
    }
    if (!position) {
      logHotspotHookDebug("waiting-position", { permission });
      setState((prev) => ({ polygons: prev.polygons, status: "loading" }));
      return;
    }

    const key = getHotspotTileKey(position, zoomLevel);
    if (fetchedKeyRef.current === key) {
      logHotspotHookDebug("skip-same-tile", { key, position });
      return;
    }
    fetchedKeyRef.current = key;

    let mounted = true;
    logHotspotHookDebug("load-start", { key, position });
    setState((prev) => ({ polygons: prev.polygons, status: "loading" }));

    getHotspotPolygonsNearProgressive(
      position,
      zoomLevel,
      (polygons, phase) => {
        if (!mounted) return;
        logHotspotHookDebug("load-progress", {
          key,
          phase,
          polygonCount: polygons.length,
        });
        setState({
          polygons,
          status: phase === "complete" ? "success" : "loading",
        });
      }
    )
      .then((polygons) => {
        if (!mounted) return;
        logHotspotHookDebug("load-success", {
          key,
          polygonCount: polygons.length,
        });
        setState({ polygons, status: "success" });
      })
      .catch((error) => {
        if (!mounted) return;
        fetchedKeyRef.current = null;
        logHotspotHookDebug("load-error", {
          key,
          message:
            error instanceof Error
              ? error.message
              : "히트맵을 불러오지 못했습니다.",
        });
        setState({
          message:
            error instanceof Error
              ? error.message
              : "히트맵을 불러오지 못했습니다.",
          polygons: [],
          status: "error",
        });
      });

    return () => {
      mounted = false;
    };
  }, [enabled, permission, position, zoomLevel]);

  return state;
}

function logHotspotHookDebug(
  message: string,
  payload?: Record<string, unknown>
) {
  if (!__DEV__) return;
  console.log(`[hotspot-hook] ${message}`, payload ?? {});
}
