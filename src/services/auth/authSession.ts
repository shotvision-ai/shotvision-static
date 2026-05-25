/**
 * Central auth session manager — tokens, proactive/reactive refresh, invalidation.
 * All refresh logic lives here; apiClient and authStore call into this module only.
 */

import { config } from "../../config/config";
import type { AuthRefreshResponse, AuthTokens } from "../api/contracts/auth.types";
import { parseApiResponseText } from "../api/responseParser";
import { fetchWithTimeout } from "../api/fetchWithTimeout";
import { AUTH_REFRESH_TIMEOUT_MS } from "../../config/apiTimeouts";
import { ACCESS_TOKEN_REFRESH_BUFFER_MS } from "./authConstants";
import { logAuthSession } from "./authSession.debug";
import { tokenStorage, type PersistedAuthSession } from "./tokenStorage";

export type SessionInvalidationReason =
  | "logout"
  | "refresh_failed"
  | "unauthorized"
  | "manual";

type InvalidateListener = (reason: SessionInvalidationReason) => void;
type SyncAccessToken = (token: string | null) => void;

class AuthSessionManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresIn: number | null = null;
  private tokenIssueTime: number | null = null;
  private expiresAt: number | null = null;

  private refreshPromise: Promise<string | null> | null = null;
  private isInvalidating = false;
  private readonly invalidateListeners = new Set<InvalidateListener>();

  onInvalidate(listener: InvalidateListener): () => void {
    this.invalidateListeners.add(listener);
    return () => this.invalidateListeners.delete(listener);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** True when access token is past expiry (small clock skew). */
  isAccessTokenExpired(skewMs = 0): boolean {
    if (!this.expiresAt) return false;
    return Date.now() >= this.expiresAt - skewMs;
  }

  /** True when within refresh buffer window before expiry. */
  shouldRefreshProactively(): boolean {
    if (!this.expiresAt || !this.accessToken) return false;
    return Date.now() >= this.expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Returns a valid access token for API calls.
   * Proactively refreshes when inside the buffer window; dedupes concurrent callers.
   */
  async ensureValidAccessToken(syncAccessToken: SyncAccessToken): Promise<string | null> {
    if (!this.accessToken) {
      const restored = await this.restoreFromStorage(syncAccessToken);
      if (!restored) return null;
    }

    if (!this.shouldRefreshProactively()) {
      return this.accessToken;
    }

    logAuthSession(
      "proactive_refresh",
      `within buffer (${ACCESS_TOKEN_REFRESH_BUFFER_MS / 60_000}min before expiry)`
    );
    return this.refreshTokens(syncAccessToken);
  }

  private hydrateFromPersisted(stored: PersistedAuthSession, syncAccessToken: SyncAccessToken): void {
    this.accessToken = stored.accessToken;
    this.refreshToken = stored.refreshToken;
    this.expiresIn = stored.expiresIn;
    this.tokenIssueTime = stored.tokenIssueTime;
    this.expiresAt = stored.expiresAt;
    syncAccessToken(this.accessToken);
  }

  async persistSession(tokens: AuthTokens, syncAccessToken: SyncAccessToken): Promise<void> {
    await tokenStorage.saveSession(tokens);
    const stored = await tokenStorage.loadSession();
    if (stored) {
      this.hydrateFromPersisted(stored, syncAccessToken);
    } else {
      this.accessToken = tokens.accessToken.trim();
      this.refreshToken = tokens.refreshToken.trim();
      syncAccessToken(this.accessToken);
    }
    logAuthSession(
      "persist",
      `expiresIn=${this.expiresIn ?? "?"}s issueTime=${this.tokenIssueTime ?? "?"}`
    );
  }

  async restoreFromStorage(syncAccessToken: SyncAccessToken): Promise<boolean> {
    const stored = await tokenStorage.loadSession();
    if (!stored) {
      this.clearMemory(syncAccessToken);
      return false;
    }
    this.hydrateFromPersisted(stored, syncAccessToken);
    logAuthSession(
      "restore",
      `expiresAt=${this.expiresAt ? new Date(this.expiresAt).toISOString() : "unknown"}`
    );
    return true;
  }

  /**
   * POST `/api/auth/refresh` — single flight; concurrent callers await the same promise.
   */
  async refreshTokens(syncAccessToken: SyncAccessToken): Promise<string | null> {
    if (this.refreshPromise) {
      logAuthSession("refresh", "awaiting in-flight refresh");
      return this.refreshPromise;
    }

    this.refreshPromise = this.runRefresh(syncAccessToken);
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async runRefresh(syncAccessToken: SyncAccessToken): Promise<string | null> {
    const refreshToken = this.refreshToken ?? (await tokenStorage.loadSession())?.refreshToken;
    if (!refreshToken?.trim()) {
      logAuthSession("refresh", "aborted — no refresh token");
      await this.invalidateSession("refresh_failed", syncAccessToken);
      return null;
    }

    const correlationId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
    const e2eId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

    try {
      logAuthSession("refresh", "POST /api/auth/refresh");
      const response = await fetchWithTimeout(
        `${config.apiBaseUrl}/api/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Correlation-ID": correlationId,
            "X-E2E-ID": e2eId,
          },
          body: JSON.stringify({ refreshToken }),
        },
        AUTH_REFRESH_TIMEOUT_MS
      );

      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`Refresh failed HTTP ${response.status}`);
      }

      const data = parseApiResponseText<AuthRefreshResponse>(text, {
        correlationId,
        httpOk: response.ok,
        httpStatus: response.status,
      });

      const newAccess = data.accessToken.trim();
      const newRefresh = data.refreshToken?.trim() ?? refreshToken;

      await this.persistSession(
        {
          accessToken: newAccess,
          refreshToken: newRefresh,
          expiresIn: data.expiresIn,
        },
        syncAccessToken
      );

      logAuthSession("refresh", "success");
      return newAccess;
    } catch (error) {
      logAuthSession(
        "refresh",
        `failed — ${error instanceof Error ? error.message : String(error)}`
      );
      await this.invalidateSession("refresh_failed", syncAccessToken);
      return null;
    }
  }

  async invalidateSession(
    reason: SessionInvalidationReason,
    syncAccessToken: SyncAccessToken
  ): Promise<void> {
    if (this.isInvalidating) return;
    this.isInvalidating = true;
    try {
      await tokenStorage.clearSession();
      this.clearMemory(syncAccessToken);
      this.refreshPromise = null;
      logAuthSession("invalidate", reason);
      this.invalidateListeners.forEach((fn) => fn(reason));
    } finally {
      this.isInvalidating = false;
    }
  }

  private clearMemory(syncAccessToken: SyncAccessToken): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresIn = null;
    this.tokenIssueTime = null;
    this.expiresAt = null;
    syncAccessToken(null);
  }

  async getRefreshTokenForLogout(): Promise<string | null> {
    return this.refreshToken ?? (await tokenStorage.loadSession())?.refreshToken ?? null;
  }
}

export const authSession = new AuthSessionManager();
