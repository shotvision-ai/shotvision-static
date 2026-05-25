import { DEFAULT_API_REQUEST_TIMEOUT_MS } from "../../config/apiTimeouts";

/**
 * `fetch` with AbortController timeout.
 * Aborts surface as AbortError → mapped to AppError TIMEOUT in handleApiError.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_API_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
