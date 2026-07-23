import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getCrewPloggingSession } from "../api";
import type { CrewPloggingSessionResponse } from "../types";

type PollingStatus = "idle" | "loading" | "success" | "error";

type PollingState = {
  errorMessage: string | null;
  refreshing: boolean;
  session: CrewPloggingSessionResponse | null;
  status: PollingStatus;
};

type UseCrewPloggingSessionPollingOptions = {
  enabled?: boolean;
  intervalMs?: number;
  sessionId: number | null;
};

const DEFAULT_POLLING_INTERVAL_MS = 3_000;

export function useCrewPloggingSessionPolling({
  enabled = true,
  intervalMs = DEFAULT_POLLING_INTERVAL_MS,
  sessionId,
}: UseCrewPloggingSessionPollingOptions) {
  const [focused, setFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const [state, setState] = useState<PollingState>({
    errorMessage: null,
    refreshing: false,
    session: null,
    status: "idle",
  });
  const mountedRef = useRef(true);
  const currentSessionIdRef = useRef(sessionId);
  const inFlightRef = useRef<{
    promise: Promise<CrewPloggingSessionResponse>;
    sessionId: number;
  } | null>(null);

  currentSessionIdRef.current = sessionId;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setState({
      errorMessage: null,
      refreshing: false,
      session: null,
      status: enabled && sessionId !== null ? "loading" : "idle",
    });
  }, [enabled, sessionId]);

  const fetchSession = useCallback(async () => {
    if (!enabled || sessionId === null) {
      throw new Error("조회할 같이줍기 세션이 없습니다.");
    }

    let request = inFlightRef.current;
    if (!request || request.sessionId !== sessionId) {
      const promise = getCrewPloggingSession({ sessionId });
      request = { promise, sessionId };
      inFlightRef.current = request;
    }

    if (mountedRef.current && currentSessionIdRef.current === sessionId) {
      setState((previous) => ({
        ...previous,
        errorMessage: null,
        refreshing: previous.session !== null,
        status: previous.session === null ? "loading" : previous.status,
      }));
    }

    try {
      const nextSession = await request.promise;
      if (mountedRef.current && currentSessionIdRef.current === sessionId) {
        setState({
          errorMessage: null,
          refreshing: false,
          session: nextSession,
          status: "success",
        });
      }
      return nextSession;
    } catch (error) {
      if (mountedRef.current && currentSessionIdRef.current === sessionId) {
        setState((previous) => ({
          ...previous,
          errorMessage:
            error instanceof Error
              ? error.message
              : "같이줍기 상태를 불러오지 못했습니다.",
          refreshing: false,
          status: "error",
        }));
      }
      throw error;
    } finally {
      if (inFlightRef.current === request) {
        inFlightRef.current = null;
      }
    }
  }, [enabled, sessionId]);

  useEffect(() => {
    if (
      !enabled ||
      sessionId === null ||
      !focused ||
      appState !== "active"
    ) {
      return;
    }

    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      let terminal = false;
      try {
        const nextSession = await fetchSession();
        terminal =
          nextSession.status === "COMPLETED" ||
          nextSession.status === "CANCELED";
      } catch {
        // 오류 상태는 hook state로 노출하고 다음 주기에 다시 시도한다.
      } finally {
        if (!disposed && !terminal) {
          timeoutId = setTimeout(() => {
            void poll();
          }, Math.max(1_000, intervalMs));
        }
      }
    };

    void poll();

    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [appState, enabled, fetchSession, focused, intervalMs, sessionId]);

  return {
    ...state,
    refetch: fetchSession,
  };
}
