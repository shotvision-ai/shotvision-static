import { create } from "zustand";
import { authService } from "../services/auth/authService";
import { authSession, type SessionInvalidationReason } from "../services/auth/authSession";
import { apiClient } from "../services/api/apiClient";
import { profileService, type UserProfile } from "../services/api/profileService";
import { AppError } from "../services/api/apiErrors";
import { logShotVisionUi } from "../services/api/apiDebug";
import { devLog } from "../utils/devLog";
import { hydrateMatchReportsForUser } from "../services/auth/hydrateMatchReports";
import { useMatchLikeStore } from "./matchLikeStore";
import {
  isRetryableColdStartError,
  type AuthLoginAttemptListener,
} from "../services/auth/authLoginRequest";
import {
  isInvalidSessionProfileError,
  resetAuthDomainStores,
} from "../services/auth/clearAuthState";
import { profileImageUrlChanged } from "../utils/profileImageSync";
import { profileFieldsSnapshot } from "../utils/profileSessionMerge";

const syncToken = (token: string | null) => apiClient.setAccessToken(token);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applySignedOutState(
  set: (partial: Partial<AuthState>) => void,
  reason: SessionInvalidationReason
): void {
  resetAuthDomainStores();
  set({
    user: null,
    isLoading: false,
    isAuthenticating: false,
    isHydrated: true,
    otpSession: null,
    lastInvalidationReason: reason,
    profileImageRevision: 0,
  });
}

interface AuthState {
  user: UserProfile | null;
  /** Incremented when `user.image` changes — busts expo-image cache for profile photos. */
  profileImageRevision: number;
  /** True only during app bootstrap / restoreSession — not during active sign-in. */
  isLoading: boolean;
  /** True while Google/OTP sign-in is in flight (avoids coupling to bootstrap isLoading). */
  isAuthenticating: boolean;
  isHydrated: boolean;
  isLoggingOut: boolean;
  otpSession: string | null;
  lastInvalidationReason: SessionInvalidationReason | null;

  /** App startup: restore tokens + fetch profile. */
  bootstrap: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshUser: (options?: {
    invalidateOnAuthError?: boolean;
    swallowError?: boolean;
  }) => Promise<void>;
  /** Authoritative session update after PATCH /api/users/me (avoids stale GET overwrite). */
  applyUserProfileUpdate: (profile: UserProfile) => void;
  setUserProfileImage: (image: string | undefined) => void;

  login: (
    googleResponse: unknown,
    options?: { onBackendAttempt?: AuthLoginAttemptListener }
  ) => Promise<void>;
  sendEmailSignInLink: (email: string) => Promise<void>;
  completeEmailLinkSignIn: (
    emailLink: string,
    options?: { onBackendAttempt?: AuthLoginAttemptListener }
  ) => Promise<void>;
  sendOtp: (identifier: string, method: "email" | "mobile") => Promise<void>;
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccountAndSignOut: () => Promise<void>;

  /** Called when apiClient refresh fails or 401 cannot be recovered. */
  handleSessionInvalidated: (reason: SessionInvalidationReason) => void;
}

async function loadProfileAfterAuth(): Promise<UserProfile> {
  return profileService.getCurrentProfile();
}

async function hydrateEngagementForUser(userId: string): Promise<void> {
  await Promise.all([
    hydrateMatchReportsForUser(userId),
    useMatchLikeStore.getState().hydrateForUser(userId),
  ]);
}

async function loadProfileAfterAuthResilient(): Promise<UserProfile> {
  try {
    return await loadProfileAfterAuth();
  } catch (error) {
    if (!isRetryableColdStartError(error)) throw error;
    devLog.warn("[authStore] profile fetch failed during login, retrying once:", error);
    await sleep(2_000);
    return loadProfileAfterAuth();
  }
}

async function invalidateSessionForProfileError(error: unknown): Promise<void> {
  if (error instanceof AppError && isInvalidSessionProfileError(error.statusCode)) {
    await authSession.invalidateSession("unauthorized", syncToken);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profileImageRevision: 0,
  isLoading: true,
  isAuthenticating: false,
  isHydrated: false,
  isLoggingOut: false,
  otpSession: null,
  lastInvalidationReason: null,

  applyUserProfileUpdate: (profile: UserProfile) => {
    const { user, profileImageRevision } = get();
    if (!user) return;
    const imageChanged = profileImageUrlChanged(user.image, profile.image);
    set({
      user: profile,
      profileImageRevision: imageChanged ? profileImageRevision + 1 : profileImageRevision,
    });
    devLog.info("[authStore] applyUserProfileUpdate", profileFieldsSnapshot(profile));
  },

  setUserProfileImage: (image: string | undefined) => {
    const { user, profileImageRevision } = get();
    if (!user) return;
    const changed = profileImageUrlChanged(user.image, image);
    set({
      user: { ...user, image },
      profileImageRevision: changed ? profileImageRevision + 1 : profileImageRevision,
    });
  },

  bootstrap: async () => {
    set({ isLoading: true });
    try {
      const restored = await authSession.restoreFromStorage(syncToken);
      if (!restored) {
        set({ user: null, isLoading: false, isHydrated: true });
        return;
      }

      const token = await authSession.ensureValidAccessToken(syncToken);
      if (!token) {
        set({ user: null, isLoading: false, isHydrated: true });
        return;
      }

      const profile = await loadProfileAfterAuth();
      await hydrateEngagementForUser(profile.id);
      set({ user: profile, isLoading: false, isHydrated: true, lastInvalidationReason: null });
      devLog.info("[authStore] bootstrap hydrated", profileFieldsSnapshot(profile));
      logShotVisionUi("authStore", `bootstrap ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] bootstrap failed:", error);
      await invalidateSessionForProfileError(error);
      set({ user: null, isLoading: false, isHydrated: true });
      resetAuthDomainStores();
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await authSession.ensureValidAccessToken(syncToken);
      if (!token) {
        set({ user: null, isLoading: false });
        return;
      }
      const profile = await loadProfileAfterAuth();
      await hydrateEngagementForUser(profile.id);
      set({ user: profile, isLoading: false, lastInvalidationReason: null });
      logShotVisionUi("authStore", `restoreSession ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] restoreSession failed:", error);
      await invalidateSessionForProfileError(error);
      set({ user: null, isLoading: false });
      resetAuthDomainStores();
    }
  },

  refreshUser: async (options) => {
    const { user, profileImageRevision } = get();
    if (!user) return;
    try {
      const before = profileFieldsSnapshot(user);
      const merged = await profileService.getCurrentProfile(user);
      const imageChanged = profileImageUrlChanged(user.image, merged.image);
      set({
        user: merged,
        profileImageRevision: imageChanged ? profileImageRevision + 1 : profileImageRevision,
      });
      devLog.info("[authStore] refreshUser", {
        before,
        after: profileFieldsSnapshot(merged),
      });
    } catch (error) {
      devLog.warn("[authStore] refreshUser failed:", error);
      if (
        error instanceof AppError &&
        isInvalidSessionProfileError(error.statusCode) &&
        options?.invalidateOnAuthError !== false
      ) {
        get().handleSessionInvalidated("unauthorized");
      }
      if (options?.swallowError) {
        return;
      }
      throw error;
    }
  },

  login: async (googleResponse, options) => {
    if (get().isAuthenticating) return;

    set({ isAuthenticating: true, lastInvalidationReason: null });
    try {
      await authService.loginWithGoogle(googleResponse, {
        onBackendAttempt: options?.onBackendAttempt,
      });
      const profile = await loadProfileAfterAuthResilient();
      await hydrateEngagementForUser(profile.id);
      set({ user: profile, isAuthenticating: false, lastInvalidationReason: null });
      logShotVisionUi("authStore", `login google ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] login failed:", error);
      set({ user: null, isAuthenticating: false });
      throw error;
    }
  },

  sendEmailSignInLink: async (email: string) => {
    await authService.sendEmailSignInLink(email);
  },

  completeEmailLinkSignIn: async (emailLink, options) => {
    if (get().isAuthenticating || get().user) return;

    set({ isAuthenticating: true, lastInvalidationReason: null });
    try {
      await authService.completeEmailLinkSignIn(emailLink, options);
      const profile = await loadProfileAfterAuthResilient();
      await hydrateEngagementForUser(profile.id);
      set({ user: profile, isAuthenticating: false, lastInvalidationReason: null });
      logShotVisionUi("authStore", `login email-link ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] email link login failed:", error);
      set({ user: null, isAuthenticating: false });
      throw error;
    }
  },

  sendOtp: async (identifier: string, method: "email" | "mobile") => {
    const sessionInfo = await authService.sendOtp(identifier, method);
    set({ otpSession: sessionInfo });
  },

  loginWithOtp: async (_identifier: string, otp: string) => {
    const { otpSession } = get();
    if (!otpSession) {
      throw new AppError("No active session found. Please request a new code.", 400, "NO_SESSION");
    }
    if (otpSession === "email_sent") {
      throw new AppError("Please use the link sent to your email to log in.", 400, "EMAIL_LINK_REQUIRED");
    }

    set({ isAuthenticating: true, lastInvalidationReason: null });
    try {
      await authService.verifyOtp(otpSession, otp);
      const profile = await loadProfileAfterAuth();
      await hydrateEngagementForUser(profile.id);
      set({ user: profile, isAuthenticating: false, otpSession: null, lastInvalidationReason: null });
      logShotVisionUi("authStore", `login otp ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] OTP login failed:", error);
      set({ user: null, isAuthenticating: false });
      throw error;
    }
  },

  logout: async () => {
    if (get().isLoggingOut) return;
    set({ isLoggingOut: true });
    try {
      await authService.logout();
      applySignedOutState(set, "logout");
    } catch (error) {
      devLog.error("[authStore] logout failed:", error);
      applySignedOutState(set, "logout");
      throw error;
    } finally {
      set({ isLoggingOut: false });
    }
  },

  deleteAccountAndSignOut: async () => {
    if (get().isLoggingOut) return;
    set({ isLoggingOut: true });
    try {
      await profileService.deleteAccount();
      await authService.logoutAfterAccountDeletion();
      applySignedOutState(set, "account_deleted");
    } catch (error) {
      devLog.error("[authStore] deleteAccountAndSignOut failed:", error);
      throw error;
    } finally {
      set({ isLoggingOut: false });
    }
  },

  handleSessionInvalidated: (reason: SessionInvalidationReason) => {
    if (get().isLoggingOut) return;
    applySignedOutState(set, reason);
  },
}));

/** Wire apiClient 401/refresh failure → store (call once at app init). */
export function bindAuthSessionToStore(): () => void {
  return authSession.onInvalidate((reason) => {
    useAuthStore.getState().handleSessionInvalidated(reason);
  });
}

export const authStoreSelectors = {
  isAuthenticated: (s: AuthState) => !!s.user,
};
