import { config } from "../../config/config";
import { ApiResponse, ApiResponseBody, HttpMethod, RequestOptions } from "./apiTypes";
import { AppError, handleApiError } from "./apiErrors";
import { tokenStorage } from "../auth/tokenStorage";
import {
  logApiNetworkOrParseError,
  logApiRequest,
  logApiResponseOk,
} from "./apiDebug";

/** Prefer structured `errors[].message` when the API sends it (often more specific than statusMessage). */
function messageFromApiBody(body: ApiResponseBody<unknown> | undefined): string {
  if (!body) return "Request failed";
  const fromErrors = body.errors?.map((e) => e.message).filter(Boolean).join(" ");
  if (fromErrors?.trim()) return fromErrors.trim();
  return body.statusMessage || "Request failed";
}

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string = config.apiBaseUrl;
  private accessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;
  private logoutCallback: (() => void) | null = null;
  /** Most recent `X-Correlation-ID` sent on an API request (for support / server log lookup). */
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

  public setLogoutCallback(callback: () => void) {
    this.logoutCallback = callback;
  }

  public getLastCorrelationId(): string | null {
    return this.lastCorrelationId;
  }

  private async getHeaders(
    customHeaders: Record<string, string> = {},
    correlationId: string
  ): Promise<Headers> {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("X-Correlation-ID", correlationId);
    headers.append("X-E2E-ID", this.generateId());

    /**
     * ShotVision API JWT from POST /api/auth/login — never the Firebase ID token.
     * (`firebaseToken` is only sent in the login request body.)
     */
    if (this.accessToken) {
      headers.append("Authorization", `Bearer ${this.accessToken}`);
    }

    Object.keys(customHeaders).forEach((key) => {
      headers.append(key, customHeaders[key]);
    });

    return headers;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Refresh failed HTTP ${response.status}`);
        }
        if (!text.trim()) throw new Error("Refresh failed: empty body");
        const result = JSON.parse(text) as ApiResponse<{ accessToken?: string; access_token?: string }>;

        const d = result.body?.data as Record<string, unknown> | undefined;
        const newAccessToken =
          (typeof d?.accessToken === "string" && d.accessToken) ||
          (typeof d?.access_token === "string" && d.access_token) ||
          null;
        if (!newAccessToken) throw new Error("Refresh failed: no access token in body.data");
        this.setAccessToken(newAccessToken);
        await tokenStorage.saveAccessToken(newAccessToken);
        return newAccessToken;
      } catch (error) {
        console.error("Token refresh failed:", error);
        if (this.logoutCallback) {
          this.logoutCallback();
        }
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    options: RequestOptions = {},
    isRetry: boolean = false
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (options.params) {
      Object.keys(options.params).forEach((key) => url.searchParams.append(key, options.params![key]));
    }

    const correlationId = this.generateId();
    this.lastCorrelationId = correlationId;
    const headers = await this.getHeaders(options.headers, correlationId);
    const config: RequestInit = {
      method,
      headers,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      logApiRequest(method, url.toString(), !!this.accessToken);

      const response = await fetch(url.toString(), config);

      // Handle 401 Unauthorized - attempt token refresh
      if (
        response.status === 401 &&
        !isRetry &&
        endpoint !== "/api/auth/login" &&
        endpoint !== "/api/auth/refresh"
      ) {
        const newAccessToken = await this.refreshToken();
        if (newAccessToken) {
          // Retry the original request with the new token
          return this.request<T>(method, endpoint, options, true);
        }
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

      let result: ApiResponse<T>;
      try {
        result = JSON.parse(text) as ApiResponse<T>;
      } catch {
        return handleApiError(new SyntaxError("Invalid JSON"), correlationId);
      }

      if (!response.ok) {
        throw new AppError(
          messageFromApiBody(result.body),
          response.status,
          result.body?.errors?.[0]?.code || "API_ERROR",
          result.body?.errors,
          correlationId
        );
      }

      logApiResponseOk(method, url.toString(), response.status, text.length, result.body?.data);

      return result.body.data;
    } catch (error) {
      logApiNetworkOrParseError(method, url.toString(), error);
      return handleApiError(error, correlationId);
    }
  }

  public async get<T>(endpoint: string, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  public async post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("POST", endpoint, { ...options, body });
  }

  public async patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("PATCH", endpoint, { ...options, body });
  }

  public async delete<T>(endpoint: string, options?: Omit<RequestOptions, "body">): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }
}

export const apiClient = ApiClient.getInstance();
