import React, { createContext, useContext, useEffect, useMemo } from "react";
import { bindAuthSessionToStore, useAuthStore } from "../stores/authStore";
import type { UserProfile } from "../services/api/profileService";
import type { SessionInvalidationReason } from "../services/auth/authSession";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  lastInvalidationReason: SessionInvalidationReason | null;
  login: (googleResponse: unknown) => Promise<void>;
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  sendOtp: (identifier: string, method: "email" | "mobile") => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider — thin React bridge over `useAuthStore` + `authSession`.
 * All token lifecycle (persist, refresh, invalidate, startup restore) lives in authSession/apiClient.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const lastInvalidationReason = useAuthStore((s) => s.lastInvalidationReason);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const login = useAuthStore((s) => s.login);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const unbind = bindAuthSessionToStore();
    void bootstrap();
    return unbind;
  }, [bootstrap]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isHydrated,
      lastInvalidationReason,
      login,
      loginWithOtp,
      sendOtp,
      logout,
      restoreSession,
      refreshUser,
    }),
    [
      user,
      isLoading,
      isHydrated,
      lastInvalidationReason,
      login,
      loginWithOtp,
      sendOtp,
      logout,
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
