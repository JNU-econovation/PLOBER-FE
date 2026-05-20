import * as AppleAuthentication from "expo-apple-authentication";

import { loginWithAppleToken } from "../api";
import { saveSession } from "./session";

function getAppleGivenName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null
) {
  return fullName?.givenName ?? null;
}

function getErrorLogPayload(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return error;
  }

  return {
    value: String(error),
  };
}

export function isAppleLoginCanceled(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_REQUEST_CANCELED"
  );
}

export async function completeAppleLogin() {
  if (__DEV__) {
    console.log("[apple] native login start");
  }

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (__DEV__) {
      console.log("[apple] native login error", getErrorLogPayload(error));
    }
    throw error;
  }

  if (__DEV__) {
    console.log("[apple] native login credential received", {
      hasEmail: Boolean(credential.email),
      hasFullName: Boolean(credential.fullName),
      hasIdentityToken: Boolean(credential.identityToken),
      identityTokenLength: credential.identityToken?.length ?? 0,
      realUserStatus: credential.realUserStatus,
      userLength: credential.user.length,
    });
  }

  if (!credential.identityToken) {
    throw new Error("Apple identityToken을 찾을 수 없습니다.");
  }

  if (__DEV__) {
    console.log("[apple] identityToken", credential.identityToken);
    console.log("[apple] backend login start", {
      name: getAppleGivenName(credential.fullName),
    });
  }

  const session = await loginWithAppleToken(
    credential.identityToken,
    getAppleGivenName(credential.fullName)
  );
  await saveSession(session);

  if (__DEV__) {
    console.log("[apple] login api success", {
      hasAccessToken: Boolean(session.accessToken),
      userId: session.userId,
    });
  }

  return session;
}
