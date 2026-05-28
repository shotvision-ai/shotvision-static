/**
 * Global HTTP timeouts — prevents indefinite hangs (e.g. cold-start backend on Render).
 * Production risk prevented: frozen loading spinners with no user feedback.
 */

/** Default timeout for JSON API calls (ms). */
export const DEFAULT_API_REQUEST_TIMEOUT_MS = 45_000;

/** Explore feed — Render free-tier cold starts can delay the first response past 45s. */
export const EXPLORE_FEED_TIMEOUT_MS = 90_000;

/** Login POST — Render free-tier cold starts can exceed 45s. */
export const AUTH_LOGIN_TIMEOUT_MS = 90_000;

/**
 * Pause before login retry attempts 2 and 3.
 * Render free-tier cold starts take 30-90s; spacing retries out gives the backend time
 * to wake up so attempt 2 succeeds rather than hitting the same sleeping server.
 */
export const AUTH_LOGIN_RETRY_DELAYS_MS = [5_000, 10_000] as const;

/** Max POST `/api/auth/login` attempts (initial try + retries). */
export const AUTH_LOGIN_MAX_ATTEMPTS = 1 + AUTH_LOGIN_RETRY_DELAYS_MS.length;

/** Slightly longer for multipart uploads (ms). */
export const MULTIPART_UPLOAD_TIMEOUT_MS = 60_000;

/** Auth refresh uses the same client timeout as other API calls. */
export const AUTH_REFRESH_TIMEOUT_MS = DEFAULT_API_REQUEST_TIMEOUT_MS;
