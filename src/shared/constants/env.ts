export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
export const KAKAO_REST_API_KEY =
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "";
export const KAKAO_REDIRECT_URI =
  process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI ?? "";

if (__DEV__ && !API_BASE_URL) {
  console.warn(
    "[env] EXPO_PUBLIC_API_BASE_URL is not set. API requests will fail until it is defined in .env."
  );
}

if (__DEV__ && (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI)) {
  console.warn(
    "[env] Kakao OAuth env is missing. Set EXPO_PUBLIC_KAKAO_REST_API_KEY and EXPO_PUBLIC_KAKAO_REDIRECT_URI."
  );
}
