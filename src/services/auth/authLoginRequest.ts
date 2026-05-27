import { apiClient } from "../api/apiClient";
import { AppError } from "../api/apiErrors";
import {
  AUTH_LOGIN_MAX_ATTEMPTS,
  AUTH_LOGIN_RETRY_DELAYS_MS,
  AUTH_LOGIN_TIMEOUT_MS,
} from "../../config/apiTimeouts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Errors that often clear after a Render free-tier cold start. */
export function isRetryableColdStartError(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  if (error.code === "TIMEOUT" || error.code === "NETWORK_FAILURE" || error.code === "INVALID_RESPONSE") {
    return true;
  }
  if (error.code === "LOGIN_FAILURE") return true;
  if (error.statusCode === 408 || error.statusCode === 502 || error.statusCode === 503 || error.statusCode === 504) {
    return true;
  }
  if (error.statusCode >= 500 && error.code === "API_ERROR") return true;
  return false;
}

export type AuthLoginAttemptListener = (attempt: number, maxAttempts: number) => void;

/**
 * POST `/api/auth/login` with extended timeout and limited retries for cold-start backends.
 */
export async function postAuthLoginWithRetry(
  body: { firebaseToken: string },
  onAttempt?: AuthLoginAttemptListener
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AUTH_LOGIN_MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(AUTH_LOGIN_RETRY_DELAYS_MS[attempt - 2] ?? 2_000);
    }
    onAttempt?.(attempt, AUTH_LOGIN_MAX_ATTEMPTS);

    try {
      return await apiClient.post<unknown>("/api/auth/login", body, {
        skipAuth: true,
        timeoutMs: AUTH_LOGIN_TIMEOUT_MS,
      });
    } catch (error) {
      lastError = error;
      const isLast = attempt >= AUTH_LOGIN_MAX_ATTEMPTS;
      if (isLast || !isRetryableColdStartError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}
