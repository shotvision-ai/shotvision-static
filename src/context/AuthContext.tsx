import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/auth/authService";
import { profileService, UserProfile } from "../services/api/profileService";
import { AppError } from "../services/api/apiErrors";
import { apiClient } from "../services/api/apiClient";
import { logShotVisionUi } from "../services/api/apiDebug";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (googleResponse: any) => Promise<void>;
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  sendOtp: (identifier: string, method: "email" | "mobile") => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [otpSession, setOtpSession] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const restored = await authService.restoreSession();
      if (restored) {
        // Fetch current user details from backend to confirm session is still valid
        // and get the latest user profile data.
        const userData = await profileService.getCurrentProfile();
        setUser(userData);
        logShotVisionUi("AuthContext", `restoreSession ok userId=${userData.id} nameLen=${userData.name?.length ?? 0}`);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      // If profile fetch fails with 401, the token is invalid/expired
      if (error instanceof AppError && error.statusCode === 401) {
        await authService.logout();
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (googleResponse: any) => {
    setIsLoading(true);
    try {
      const userData = await authService.loginWithGoogle(googleResponse);
      // After login, we might want to fetch the full profile to ensure we have all fields
      // but the login API usually returns the basic user info.
      // For consistency, let's fetch the full profile.
      const fullProfile = await profileService.getCurrentProfile();
      setUser(fullProfile);
      logShotVisionUi("AuthContext", `login google profile ok userId=${fullProfile.id}`);
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (identifier: string, method: "email" | "mobile") => {
    try {
      const sessionInfo = await authService.sendOtp(identifier, method);
      setOtpSession(sessionInfo);
    } catch (error) {
      console.error("Send OTP failed in context:", error);
      throw error;
    }
  };

  const loginWithOtp = async (identifier: string, otp: string) => {
    if (!otpSession) {
      throw new AppError("No active session found. Please request a new code.", 400, "NO_SESSION");
    }

    setIsLoading(true);
    try {
      if (otpSession === "email_sent") {
        throw new AppError("Please use the link sent to your email to log in.", 400, "EMAIL_LINK_REQUIRED");
      }

      await authService.verifyOtp(otpSession, otp);
      const fullProfile = await profileService.getCurrentProfile();
      setUser(fullProfile);
      logShotVisionUi("AuthContext", `login otp profile ok userId=${fullProfile.id}`);
      setOtpSession(null); // Clear session after success
    } catch (error) {
      console.error("OTP login failed in context:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set the logout callback in the API client to handle forced logouts (e.g., refresh failure)
    apiClient.setLogoutCallback(() => {
      logout();
    });

    restoreSession();
  }, [restoreSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithOtp,
        sendOtp,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
