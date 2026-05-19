import { useEffect, useState } from "react";

import { useAuthSession } from "@/src/features/auth";

import { getMonthlyPloggingSummary } from "../api/get-monthly-plogging-summary";
import type { MonthlyPloggingSummary } from "../api/types";

type MonthlyPloggingSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; summary: MonthlyPloggingSummary }
  | { status: "error"; message: string };

type Options = {
  year: number;
  month: number; // 1~12
};

// 월간 누적(걸음/거리/칼로리/플로깅 횟수/플로깅 시간) 조회 훅.
// 인증 세션이 준비되기 전까지는 idle 상태로 대기한다.
export function useMonthlyPloggingSummary({
  year,
  month,
}: Options): MonthlyPloggingSummaryState {
  const { status: authStatus } = useAuthSession();
  const [state, setState] = useState<MonthlyPloggingSummaryState>({
    status: "idle",
  });

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setState({ status: "idle" });
      return;
    }

    let mounted = true;
    setState({ status: "loading" });

    getMonthlyPloggingSummary({ year, month })
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
              : "월간 누적 정보를 불러오지 못했습니다.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [authStatus, year, month]);

  return state;
}