import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ToiletMarker } from "@/src/shared/map";

import { getToiletTintColor } from "../data/toilet-style";
import { useNearbyToilets } from "./use-nearby-toilets";

const NO_NEARBY_TOILETS_MESSAGE = "주변에 화장실이 없습니다.";
const NOTICE_DURATION_MS = 1600;

export function useRestroomToggle() {
  const [restroomVisible, setRestroomVisible] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toiletsState = useNearbyToilets({ enabled: restroomVisible });

  const clearNoticeTimer = useCallback(() => {
    if (!noticeTimerRef.current) return;
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = null;
  }, []);

  const showNoNearbyToiletsNotice = useCallback(() => {
    clearNoticeTimer();
    setNoticeVisible(true);
    noticeTimerRef.current = setTimeout(() => {
      setNoticeVisible(false);
      noticeTimerRef.current = null;
    }, NOTICE_DURATION_MS);
  }, [clearNoticeTimer]);

  useEffect(() => clearNoticeTimer, [clearNoticeTimer]);

  useEffect(() => {
    if (
      !restroomVisible ||
      toiletsState.status !== "success" ||
      toiletsState.toilets.length > 0
    ) {
      return;
    }

    setRestroomVisible(false);
    showNoNearbyToiletsNotice();
  }, [restroomVisible, showNoNearbyToiletsNotice, toiletsState]);

  const toiletMarkers = useMemo<ToiletMarker[] | undefined>(() => {
    if (!restroomVisible || toiletsState.status !== "success") return undefined;

    return toiletsState.toilets.map((toilet) => ({
      id: toilet.id,
      latitude: toilet.latitude,
      longitude: toilet.longitude,
      tintColor: getToiletTintColor(toilet.openTimeType),
    }));
  }, [restroomVisible, toiletsState]);

  const toggleRestroom = useCallback(() => {
    setRestroomVisible((prev) => !prev);
  }, []);

  return {
    noNearbyToiletsMessage: NO_NEARBY_TOILETS_MESSAGE,
    noNearbyToiletsNoticeVisible: noticeVisible,
    restroomVisible,
    toggleRestroom,
    toiletMarkers,
    toiletsState,
  };
}
