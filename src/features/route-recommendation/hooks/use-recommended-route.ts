import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@/src/features/auth";
import { useDeviceLocation } from "@/src/shared/location";

import { getRecommendedRoutes } from "../api";
import type { RecommendedRoute } from "../api";

type RecommendedRouteState =
  | { status: "idle" | "loading" }
  | { status: "success"; routes: RecommendedRoute[] }
  | { status: "error"; message: string };

type UseRecommendedRouteOptions = {
  timeMinutes?: number;
};

const DEFAULT_ROUTE_MINUTES = 30;

export function useRecommendedRoute({
  timeMinutes = DEFAULT_ROUTE_MINUTES,
}: UseRecommendedRouteOptions = {}): RecommendedRouteState & {
  refetch: () => void;
} {
  const { status: authStatus } = useAuthSession();
  const { permission, position } = useDeviceLocation();
  const [state, setState] = useState<RecommendedRouteState>({
    status: "idle",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setState({ status: "idle" });
      fetchedKeyRef.current = null;
      return;
    }
    if (permission === "denied" || permission === "unavailable") {
      setState({ status: "error", message: "위치 권한이 필요합니다." });
      return;
    }
    if (!position) {
      setState((prev) =>
        prev.status === "success" ? prev : { status: "loading" }
      );
      return;
    }

    const key = `${position.latitude.toFixed(3)},${position.longitude.toFixed(3)},${timeMinutes},${reloadKey}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    let mounted = true;
    setState({ status: "loading" });

    getRecommendedRoutes({
      lat: position.latitude,
      lon: position.longitude,
      mode: "PLOGGING",
      time: timeMinutes,
    })
      .then((routes) => {
        if (!mounted) return;
        if (routes.length === 0) {
          setState({
            message: "추천 경로가 없습니다. 다시 시도해주세요.",
            status: "error",
          });
          return;
        }
        setState({ routes, status: "success" });
      })
      .catch((error) => {
        if (!mounted) return;
        fetchedKeyRef.current = null;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "추천 경로를 불러오지 못했습니다.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [authStatus, permission, position, reloadKey, timeMinutes]);

  return {
    ...state,
    refetch: () => setReloadKey((value) => value + 1),
  };
}
