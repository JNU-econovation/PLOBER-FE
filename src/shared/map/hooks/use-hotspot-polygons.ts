import { useEffect, useRef, useState } from "react";

import type { HotspotPolygon } from "../components/types";
import {
  getHotspotPolygonsNearProgressive,
  getHotspotTileKey,
} from "../services/hotspot-tiles";

type HotspotPolygonsState =
  | { status: "idle" | "loading"; polygons: HotspotPolygon[] }
  | { status: "success"; polygons: HotspotPolygon[] }
  | { status: "error"; message: string; polygons: HotspotPolygon[] };

type HotspotCenter = {
  latitude: number;
  longitude: number;
};

export function useHotspotPolygons(
  enabled: boolean,
  zoomLevel: number,
  center: HotspotCenter | null
): HotspotPolygonsState {
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

    if (!center) {
      logHotspotHookDebug("waiting-camera-center");
      setState((prev) => ({ polygons: prev.polygons, status: "loading" }));
      return;
    }

    const key = getHotspotTileKey(center, zoomLevel);
    if (fetchedKeyRef.current === key) {
      logHotspotHookDebug("skip-same-tile", { center, key });
      return;
    }
    fetchedKeyRef.current = key;

    let mounted = true;
    logHotspotHookDebug("load-start", { center, key });
    setState((prev) => ({ polygons: prev.polygons, status: "loading" }));

    getHotspotPolygonsNearProgressive(
      center,
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
  }, [center, enabled, zoomLevel]);

  return state;
}

function logHotspotHookDebug(
  message: string,
  payload?: Record<string, unknown>
) {
  if (!__DEV__) return;
  console.log(`[hotspot-hook] ${message}`, payload ?? {});
}
