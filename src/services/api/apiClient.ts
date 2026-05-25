import { config } from "../../config/config";
import { HttpMethod, RequestOptions } from "./apiTypes";
import { AppError, handleApiError } from "./apiErrors";
import { authSession } from "../auth/authSession";
import { parseApiResponseText } from "./responseParser";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { DEFAULT_API_REQUEST_TIMEOUT_MS, MULTIPART_UPLOAD_TIMEOUT_MS } from "../../config/apiTimeouts";
import {
  logApiNetworkOrParseError,
  logApiRequest,
  logApiResponseOk,
} from "./apiDebug";

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string = config.apiBaseUrl;
  private accessToken: string | null = null;
  private lastCorrelationId: string | null = null;

  private constructor() {}

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public getLastCorrelationId(): string | null {
    return this.lastCorrelationId;
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private async getJsonHeaders(
    customHeaders: Record<string, string> = {},
    correlationId: string,
    e2eId: string,
    includeAuth: boolean
  ): Promise<Headers> {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Accept", "application/json");
    headers.append("X-Correlation-ID", correlationId);
    headers.append("X-E2E-ID", e2eId);

    if (includeAuth && this.accessToken) {
      headers.append("Authorization", `Bearer ${this.accessToken}`);
    }

    Object.keys(customHeaders).forEach((key) => {
      headers.append(key, customHeaders[key]);
    });

    return headers;
  }

  private async getMultipartHeaders(
    correlationId: string,
    e2eId: string
  ): Promise<Headers> {
    const headers = new Headers();
    headers.append("Accept", "application/json");
    headers.append("X-Correlation-ID", correlationId);
    headers.append("X-E2E-ID", e2eId);
    if (this.accessToken) {
      headers.append("Authorization", `Bearer ${this.accessToken}`);
    }
    return headers;
  }

  /** Delegates envelope parsing to the centralized response parser (returns `body.data` only). */
  private parseEnvelopeBody<T>(
    text: string,
    correlationId: string,
    httpOk: boolean,
    httpStatus: number
  ): T {
    return parseApiResponseText<T>(text, {
      correlationId,
      httpOk,
      httpStatus,
    });
  }

  private syncAccessToken(token: string | null): void {
    this.setAccessToken(token);
  }

  /** Proactive refresh before protected calls (single flight in authSession). */
  private async ensureAuthToken(): Promise<boolean> {
    const token = await authSession.ensureValidAccessToken((t) => this.syncAccessToken(t));
    return !!token;
  }

  /** Reactive refresh after HTTP 401 — one retry only (`isRetry` prevents loops). */
  private refreshAccessTokenReactive(): Promise<string | null> {
    return authSession.refreshTokens((t) => this.syncAccessToken(t));
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    options: RequestOptions = {},
    isRetry = false
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (options.params) {
      Object.keys(options.params).forEach((key) => url.searchParams.append(key, options.params![key]));
    }

    const correlationId = this.generateId();
    const e2eId = this.generateId();
    this.lastCorrelationId = correlationId;

    const isPublicRoute =
      endpoint.startsWith("/public/") ||
      endpoint === "/api/auth/login" ||
      endpoint === "/api/auth/refresh";
    const includeAuth = !options.skipAuth && !isPublicRoute;

    if (includeAuth) {
      const hasToken = await this.ensureAuthToken();
      if (!hasToken) {
        throw new AppError("Your session has expired. Please sign in again.", 401, "SESSION_EXPIRED");
      }
    }

    const headers = await this.getJsonHeaders(options.headers ?? {}, correlationId, e2eId, includeAuth);

    const init: RequestInit = { method, headers };
    if (options.body !== undefined && options.body !== null) {
      init.body = JSON.stringify(options.body);
    }

    try {
      logApiRequest(method, url.toString(), includeAuth && !!this.accessToken);

      const response = await fetchWithTimeout(url.toString(), init, DEFAULT_API_REQUEST_TIMEOUT_MS);

      if (
        response.status === 401 &&
        !isRetry &&
        includeAuth &&
        endpoint !== "/api/auth/login" &&
        endpoint !== "/api/auth/refresh"
      ) {
        const newAccessToken = await this.refreshAccessTokenReactive();
        if (newAccessToken) {
          return this.request<T>(method, endpoint, options, true);
        }
        throw new AppError("Your session has expired. Please sign in again.", 401, "SESSION_EXPIRED");
      }

      const text = await response.text();

      if (!text.trim()) {
        if (!response.ok) {
          throw new AppError(
            response.statusText || "Request failed",
            response.status,
            "API_ERROR",
            undefined,
            correlationId
          );
        }
        logApiResponseOk(method, url.toString(), response.status, 0, undefined);
        return undefined as T;
      }

      const data = this.parseEnvelopeBody<T>(text, correlationId, response.ok, response.status);

      logApiResponseOk(method, url.toString(), response.status, text.length, data);

      return data;
    } catch (error) {
      logApiNetworkOrParseError(method, url.toString(), error);
      return handleApiError(error, correlationId);
    }
  }

  /**
   * Multipart upload (e.g. profile image). Field name must match API contract (`file`).
   * TODO: Re-enable profile upload UI after production storage integration (Cloudinary/S3).
   */
  public async postFormData<T>(endpoint: string, formData: FormData, isRetry = false): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const correlationId = this.generateId();
    const e2eId = this.generateId();
    this.lastCorrelationId = correlationId;
    const hasToken = await this.ensureAuthToken();
    if (!hasToken) {
      throw new AppError("Your session has expired. Please sign in again.", 401, "SESSION_EXPIRED");
    }

    const headers = await this.getMultipartHeaders(correlationId, e2eId);

    try {
      logApiRequest("POST", url, !!this.accessToken);

      const response = await fetchWithTimeout(
        url,
        { method: "POST", headers, body: formData },
        MULTIPART_UPLOAD_TIMEOUT_MS
      );

      if (response.status === 401 && !isRetry) {
        const newAccessToken = await this.refreshAccessTokenReactive();
        if (newAccessToken) {
          return this.postFormData<T>(endpoint, formData, true);
        }
        throw new AppError("Your session has expired. Please sign in again.", 401, "SESSION_EXPIRED");
      }

      const text = await response.text();
      if (!text.trim()) {
        if (!response.ok) {
          throw new AppError(response.statusText || "Upload failed", response.status, "API_ERROR", undefined, correlationId);
        }
        return undefined as T;
      }

      const data = this.parseEnvelopeBody<T>(text, correlationId, response.ok, response.status);
      logApiResponseOk("POST", url, response.status, text.length, data);
      return data;
    } catch (error) {
      logApiNetworkOrParseError("POST", url, error);
      return handleApiError(error, correlationId);
    }
  }

  public async get<T>(endpoint: string, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  public async post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("POST", endpoint, { ...options, body });
  }

  public async patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("PATCH", endpoint, { ...options, body });
  }

  public async delete<T>(endpoint: string, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }
}

export const apiClient = ApiClient.getInstance();
