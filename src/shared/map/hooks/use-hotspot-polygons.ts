import { useEffect, useRef, useState } from "react";

import { useDeviceLocation } from "@/src/shared/location";

import type { HotspotPolygon } from "../components/types";
import { getHotspotPolygonsNear } from "../services/hotspot-tiles";

type HotspotPolygonsState =
  | { status: "idle" | "loading"; polygons: HotspotPolygon[] }
  | { status: "success"; polygons: HotspotPolygon[] }
  | { status: "error"; message: string; polygons: HotspotPolygon[] };

export function useHotspotPolygons(enabled: boolean): HotspotPolygonsState {
  const { permission, position } = useDeviceLocation();
  const [state, setState] = useState<HotspotPolygonsState>({
    polygons: [],
    status: "idle",
  });
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ polygons: [], status: "idle" });
      fetchedKeyRef.current = null;
      return;
    }
    if (permission === "denied" || permission === "unavailable") {
      setState({
        message: "위치 권한이 필요합니다.",
        polygons: [],
        status: "error",
      });
      return;
    }
    if (!position) {
      setState((prev) => ({ polygons: prev.polygons, status: "loading" }));
      return;
    }

    const key = `${position.latitude.toFixed(2)},${position.longitude.toFixed(2)}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    let mounted = true;
    setState((prev) => ({ polygons: prev.polygons, status: "loading" }));

    getHotspotPolygonsNear(position)
      .then((polygons) => {
        if (!mounted) return;
        setState({ polygons, status: "success" });
      })
      .catch((error) => {
        if (!mounted) return;
        fetchedKeyRef.current = null;
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
  }, [enabled, permission, position]);

  return state;
}
