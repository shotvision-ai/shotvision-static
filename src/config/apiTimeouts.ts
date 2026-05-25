/**
 * Global HTTP timeouts — prevents indefinite hangs (e.g. cold-start backend on Render).
 * Production risk prevented: frozen loading spinners with no user feedback.
 */

/** Default timeout for JSON API calls (ms). */
export const DEFAULT_API_REQUEST_TIMEOUT_MS = 45_000;

/** Slightly longer for multipart uploads (ms). */
export const MULTIPART_UPLOAD_TIMEOUT_MS = 60_000;

/** Auth refresh uses the same client timeout as other API calls. */
export const AUTH_REFRESH_TIMEOUT_MS = DEFAULT_API_REQUEST_TIMEOUT_MS;
