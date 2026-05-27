import React, { createContext, useContext, useEffect, useMemo } from "react";
import { bindAuthSessionToStore, useAuthStore } from "../stores/authStore";
import { useEmailLinkAuthHandler } from "../hooks/useEmailLinkAuthHandler";
import type { UserProfile } from "../services/api/profileService";
import type { SessionInvalidationReason } from "../services/auth/authSession";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  lastInvalidationReason: SessionInvalidationReason | null;
  login: (
    googleResponse: unknown,
    options?: { onBackendAttempt?: (attempt: number, maxAttempts: number) => void }
  ) => Promise<void>;
  sendEmailSignInLink: (email: string) => Promise<void>;
  completeEmailLinkSignIn: (
    emailLink: string,
    options?: { onBackendAttempt?: (attempt: number, maxAttempts: number) => void }
  ) => Promise<void>;
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  sendOtp: (identifier: string, method: "email" | "mobile") => Promise<void>;
  logout: () => Promise<void>;
  deleteAccountAndSignOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshUser: (options?: {
    invalidateOnAuthError?: boolean;
    swallowError?: boolean;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider — thin React bridge over `useAuthStore` + `authSession`.
 * All token lifecycle (persist, refresh, invalidate, startup restore) lives in authSession/apiClient.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const lastInvalidationReason = useAuthStore((s) => s.lastInvalidationReason);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const login = useAuthStore((s) => s.login);
  const sendEmailSignInLink = useAuthStore((s) => s.sendEmailSignInLink);
  const completeEmailLinkSignIn = useAuthStore((s) => s.completeEmailLinkSignIn);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccountAndSignOut = useAuthStore((s) => s.deleteAccountAndSignOut);

  useEffect(() => {
    const unbind = bindAuthSessionToStore();
    void bootstrap();
    return unbind;
  }, [bootstrap]);

  useEmailLinkAuthHandler(isHydrated);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticating,
      isAuthenticated: !!user,
      isHydrated,
      lastInvalidationReason,
      login,
      sendEmailSignInLink,
      completeEmailLinkSignIn,
      loginWithOtp,
      sendOtp,
      logout,
      deleteAccountAndSignOut,
      restoreSession,
      refreshUser,
    }),
    [
      user,
      isLoading,
      isAuthenticating,
      isHydrated,
      lastInvalidationReason,
      login,
      sendEmailSignInLink,
      completeEmailLinkSignIn,
      loginWithOtp,
      sendOtp,
      logout,
      deleteAccountAndSignOut,
      restoreSession,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/** Direct zustand access when selectors are preferable (no re-render of full context). */
export { useAuthStore } from "../stores/authStore";
