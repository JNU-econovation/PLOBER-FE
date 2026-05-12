import { useEffect, useState } from "react";

import { useAuthSession } from "@/src/features/auth";

import { getPloggingSession } from "../api/get-plogging-session";
import type { PloggingSessionDetail } from "../api/types";

type PloggingSessionDetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; detail: PloggingSessionDetail }
  | { status: "error"; message: string };

export function usePloggingSessionDetail(
  ploggingSessionId: number | null
): PloggingSessionDetailState {
  const { status: authStatus } = useAuthSession();
  const [state, setState] = useState<PloggingSessionDetailState>({
    status: "idle",
  });

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setState({ status: "idle" });
      return;
    }
    if (ploggingSessionId === null) {
      setState({ status: "error", message: "잘못된 기록 ID입니다." });
      return;
    }

    let mounted = true;
    setState({ status: "loading" });

    getPloggingSession(ploggingSessionId)
      .then((detail) => {
        if (!mounted) return;
        setState({ status: "success", detail });
      })
      .catch((error) => {
        if (!mounted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "플로깅 기록을 불러오지 못했습니다.",
        });
      });

    return () => {
      mounted = false;
    };
  }, [authStatus, ploggingSessionId]);

  return state;
}
