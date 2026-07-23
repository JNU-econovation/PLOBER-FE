import { useCallback, useEffect, useRef } from "react";

/** 동일한 폴링 상태가 반복되어도 화면 전환 side effect는 한 번만 실행한다. */
export function useCrewPloggingTransitionGuard(scopeKey: string | null) {
  const handledTransitionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    handledTransitionKeyRef.current = null;
  }, [scopeKey]);

  const claimTransition = useCallback((transitionKey: string) => {
    if (handledTransitionKeyRef.current === transitionKey) return false;
    handledTransitionKeyRef.current = transitionKey;
    return true;
  }, []);

  const releaseTransition = useCallback((transitionKey: string) => {
    if (handledTransitionKeyRef.current === transitionKey) {
      handledTransitionKeyRef.current = null;
    }
  }, []);

  return { claimTransition, releaseTransition };
}
