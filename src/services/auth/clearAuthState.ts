import { apiClient } from "../api/apiClient";
import { authSession, type SessionInvalidationReason } from "./authSession";
import { firebaseAuthService } from "./firebaseAuthService";
import { signOutGoogle } from "../google/signInWithGoogle";
import { devLog } from "../../utils/devLog";
import { useMatchLikeStore } from "../../stores/matchLikeStore";
import { useMatchVisibilityStore } from "../../stores/matchVisibilityStore";
import { useMatchReportStore } from "../../stores/matchReportStore";
import { useMatchOwnershipStore } from "../../stores/matchOwnershipStore";
import { resetMatchOwnershipSession } from "../../utils/matchOwnership";
import { clearPendingEmailForLink } from "./emailLinkStorage";

const syncAccessToken = (token: string | null) => apiClient.setAccessToken(token);

export type FullSignOutOptions = {
  /** Best-effort POST `/api/auth/logout` before clearing tokens. */
  notifyBackend?: boolean;
  /** Revoke Google grant so the next sign-in can pick a different account (account deletion). */
  revokeGoogleAccess?: boolean;
  reason?: SessionInvalidationReason;
};

/** Clears in-memory domain caches tied to the signed-in user (likes, visibility, reports, ownership). */
export function resetAuthDomainStores(): void {
  useMatchLikeStore.getState().clearAll();
  useMatchVisibilityStore.getState().clearAll();
  useMatchReportStore.getState().clearAll();
  useMatchOwnershipStore.getState().clearAll();
  resetMatchOwnershipSession();
}

/** Firebase + Google identity providers — never throws (logout/delete must always clear JWT storage). */
export async function signOutIdentityProviders(options?: {
  revokeGoogleAccess?: boolean;
}): Promise<void> {
  try {
    await signOutGoogle({ revokeAccess: options?.revokeGoogleAccess });
  } catch (error) {
    devLog.warn("[clearAuthState] Google sign-out failed:", error);
  }

  try {
    await firebaseAuthService.signOut();
  } catch (error) {
    devLog.warn("[clearAuthState] Firebase sign-out failed:", error);
  }
}

/**
 * Single production sign-out path: optional backend revoke → identity providers → SecureStore JWT wipe.
 */
export async function performFullSignOut(options: FullSignOutOptions = {}): Promise<void> {
  const { notifyBackend = true, revokeGoogleAccess = false, reason = "logout" } = options;

  if (notifyBackend) {
    try {
      const refreshToken = await authSession.getRefreshTokenForLogout();
      if (refreshToken) {
        await apiClient.post<null>("/api/auth/logout", { refreshToken }, { skipAuth: true });
      }
    } catch (error) {
      devLog.warn("[clearAuthState] backend logout failed (clearing local anyway):", error);
    }
  }

  await clearPendingEmailForLink();
  await signOutIdentityProviders({ revokeGoogleAccess });
  await authSession.invalidateSession(reason, syncAccessToken);
  // Domain stores are cleared via authSession → authStore.handleSessionInvalidated,
  // or explicitly in authStore.logout / deleteAccountAndSignOut when isLoggingOut.
}

/** After a failed login when Firebase may already be signed in. */
export async function rollbackFailedLoginAttempt(): Promise<void> {
  await clearPendingEmailForLink();
  await signOutIdentityProviders();
  await authSession.invalidateSession("manual", syncAccessToken);
}

export function isInvalidSessionProfileError(statusCode: number): boolean {
  return statusCode === 401 || statusCode === 403 || statusCode === 404;
}
