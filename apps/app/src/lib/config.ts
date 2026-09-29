export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4870").replace(/\/$/, "");
export const AUTH_URL = (process.env.EXPO_PUBLIC_NEON_AUTH_URL ?? "").replace(/\/$/, "");

if (!AUTH_URL) console.warn("EXPO_PUBLIC_NEON_AUTH_URL is not set — see apps/app/.env.example");
