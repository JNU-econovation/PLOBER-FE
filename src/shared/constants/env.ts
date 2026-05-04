export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

if (__DEV__ && !API_BASE_URL) {
  console.warn(
    "[env] EXPO_PUBLIC_API_BASE_URL is not set. API requests will fail until it is defined in .env."
  );
}
