import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}`;
  }
  return `${pad(minutes)} : ${pad(seconds)}`;
}

export function usePloggingTimer() {
  // 세션이 처음 마운트된 시각을 시작 시각으로 고정
  const [startedAt] = useState(() => Date.now());
  // 일시정지 진입 시각. null이면 진행 중
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  // 누적 일시정지 시간(ms)
  const [pausedTotalMs, setPausedTotalMs] = useState(0);
  // 1초마다 갱신되는 "현재 시각" 스냅샷
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPaused = pausedAt !== null;

  // 진행 중일 때만 1초마다 now 갱신.
  // 카운터를 1씩 증가시키지 않고 항상 Date.now()를 다시 읽기 때문에
  // 백그라운드/저전력 등으로 인터벌이 누락돼도 표시 시간이 정확하다.
  useEffect(() => {
    if (isPaused) {
      return;
    }
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused]);

  // 백그라운드 → 포그라운드 복귀 시 즉시 now 보정
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          setNow(Date.now());
        }
      },
    );
    return () => subscription.remove();
  }, []);

  const elapsedMs = isPaused
    ? pausedAt - startedAt - pausedTotalMs
    : now - startedAt - pausedTotalMs;

  const pause = () => {
    if (isPaused) return;
    setPausedAt(Date.now());
  };

  const resume = () => {
    if (pausedAt === null) return;
    const resumedAt = Date.now();
    setPausedTotalMs((prev) => prev + (resumedAt - pausedAt));
    setPausedAt(null);
    // 일시정지 동안 멈춰 있던 now를 즉시 보정.
    // 안 그러면 재개 직후 첫 1초 동안 stale한 now로 elapsed가 잠깐 뒤로 점프한다.
    setNow(resumedAt);
  };

  const toggle = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  return {
    elapsedMs: Math.max(0, elapsedMs),
    formatted: formatElapsed(elapsedMs),
    isPaused,
    pause,
    resume,
    toggle,
    startedAt,
  };
}
