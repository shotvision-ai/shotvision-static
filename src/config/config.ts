/**
 * API base URL (no trailing slash). Paths append as `/api/...`.
 *
 * Env:
 * - `EXPO_PUBLIC_API_BASE_URL` — defaults to production Render URL below. Restart Metro after `.env` changes.
 * - `EXPO_PUBLIC_API_DEBUG=1` — force `[ShotVisionAPI]` logs in release builds; `=0` silences in dev.
 *
 * There is no separate dev/staging flavor in code — only this env var.
 */
export const config = {
  apiBaseUrl:
    (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) ||
    "https://shot-vision-service.onrender.com",
} as const;
