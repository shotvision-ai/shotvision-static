/**
 * Shared API types from API_CONTRACTS.md — envelope, pagination, enums, response wrappers.
 */

// --- Enums & unions (§2, §4, §10) ---

/** `responseInfo.responseCode` — `"00"` success · `"01"` failure */
export type ApiResponseCode = "00" | "01";

/** `body.statusCode` mirrors HTTP status (string in envelope). */
export type ApiHttpStatusCode =
  | "200"
  | "201"
  | "400"
  | "401"
  | "403"
  | "404"
  | "409"
  | "429"
  | "500"
  | "503"
  | (string & Record<never, never>);

export const API_RESPONSE_CODE_SUCCESS: ApiResponseCode = "00";
export const API_RESPONSE_CODE_FAILURE: ApiResponseCode = "01";

// --- Global response envelope (§2) ---

export interface ApiResponseInfo {
  timestamp: string;
  responseCode: ApiResponseCode;
  correlationId: string | null;
  e2eId: string | null;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponseBody<T> {
  statusCode: ApiHttpStatusCode;
  statusMessage: string;
  data: T;
  errors: ApiErrorDetail[] | null;
  meta: Record<string, never> | null;
}

export interface ApiResponse<T> {
  responseInfo: ApiResponseInfo;
  body: ApiResponseBody<T>;
}

/** Success envelope: `responseCode` `"00"`, `data` populated, `errors` null. */
export type ApiSuccessEnvelope<T> = ApiResponse<T> & {
  responseInfo: ApiResponseInfo & { responseCode: "00" };
  body: ApiResponseBody<T> & { errors: null };
};

/** Failure envelope: `responseCode` `"01"`, `data` null, `errors` array. */
export type ApiFailureEnvelope = ApiResponse<null> & {
  responseInfo: ApiResponseInfo & { responseCode: "01" };
  body: ApiResponseBody<null> & { data: null; errors: ApiErrorDetail[] };
};

/** Endpoints that return `body.data: null` on success. */
export type ApiEmptyData = null;

// --- Pagination (§11) ---

export interface PaginatedResponseDto<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
}

/** Paginated list inside a success envelope. */
export type PaginatedApiEnvelope<T> = ApiSuccessEnvelope<PaginatedResponseDto<T>>;
