import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from "@/src/shared/constants/env";

import { loginWithKakaoCode } from "../api";
import { saveSession } from "./session";

WebBrowser.maybeCompleteAuthSession();

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";

function buildKakaoAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
  });

  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
}

function getCodeFromRedirectUrl(url: string) {
  const parsedUrl = Linking.parse(url);
  const code = parsedUrl.queryParams?.code;
  const error = parsedUrl.queryParams?.error;

  if (typeof error === "string") {
    throw new Error(error);
  }

  return typeof code === "string" ? code : null;
}

export async function startKakaoLogin() {
  if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
    throw new Error("카카오 로그인 환경변수가 설정되지 않았습니다.");
  }

  const authResult = await WebBrowser.openAuthSessionAsync(
    buildKakaoAuthorizeUrl(),
    KAKAO_REDIRECT_URI
  );

  if (authResult.type !== "success") {
    throw new Error("카카오 로그인이 취소되었습니다.");
  }

  const code = getCodeFromRedirectUrl(authResult.url);
  if (!code) {
    throw new Error("카카오 인가 코드를 찾을 수 없습니다.");
  }

  const session = await loginWithKakaoCode(code);
  await saveSession(session);

  return session;
}
