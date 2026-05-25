import { create } from "zustand";
import { authService } from "../services/auth/authService";
import { authSession, type SessionInvalidationReason } from "../services/auth/authSession";
import { apiClient } from "../services/api/apiClient";
import { profileService, type UserProfile } from "../services/api/profileService";
import { AppError } from "../services/api/apiErrors";
import { logShotVisionUi } from "../services/api/apiDebug";
import { devLog } from "../utils/devLog";
const syncToken = (token: string | null) => apiClient.setAccessToken(token);

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isHydrated: boolean;
  isLoggingOut: boolean;
  otpSession: string | null;
  lastInvalidationReason: SessionInvalidationReason | null;

  /** App startup: restore tokens + fetch profile. */
  bootstrap: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshUser: () => Promise<void>;

  login: (googleResponse: unknown) => Promise<void>;
  sendOtp: (identifier: string, method: "email" | "mobile") => Promise<void>;
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;

  /** Called when apiClient refresh fails or 401 cannot be recovered. */
  handleSessionInvalidated: (reason: SessionInvalidationReason) => void;
}

async function loadProfileAfterAuth(): Promise<UserProfile> {
  return profileService.getCurrentProfile();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isHydrated: false,
  isLoggingOut: false,
  otpSession: null,
  lastInvalidationReason: null,

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
      set({ user: profile, isLoading: false, isHydrated: true });
      logShotVisionUi("authStore", `bootstrap ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] bootstrap failed:", error);
      if (error instanceof AppError && error.statusCode === 401) {
        await authSession.invalidateSession("unauthorized", syncToken);
      }
      set({ user: null, isLoading: false, isHydrated: true });
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
      set({ user: profile, isLoading: false });
      logShotVisionUi("authStore", `restoreSession ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] restoreSession failed:", error);
      if (error instanceof AppError && error.statusCode === 401) {
        await authSession.invalidateSession("unauthorized", syncToken);
      }
      set({ user: null, isLoading: false });
    }
  },

  refreshUser: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const profile = await loadProfileAfterAuth();
      set({ user: profile });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        get().handleSessionInvalidated("unauthorized");
      }
      throw error;
    }
  },

  login: async (googleResponse: unknown) => {
    set({ isLoading: true });
    try {
      await authService.loginWithGoogle(googleResponse);
      const profile = await loadProfileAfterAuth();
      set({ user: profile, isLoading: false, lastInvalidationReason: null });
      logShotVisionUi("authStore", `login google ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] login failed:", error);
      set({ user: null, isLoading: false });
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

    set({ isLoading: true });
    try {
      await authService.verifyOtp(otpSession, otp);
      const profile = await loadProfileAfterAuth();
      set({ user: profile, isLoading: false, otpSession: null, lastInvalidationReason: null });
      logShotVisionUi("authStore", `login otp ok userId=${profile.id}`);
    } catch (error) {
      devLog.error("[authStore] OTP login failed:", error);
      set({ user: null, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    if (get().isLoggingOut) return;
    set({ isLoggingOut: true, isLoading: true });
    try {
      await authService.logout();
      set({
        user: null,
        isLoading: false,
        otpSession: null,
        lastInvalidationReason: "logout",
      });
    } catch (error) {
      devLog.error("[authStore] logout failed:", error);
      await authSession.invalidateSession("logout", syncToken);
      set({ user: null, isLoading: false, otpSession: null });
    } finally {
      set({ isLoggingOut: false });
    }
  },

  handleSessionInvalidated: (reason: SessionInvalidationReason) => {
    if (get().isLoggingOut) return;
    set({
      user: null,
      isLoading: false,
      otpSession: null,
      lastInvalidationReason: reason,
    });
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
