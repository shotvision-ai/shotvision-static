import { DEFAULT_API_REQUEST_TIMEOUT_MS } from "../../config/apiTimeouts";

// Sentinel error thrown when *our* timeout fires (not an external abort or real network failure).
// React Native's fetch rejects AbortSignal aborts as `TypeError: "network request failed"`
// rather than a named `AbortError`, so we use a stable class to distinguish the two.
export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * `fetch` with AbortController timeout.
 * When the timeout fires, throws `FetchTimeoutError` so `handleApiError` can distinguish
 * a server cold-start from a genuine network failure (React Native maps both to TypeError).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_API_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
