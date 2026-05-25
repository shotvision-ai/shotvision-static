import { ApiErrorDetail } from "./apiTypes";

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public errors?: ApiErrorDetail[];
  /** Client-sent `X-Correlation-ID` for the failing API call (when applicable). */
  public correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_SERVER_ERROR",
    errors?: ApiErrorDetail[],
    correlationId?: string
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.correlationId = correlationId;
  }
}

/**
 * Normalizes `fetch` failures. (Legacy code checked `error.response`, which only exists on axios —
 * that made almost every `fetch` error look like a generic "network failure".)
 */
export const handleApiError = (error: unknown, correlationId?: string): never => {
  if (error instanceof AppError) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);

  const isAbort =
    (typeof error === "object" &&
      error !== null &&
      ((error as Error).name === "AbortError" || (error as Error).name === "TimeoutError")) ||
    /aborted|timeout/i.test(message);

  if (isAbort) {
    throw new AppError(
      "The server is taking too long to respond. Check your connection and try again.",
      408,
      "TIMEOUT",
      undefined,
      correlationId
    );
  }

  // fetch() on React Native often throws TypeError: Network request failed
  if (
    error instanceof TypeError ||
    /network request failed|failed to fetch|network error/i.test(message)
  ) {
    throw new AppError(
      "We couldn't reach Shot Vision. Check your internet connection and try again.",
      0,
      "NETWORK_FAILURE",
      undefined,
      correlationId
    );
  }

  // response.json() failed — e.g. HTML error page from wrong URL or overloaded server
  if (error instanceof SyntaxError) {
    throw new AppError(
      "Sign-in isn't responding normally right now. Please try again in a few minutes.",
      502,
      "INVALID_RESPONSE",
      undefined,
      correlationId
    );
  }

  throw new AppError(message || "Something went wrong. Please try again.", 0, "UNKNOWN_ERROR", undefined, correlationId);
};
