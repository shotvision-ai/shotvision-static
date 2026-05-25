/**
 * Centralized ShotVision API response parser.
 *
 * All HTTP clients and services must unwrap `body.data` through this module.
 * Screens and hooks must never parse `responseInfo` / `body` manually — use apiClient
 * (which returns typed `body.data` only).
 */

import type { ApiErrorDetail, ApiResponse, ApiResponseBody } from "../contracts/common.types";
import {
  API_RESPONSE_CODE_FAILURE,
  API_RESPONSE_CODE_SUCCESS,
} from "../contracts/common.types";
import { AppError } from "../apiErrors";

// --- Options & results ---

export interface ParseApiResponseOptions {
  /** Client-generated ID; falls back to `responseInfo.correlationId`. */
  correlationId?: string;
  /** When false, treat the fetch as failed even if the envelope says success. */
  httpOk?: boolean;
  /** Raw HTTP status from `fetch` (used when `httpOk` is false). */
  httpStatus?: number;
}

/** Typed result after a successful envelope parse (still unwrapped `data` only for callers). */
export interface ParsedApiResult<T> {
  data: T;
  envelope: ApiResponse<T>;
  correlationId: string | null;
  e2eId: string | null;
  statusMessage: string;
}

// --- Helpers (exported for apiClient refresh / diagnostics) ---

/** Prefer structured `errors[].message` when the API sends it. */
export function messageFromApiBody<T = null>(
  body: ApiResponseBody<T> | undefined
): string {
  if (!body) return "Request failed";
  const fromErrors = body.errors?.map((e) => e.message).filter(Boolean).join(" ");
  if (fromErrors?.trim()) return fromErrors.trim();
  return body.statusMessage || "Request failed";
}

export function parseStatusCode(raw: string | number | undefined): number {
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function firstErrorCode(errors: ApiErrorDetail[] | undefined): string {
  const code = errors?.[0]?.code;
  return typeof code === "string" && code.trim() ? code : "API_ERROR";
}

function resolveCorrelationId(
  envelope: ApiResponse<unknown>,
  fallback?: string
): string | undefined {
  const fromEnvelope = envelope.responseInfo?.correlationId;
  if (typeof fromEnvelope === "string" && fromEnvelope.trim()) return fromEnvelope;
  return fallback;
}

/** Runtime check that JSON matches the standard `{ responseInfo, body }` envelope. */
export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== "object" || value === null) return false;
  const root = value as Record<string, unknown>;
  if (typeof root.responseInfo !== "object" || root.responseInfo === null) return false;
  if (typeof root.body !== "object" || root.body === null) return false;
  const body = root.body as Record<string, unknown>;
  return (
    "statusCode" in body &&
    "statusMessage" in body &&
    "data" in body &&
    ("errors" in body || body.errors === undefined)
  );
}

// --- Parser abstraction ---

export class ApiResponseParser {
  /**
   * Parses raw JSON text into the standard envelope (no success/failure validation).
   */
  static parseJsonText<T>(text: string): ApiResponse<T> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new AppError("Empty response body", 502, "EMPTY_RESPONSE");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      throw new AppError("Invalid JSON response from server", 502, "INVALID_JSON");
    }

    if (!isApiResponse(parsed)) {
      throw new AppError("Response is not a valid API envelope", 502, "INVALID_ENVELOPE");
    }

    return parsed as ApiResponse<T>;
  }

  /**
   * Returns true when the envelope indicates failure per API_CONTRACTS.md.
   */
  static isFailure<T>(
    envelope: ApiResponse<T>,
    options?: Pick<ParseApiResponseOptions, "httpOk">
  ): boolean {
    const responseCode = String(envelope.responseInfo?.responseCode ?? "");
    const httpStatus = parseStatusCode(envelope.body?.statusCode);
    const envelopeFailed =
      responseCode === API_RESPONSE_CODE_FAILURE || httpStatus >= 400;
    const httpFailed = options?.httpOk === false;
    return envelopeFailed || httpFailed;
  }

  /**
   * Throws `AppError` on failure; returns `body.data` on success.
   */
  static unwrapData<T>(envelope: ApiResponse<T>, options?: ParseApiResponseOptions): T {
    const correlationId = resolveCorrelationId(envelope, options?.correlationId);

    if (this.isFailure(envelope, { httpOk: options?.httpOk })) {
      const httpStatus =
        parseStatusCode(envelope.body?.statusCode) ||
        options?.httpStatus ||
        (String(envelope.responseInfo?.responseCode) === API_RESPONSE_CODE_FAILURE ? 400 : 500);

      throw new AppError(
        messageFromApiBody(envelope.body),
        httpStatus,
        firstErrorCode(envelope.body?.errors ?? undefined),
        envelope.body?.errors ?? undefined,
        correlationId
      );
    }

    return envelope.body.data;
  }

  /**
   * Full pipeline: JSON text → envelope → validated `body.data`.
   */
  static parseText<T>(text: string, options?: ParseApiResponseOptions): ParsedApiResult<T> {
    const envelope = this.parseJsonText<T>(text);
    const data = this.unwrapData<T>(envelope, options);
    const correlationId = resolveCorrelationId(envelope, options?.correlationId) ?? null;

    return {
      data,
      envelope,
      correlationId,
      e2eId: envelope.responseInfo?.e2eId ?? null,
      statusMessage: envelope.body?.statusMessage ?? "",
    };
  }

  /** @deprecated Prefer `parseText` — kept for internal/tests naming clarity. */
  static assertSuccess<T>(envelope: ApiResponse<T>, correlationId?: string): T {
    return this.unwrapData<T>(envelope, { correlationId });
  }
}

/** Singleton-style export for tree-shaking friendly imports. */
export const apiResponseParser = ApiResponseParser;

/** Convenience: parse JSON text and return only `body.data`. */
export function parseApiResponseText<T>(
  text: string,
  options?: ParseApiResponseOptions
): T {
  return ApiResponseParser.parseText<T>(text, options).data;
}

/** Convenience: validate an already-parsed envelope and return `body.data`. */
export function unwrapApiResponseData<T>(
  envelope: ApiResponse<T>,
  options?: ParseApiResponseOptions
): T {
  return ApiResponseParser.unwrapData<T>(envelope, options);
}

/** @deprecated Use `unwrapApiResponseData` — alias for existing imports. */
export function assertApiSuccess<T>(
  result: ApiResponse<T>,
  correlationId?: string
): T {
  return ApiResponseParser.assertSuccess<T>(result, correlationId);
}

/** True when `responseInfo.responseCode` is `"00"`. */
export function isApiSuccessCode(envelope: ApiResponse<unknown>): boolean {
  return String(envelope.responseInfo?.responseCode ?? "") === API_RESPONSE_CODE_SUCCESS;
}
