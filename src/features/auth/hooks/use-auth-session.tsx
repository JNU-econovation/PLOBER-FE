import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  clearSession,
  getSession,
  type AuthSession,
} from "../services/session";
import { startKakaoLogin } from "../services/kakao-auth";

type AuthSessionContextValue = {
  clearAuthSession: () => Promise<void>;
  session: AuthSession | null;
  signInWithKakao: () => Promise<AuthSession>;
  status: "loading" | "authenticated" | "unauthenticated";
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getSession()
      .then((storedSession) => {
        if (mounted) setSession(storedSession);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithKakao = useCallback(async () => {
    const nextSession = await startKakaoLogin();
    setSession(nextSession);
    return nextSession;
  }, []);

  const clearAuthSession = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      clearAuthSession,
      session,
      signInWithKakao,
      status: loading
        ? "loading"
        : session
          ? "authenticated"
          : "unauthenticated",
    }),
    [clearAuthSession, loading, session, signInWithKakao]
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return value;
}
