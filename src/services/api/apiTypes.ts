/**
 * HTTP transport types for apiClient (not request/response DTOs).
 * DTOs and envelopes live in `./contracts/`.
 */

export type {
  ApiResponse,
  ApiResponseBody,
  ApiResponseInfo,
  ApiErrorDetail,
  ApiResponseCode,
  ApiHttpStatusCode,
  ApiSuccessEnvelope,
  ApiFailureEnvelope,
  ApiEmptyData,
  PaginatedResponseDto,
} from "./contracts/common.types";

export type { AuthTokens } from "./contracts/auth.types";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  /** Skip Authorization header (login / refresh / public routes). */
  skipAuth?: boolean;
  /** Per-request timeout; defaults to `DEFAULT_API_REQUEST_TIMEOUT_MS`. */
  timeoutMs?: number;
}
