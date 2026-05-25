/** Refresh access token this many ms before calculated expiry (proactive refresh). */
export const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Fallback TTL (seconds) when backend omits `expiresIn` (contract default: 3600). */
export const DEFAULT_ACCESS_TOKEN_TTL_SEC = 3600;
