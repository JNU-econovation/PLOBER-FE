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
import { signInWithKakao, signOutFromKakao } from "../services/kakao-auth";

type AuthSessionContextValue = {
  clearAuthSession: () => Promise<void>;
  completeAppleLoginWithCredential: () => Promise<AuthSession>;
  completeKakaoLoginWithSdk: () => Promise<AuthSession>;
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

  const completeKakaoLoginWithSdk = useCallback(async () => {
    const nextSession = await signInWithKakao();
    setSession(nextSession);
    return nextSession;
  }, []);

  const completeAppleLoginWithCredential = useCallback(async () => {
    const nextSession = await completeAppleLogin();
    setSession(nextSession);
    return nextSession;
  }, []);

  const clearAuthSession = useCallback(async () => {
    await signOutFromKakao();
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      clearAuthSession,
      completeAppleLoginWithCredential,
      completeKakaoLoginWithSdk,
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
      completeKakaoLoginWithSdk,
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
