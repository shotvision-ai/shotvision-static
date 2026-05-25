import { apiClient } from "../api/apiClient";
import { authSession } from "./authSession";
import { firebaseAuthService, FirebaseAuthResult } from "./firebaseAuthService";
import { AppError } from "../api/apiErrors";
import { signOutGoogle } from "../google/signInWithGoogle";
import { normalizeLoginPayload, type LoginResponse } from "./loginPayload";
import { devLog } from "../../utils/devLog";

export type { LoginResponse };

const syncAccessToken = (token: string | null) => apiClient.setAccessToken(token);

/**
 * authService — Firebase + backend login orchestration.
 * Token persistence and refresh are owned by `authSession`.
 */
export const authService = {
  async loginWithGoogle(googleResponse: unknown): Promise<LoginResponse["user"] | null> {
    try {
      const firebaseResult: FirebaseAuthResult | null =
        await firebaseAuthService.handleGoogleLoginResponse(googleResponse);

      if (!firebaseResult) {
        return null;
      }

      const rawLogin = await apiClient.post<unknown>("/api/auth/login", {
        firebaseToken: firebaseResult.firebaseToken,
      });
      const loginData = normalizeLoginPayload(rawLogin);

      await authSession.persistSession(
        {
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
          expiresIn: loginData.expiresIn,
        },
        syncAccessToken
      );

      return loginData.user;
    } catch (error) {
      devLog.error("[authService] login failed:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to complete login with backend", 500, "LOGIN_FAILURE");
    }
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = await authSession.getRefreshTokenForLogout();
      if (refreshToken) {
        try {
          await apiClient.post<null>("/api/auth/logout", { refreshToken });
        } catch (error) {
          devLog.warn("[authService] backend logout failed (clearing local anyway):", error);
        }
      }

      await signOutGoogle();
      await firebaseAuthService.signOut();
      await authSession.invalidateSession("logout", syncAccessToken);
    } catch (error) {
      devLog.error("[authService] logout failed:", error);
      await authSession.invalidateSession("logout", syncAccessToken);
      throw new AppError("Failed to logout correctly", 500, "LOGOUT_FAILURE");
    }
  },

  /** @deprecated Prefer authStore.bootstrap — kept for direct service calls. */
  async restoreSession(): Promise<boolean> {
    return authSession.restoreFromStorage(syncAccessToken);
  },

  async sendOtp(identifier: string, method: "email" | "mobile"): Promise<string> {
    try {
      if (method === "email") {
        await firebaseAuthService.sendEmailLink(identifier);
        return "email_sent";
      }
      return await firebaseAuthService.sendOtp(identifier);
    } catch (error: unknown) {
      devLog.error(`[authService] send ${method} failed:`, error);
      if (error instanceof AppError) throw error;
      const msg = error instanceof Error ? error.message : "Failed to send verification";
      throw new AppError(msg, 500, "AUTH_SEND_FAILURE");
    }
  },

  async verifyOtp(sessionInfo: string, otp: string): Promise<LoginResponse["user"]> {
    try {
      if (sessionInfo.includes("@") || sessionInfo === "email_sent") {
        throw new AppError(
          "Please use the sign-in link sent to your email.",
          400,
          "EMAIL_LINK_REQUIRED"
        );
      }

      const firebaseResult = await firebaseAuthService.verifyOtp(sessionInfo, otp);
      const raw = await apiClient.post<unknown>("/api/auth/login", {
        firebaseToken: firebaseResult.firebaseToken,
      });
      const loginData = normalizeLoginPayload(raw);

      await authSession.persistSession(
        {
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
          expiresIn: loginData.expiresIn,
        },
        syncAccessToken
      );

      return loginData.user;
    } catch (error: unknown) {
      devLog.error("[authService] OTP verification failed:", error);
      if (error instanceof AppError) {
        if (error.statusCode === 400) {
          throw new AppError("The verification code is invalid or has expired", 400, "INVALID_OTP");
        }
        throw error;
      }
      const msg = error instanceof Error ? error.message : "Verification failed. Please try again.";
      throw new AppError(msg, 500, "OTP_VERIFY_FAILURE");
    }
  },
};
