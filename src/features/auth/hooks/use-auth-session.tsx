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
  subscribeAuthSession,
  type AuthSession,
} from "../services/session";
import { completeAppleLogin } from "../services/apple-auth";
import { completeKakaoLogin } from "../services/kakao-auth";

type AuthSessionContextValue = {
  clearAuthSession: () => Promise<void>;
  completeAppleLoginWithCredential: () => Promise<AuthSession>;
  completeKakaoLoginWithCode: (code: string) => Promise<AuthSession>;
  session: AuthSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeAuthSession((nextSession) => {
      if (mounted) setSession(nextSession);
    });

    getSession()
      .then((storedSession) => {
        if (mounted) setSession(storedSession);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const completeKakaoLoginWithCode = useCallback(async (code: string) => {
    const nextSession = await completeKakaoLogin(code);
    setSession(nextSession);
    return nextSession;
  }, []);

  const completeAppleLoginWithCredential = useCallback(async () => {
    const nextSession = await completeAppleLogin();
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
      completeAppleLoginWithCredential,
      completeKakaoLoginWithCode,
      session,
      status: loading
        ? "loading"
        : session
          ? "authenticated"
          : "unauthenticated",
    }),
    [
      clearAuthSession,
      completeAppleLoginWithCredential,
      completeKakaoLoginWithCode,
      loading,
      session,
    ]
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
