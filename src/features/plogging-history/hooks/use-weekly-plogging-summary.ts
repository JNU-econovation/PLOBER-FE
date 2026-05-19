import { useEffect, useState } from "react";

import { useAuthSession } from "@/src/features/auth";

import { getWeeklyPloggingSummary } from "../api/get-weekly-plogging-summary";
import type { WeeklyPloggingSummary } from "../api/types";

type WeeklyPloggingSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; summary: WeeklyPloggingSummary }
  | { status: "error"; message: string };

type Options = {
  // ISO 형식 "YYYY-MM-DD". 해당 주의 시작일(보통 월요일)을 넘긴다.
  startDate: string;
};

// 주간 일별 누적(요일별 걸음/거리/칼로리 등) 조회 훅.
export function useWeeklyPloggingSummary({
  startDate,
}: Options): WeeklyPloggingSummaryState {
  const { status: authStatus } = useAuthSession();
  const [state, setState] = useState<WeeklyPloggingSummaryState>({
    status: "idle",
  });

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setState({ status: "idle" });
      return;
    }

    let mounted = true;
    setState({ status: "loading" });

    getWeeklyPloggingSummary({ startDate })
      .then((summary) => {
        if (!mounted) return;
        setState({ status: "success", summary });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "주간 누적 정보를 불러오지 못했습니다.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [authStatus, startDate]);

  return state;
}