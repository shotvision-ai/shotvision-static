export interface ApiResponse<T = any> {
  responseInfo: Record<string, any>;
  body: ApiResponseBody<T>;
}

export interface ApiResponseBody<T = any> {
  statusCode: number;
  statusMessage: string;
  data: T;
  errors?: ApiErrorDetail[];
  meta?: Record<string, any>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
}
