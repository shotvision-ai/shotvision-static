/**
 * Structured API logging — filter Metro by `[ShotVisionAPI]` or `[ShotVisionUI]`.
 * Enabled when __DEV__ is true, or when EXPO_PUBLIC_API_DEBUG=1 (also works in release builds for field debugging).
 * Set EXPO_PUBLIC_API_DEBUG=0 to silence in dev.
 */

export const SHOTVISION_API_LOG_PREFIX = "[ShotVisionAPI]";
export const SHOTVISION_UI_LOG_PREFIX = "[ShotVisionUI]";

export function isApiDebugEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_DEBUG === "0") {
    return false;
  }
  if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_DEBUG === "1") {
    return true;
  }
  return typeof __DEV__ !== "undefined" && __DEV__;
}

export function logApiRequest(method: string, url: string, hasAuthorizationBearer: boolean): void {
  if (!isApiDebugEnabled()) return;
  console.log(
    `${SHOTVISION_API_LOG_PREFIX} → ${method} ${url} Authorization=${hasAuthorizationBearer ? "Bearer ***" : "(none)"}`
  );
}

/** Summarize `body.data` after JSON parse (never logs token values). */
export function summarizeBodyData(data: unknown): string {
  if (data === null || data === undefined) return "data=null";
  if (Array.isArray(data)) return `array length=${data.length}`;
  if (typeof data !== "object") return `primitive ${typeof data}`;

  const d = data as Record<string, unknown>;
  const keys = Object.keys(d);
  const parts: string[] = [`keys=[${keys.slice(0, 20).join(",")}${keys.length > 20 ? "…" : ""}]`];

  if (Array.isArray(d.items)) parts.push(`items=${d.items.length}`);
  if (Array.isArray(d.content)) parts.push(`content=${d.content.length}`);
  if (typeof d.totalElements === "number") parts.push(`totalElements=${d.totalElements}`);
  if (typeof d.total === "number") parts.push(`total=${d.total}`);
  if (typeof d.totalPages === "number") parts.push(`totalPages=${d.totalPages}`);
  if (typeof d.number === "number") parts.push(`number(pageIdx)=${d.number}`);
  if (d.accessToken || d.access_token) parts.push("hasAccessToken=true");

  return parts.join(" ");
}

export function logApiResponseOk(
  method: string,
  url: string,
  httpStatus: number,
  rawBodyLength: number,
  data: unknown
): void {
  if (!isApiDebugEnabled()) return;
  console.log(
    `${SHOTVISION_API_LOG_PREFIX} ← HTTP ${httpStatus} ${method} ${url} bytes=${rawBodyLength} ${summarizeBodyData(data)}`
  );
}

export function logApiNetworkOrParseError(method: string, url: string, err: unknown): void {
  if (!isApiDebugEnabled()) return;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`${SHOTVISION_API_LOG_PREFIX} ✗ ${method} ${url} ${msg}`);
}

export function logShotVisionUi(screen: string, detail: string): void {
  if (!isApiDebugEnabled()) return;
  console.log(`${SHOTVISION_UI_LOG_PREFIX} ${screen} ${detail}`);
}
