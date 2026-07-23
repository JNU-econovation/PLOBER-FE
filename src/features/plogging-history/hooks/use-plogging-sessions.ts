import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useAuthSession } from "@/src/features/auth";

import { getPloggingSessions } from "../api/get-plogging-sessions";
import type { PloggingSessionSummary } from "../api/types";

type PloggingSessionsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; sessions: PloggingSessionSummary[]; hasNext: boolean }
  | { status: "error"; message: string };

const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 20;

export function usePloggingSessions(): PloggingSessionsState {
  const { session, status: authStatus } = useAuthSession();
  const [state, setState] = useState<PloggingSessionsState>({ status: "idle" });

  useFocusEffect(
    useCallback(() => {
      if (authStatus !== "authenticated" || !session?.userId) {
        setState({ status: "idle" });
        return;
      }

      let mounted = true;
      setState({ status: "loading" });

      getPloggingSessions({
        page: DEFAULT_PAGE,
        size: DEFAULT_PAGE_SIZE,
      })
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
    }, [authStatus, session?.userId]),
  );

  return state;
}
