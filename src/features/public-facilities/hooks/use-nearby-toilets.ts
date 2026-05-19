import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@/src/features/auth";
import { useDeviceLocation } from "@/src/shared/location";

import { getNearbyToilets } from "../api/get-nearby-toilets";
import type { Toilet } from "../api/types";

type NearbyToiletsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; toilets: Toilet[] }
  | { status: "error"; message: string };

type UseNearbyToiletsOptions = {
  // 사용자가 우측 상단 화장실 토글을 켰을 때만 API를 호출하기 위한 스위치.
  // 끄면 호출하지 않고 상태를 idle로 둔다(이미 받아둔 결과도 비운다).
  enabled: boolean;
};

// 사용자 현재 위치 기준 반경 1km 이내의 화장실을 조회한다.
// 쓰레기통과 달리 화장실은 사용자가 토글로 켜야만 보이는 옵션이므로 enabled 스위치를 둔다.
// 위치는 DeviceLocationProvider에서 공유받으며, 사용자가 약 100m 이상 이동했을 때 재조회한다.
export function useNearbyToilets({ enabled }: UseNearbyToiletsOptions): NearbyToiletsState {
  const { status: authStatus } = useAuthSession();
  const { permission, position } = useDeviceLocation();
  const [state, setState] = useState<NearbyToiletsState>({ status: "idle" });
  // 좌표 소수점 3자리(약 100m) 기준으로 재조회 키를 만들어 중복 호출을 막는다.
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (__DEV__) {
        console.log("[toilets] skip: disabled");
      }
      setState({ status: "idle" });
      fetchedKeyRef.current = null;
      return;
    }
    if (authStatus !== "authenticated") {
      if (__DEV__) {
        console.log("[toilets] skip: not authenticated", { authStatus });
      }
      setState({ status: "idle" });
      fetchedKeyRef.current = null;
      return;
    }
    if (permission === "denied" || permission === "unavailable") {
      if (__DEV__) {
        console.log("[toilets] location unavailable", { permission });
      }
      setState({ status: "error", message: "위치 권한이 필요합니다." });
      return;
    }
    if (!position) {
      if (__DEV__) {
        console.log("[toilets] waiting for position");
      }
      setState((prev) =>
        prev.status === "success" ? prev : { status: "loading" }
      );
      return;
    }

    const key = `${position.latitude.toFixed(3)},${position.longitude.toFixed(3)}`;
    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    let mounted = true;
    setState({ status: "loading" });

    getNearbyToilets({
      latitude: position.latitude,
      longitude: position.longitude,
    })
      .then((toilets) => {
        if (!mounted) return;
        if (__DEV__) {
          console.log("[toilets] fetched", {
            count: toilets.length,
            first: toilets[0],
          });
        }
        setState({ status: "success", toilets });
      })
      .catch((error) => {
        if (!mounted) return;
        if (__DEV__) {
          console.log("[toilets] error", {
            message: error instanceof Error ? error.message : "unknown",
          });
        }
        // 에러 시 같은 좌표에서도 재시도가 가능하도록 키를 비운다.
        fetchedKeyRef.current = null;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "주변 화장실을 불러오지 못했습니다.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [authStatus, enabled, permission, position]);

  return state;
}
