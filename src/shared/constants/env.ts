export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
export const KAKAO_NATIVE_APP_KEY =
  process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? "";

if (__DEV__ && !API_BASE_URL) {
  console.warn(
    "[env] EXPO_PUBLIC_API_BASE_URL is not set. API requests will fail until it is defined in .env."
  );
}

if (__DEV__ && !KAKAO_NATIVE_APP_KEY) {
  console.warn(
    "[env] Kakao Native App Key is missing. Set EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY."
  );
}
