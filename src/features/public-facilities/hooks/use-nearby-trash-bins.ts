import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@/src/features/auth";
import { useDeviceLocation } from "@/src/shared/location";

import { getNearbyTrashBins } from "../api/get-nearby-trash-bins";
import type { TrashBin } from "../api/types";

type NearbyTrashBinsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; trashBins: TrashBin[] }
  | { status: "error"; message: string };

// 사용자 현재 위치 기준 반경 1km 이내의 쓰레기통을 조회한다.
// 위치는 DeviceLocationProvider에서 공유받으며, 사용자가 약 100m 이상 이동했을 때 재조회한다.
export function useNearbyTrashBins(): NearbyTrashBinsState {
  const { status: authStatus } = useAuthSession();
  const { permission, position } = useDeviceLocation();
  const [state, setState] = useState<NearbyTrashBinsState>({ status: "idle" });
  // 좌표 소수점 3자리(약 100m) 기준으로 재조회 키를 만들어 중복 호출을 막는다.
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      if (__DEV__) {
        console.log("[trash-bins] skip: not authenticated", { authStatus });
      }
      setState({ status: "idle" });
      fetchedKeyRef.current = null;
      return;
    }
    if (permission === "denied" || permission === "unavailable") {
      if (__DEV__) {
        console.log("[trash-bins] location unavailable", { permission });
      }
      setState({ status: "error", message: "위치 권한이 필요합니다." });
      return;
    }
    if (!position) {
      if (__DEV__) {
        console.log("[trash-bins] waiting for position");
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

    getNearbyTrashBins({
      lat: position.latitude,
      lng: position.longitude,
    })
      .then((trashBins) => {
        if (!mounted) return;
        if (__DEV__) {
          console.log("[trash-bins] fetched", {
            count: trashBins.length,
            first: trashBins[0],
          });
        }
        setState({ status: "success", trashBins });
      })
      .catch((error) => {
        if (!mounted) return;
        if (__DEV__) {
          console.log("[trash-bins] error", {
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
              : "주변 쓰레기통을 불러오지 못했습니다.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [authStatus, permission, position]);

  return state;
}
