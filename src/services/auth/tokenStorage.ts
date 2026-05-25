import * as SecureStore from "expo-secure-store";
import type { AuthTokens } from "../api/contracts/auth.types";
import { DEFAULT_ACCESS_TOKEN_TTL_SEC } from "./authConstants";
import { devLog } from "../../utils/devLog";

const ACCESS_TOKEN_KEY = "shotvision_access_token";
const REFRESH_TOKEN_KEY = "shotvision_refresh_token";
const EXPIRES_IN_KEY = "shotvision_expires_in";
const TOKEN_ISSUE_TIME_KEY = "shotvision_token_issue_time";
const EXPIRES_AT_KEY = "shotvision_token_expires_at";

export interface PersistedAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | null;
  tokenIssueTime: number | null;
  /** Absolute expiry (epoch ms): `tokenIssueTime + expiresIn * 1000`. */
  expiresAt: number | null;
}

function resolveExpiresIn(raw: number | undefined): number | null {
  if (typeof raw === "number" && raw > 0 && !Number.isNaN(raw)) return raw;
  return null;
}

function computeExpiry(issueTime: number, expiresInSec: number): number {
  return issueTime + expiresInSec * 1000;
}

/**
 * Secure token persistence (expo-secure-store).
 * Only accessed via `authSession` — not from screens or apiClient directly.
 */
export const tokenStorage = {
  async saveSession(tokens: AuthTokens): Promise<void> {
    const issueTime = Date.now();
    const expiresIn =
      resolveExpiresIn(tokens.expiresIn) ?? DEFAULT_ACCESS_TOKEN_TTL_SEC;
    const expiresAt = computeExpiry(issueTime, expiresIn);

    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      await SecureStore.setItemAsync(EXPIRES_IN_KEY, String(expiresIn));
      await SecureStore.setItemAsync(TOKEN_ISSUE_TIME_KEY, String(issueTime));
      await SecureStore.setItemAsync(EXPIRES_AT_KEY, String(expiresAt));
    } catch (error) {
      devLog.error("[tokenStorage] saveSession failed:", error);
      throw new Error("Failed to save session securely");
    }
  },

  async loadSession(): Promise<PersistedAuthSession | null> {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!accessToken?.trim() || !refreshToken?.trim()) return null;

      const expiresInRaw = await SecureStore.getItemAsync(EXPIRES_IN_KEY);
      const issueTimeRaw = await SecureStore.getItemAsync(TOKEN_ISSUE_TIME_KEY);
      const expiresAtRaw = await SecureStore.getItemAsync(EXPIRES_AT_KEY);

      const expiresIn = expiresInRaw ? parseInt(expiresInRaw, 10) : null;
      const tokenIssueTime = issueTimeRaw ? parseInt(issueTimeRaw, 10) : null;
      let expiresAt = expiresAtRaw ? parseInt(expiresAtRaw, 10) : null;

      if (
        Number.isFinite(tokenIssueTime) &&
        tokenIssueTime !== null &&
        Number.isFinite(expiresIn) &&
        expiresIn !== null &&
        expiresIn > 0
      ) {
        expiresAt = computeExpiry(tokenIssueTime, expiresIn);
      }

      return {
        accessToken: accessToken.trim(),
        refreshToken: refreshToken.trim(),
        expiresIn: Number.isFinite(expiresIn) ? expiresIn : null,
        tokenIssueTime: Number.isFinite(tokenIssueTime) ? tokenIssueTime : null,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
      };
    } catch (error) {
      devLog.error("[tokenStorage] loadSession failed:", error);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(EXPIRES_IN_KEY),
        SecureStore.deleteItemAsync(TOKEN_ISSUE_TIME_KEY),
        SecureStore.deleteItemAsync(EXPIRES_AT_KEY),
      ]);
    } catch (error) {
      devLog.error("[tokenStorage] clearSession failed:", error);
    }
  },
};
