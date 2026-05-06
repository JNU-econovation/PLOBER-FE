import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const AUTH_SESSION_KEY = "plober_auth_session";

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  userId: number;
  nickname: string;
  email: string;
};

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

async function isSecureStoreAvailable() {
  if (Platform.OS === "web") return false;
  return SecureStore.isAvailableAsync();
}

export async function getSession(): Promise<AuthSession | null> {
  if (!(await isSecureStoreAvailable())) {
    return readWebSession();
  }

  const rawSession = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  const serializedSession = JSON.stringify(session);

  if (!(await isSecureStoreAvailable())) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(AUTH_SESSION_KEY, serializedSession);
    }
    return;
  }

  await SecureStore.setItemAsync(AUTH_SESSION_KEY, serializedSession);
}

export async function clearSession(): Promise<void> {
  if (!(await isSecureStoreAvailable())) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}
