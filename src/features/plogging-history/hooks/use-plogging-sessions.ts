import { useEffect, useState } from "react";

import { useAuthSession } from "@/src/features/auth";

import { getPloggingSessions } from "../api/get-plogging-sessions";
import type { PloggingSessionSummary } from "../api/types";

type PloggingSessionsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; sessions: PloggingSessionSummary[]; hasNext: boolean }
  | { status: "error"; message: string };

export function usePloggingSessions(): PloggingSessionsState {
  const { status: authStatus } = useAuthSession();
  const [state, setState] = useState<PloggingSessionsState>({ status: "idle" });

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setState({ status: "idle" });
      return;
    }

    let mounted = true;
    setState({ status: "loading" });

    getPloggingSessions()
      .then((response) => {
        if (!mounted) return;
        setState({
          status: "success",
          sessions: response.content,
          hasNext: response.hasNext,
        });
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
  }, [authStatus]);

  return state;
}
