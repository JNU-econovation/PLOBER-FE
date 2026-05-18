import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

const AUTH_SESSION_KEY = "plober_auth_session";
const SECURE_STORE_OPTIONS = {};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  userId: number;
  nickname: string;
  email: string;
};

type AuthSessionListener = (session: AuthSession | null) => void;

type SecureStoreModule = {
  deleteValueWithKeyAsync: (key: string, options?: object) => Promise<void>;
  getValueWithKeyAsync: (key: string, options?: object) => Promise<string | null>;
  setValueWithKeyAsync: (
    value: string,
    key: string,
    options?: object
  ) => Promise<void>;
};

let secureStoreModule: SecureStoreModule | null | undefined;
let memorySession: AuthSession | null = null;
const authSessionListeners = new Set<AuthSessionListener>();

function notifyAuthSessionChange(session: AuthSession | null): void {
  authSessionListeners.forEach((listener) => listener(session));
}

export function subscribeAuthSession(listener: AuthSessionListener): () => void {
  authSessionListeners.add(listener);

  return () => {
    authSessionListeners.delete(listener);
  };
}

function getSecureStoreModule(): SecureStoreModule | null {
  if (Platform.OS === "web") return null;
  if (secureStoreModule !== undefined) return secureStoreModule;

  secureStoreModule =
    requireOptionalNativeModule<SecureStoreModule>("ExpoSecureStore");

  return secureStoreModule;
}

function readWebSession(): AuthSession | null {
  if (typeof localStorage === "undefined") return null;

  const rawSession = localStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function readFallbackSession(): AuthSession | null {
  if (Platform.OS === "web") {
    return readWebSession();
  }

  return memorySession;
}

function writeFallbackSession(session: AuthSession): void {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    }
    return;
  }

  memorySession = session;
}

function clearFallbackSession(): void {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    return;
  }

  memorySession = null;
}

async function isSecureStoreAvailable() {
  const secureStore = getSecureStoreModule();
  if (!secureStore) return false;
  return typeof secureStore.getValueWithKeyAsync === "function";
}

export async function getSession(): Promise<AuthSession | null> {
  const secureStore = getSecureStoreModule();
  if (!(await isSecureStoreAvailable())) {
    return readFallbackSession();
  }

  const rawSession = await secureStore?.getValueWithKeyAsync(
    AUTH_SESSION_KEY,
    SECURE_STORE_OPTIONS
  );
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    await secureStore?.deleteValueWithKeyAsync(
      AUTH_SESSION_KEY,
      SECURE_STORE_OPTIONS
    );
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  const serializedSession = JSON.stringify(session);

  const secureStore = getSecureStoreModule();
  if (!(await isSecureStoreAvailable())) {
    writeFallbackSession(session);
    notifyAuthSessionChange(session);
    return;
  }

  await secureStore?.setValueWithKeyAsync(
    serializedSession,
    AUTH_SESSION_KEY,
    SECURE_STORE_OPTIONS
  );
  notifyAuthSessionChange(session);
}

export async function clearSession(): Promise<void> {
  const secureStore = getSecureStoreModule();
  if (!(await isSecureStoreAvailable())) {
    clearFallbackSession();
    notifyAuthSessionChange(null);
    return;
  }

  await secureStore?.deleteValueWithKeyAsync(
    AUTH_SESSION_KEY,
    SECURE_STORE_OPTIONS
  );
  notifyAuthSessionChange(null);
}