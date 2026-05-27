import { firebaseAuthService, FirebaseAuthResult } from "./firebaseAuthService";
import { AppError } from "../api/apiErrors";
import { authSession } from "./authSession";
import { apiClient } from "../api/apiClient";
import { type LoginResponse } from "./loginPayload";
import { type AuthLoginAttemptListener } from "./authLoginRequest";
import {
  performFullSignOut,
  rollbackFailedLoginAttempt,
} from "./clearAuthState";
import { persistLoginFromFirebaseToken } from "./completeFirebaseLogin";
import {
  clearPendingEmailForLink,
  getPendingEmailForLink,
  savePendingEmailForLink,
} from "./emailLinkStorage";
import { devLog } from "../../utils/devLog";

export type { LoginResponse };

/**
 * authService — Firebase + backend login orchestration.
 * Token persistence and refresh are owned by `authSession`.
 */
export const authService = {
  async loginWithGoogle(
    googleResponse: unknown,
    options?: { onBackendAttempt?: AuthLoginAttemptListener }
  ): Promise<LoginResponse["user"] | null> {
    try {
      const firebaseResult: FirebaseAuthResult | null =
        await firebaseAuthService.handleGoogleLoginResponse(googleResponse);

      if (!firebaseResult) {
        return null;
      }

      return await persistLoginFromFirebaseToken(firebaseResult.firebaseToken, options);
    } catch (error) {
      devLog.error("[authService] login failed:", error);
      await rollbackFailedLoginAttempt();
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to complete login with backend", 500, "LOGIN_FAILURE");
    }
  },

  /** Send Firebase Email Link; stores email locally for completion on this device. */
  async sendEmailSignInLink(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      throw new AppError("Enter a valid email address.", 400, "INVALID_EMAIL");
    }
    await firebaseAuthService.sendEmailLink(normalized);
    await savePendingEmailForLink(normalized);
    devLog.info("[authService] email link sent");
  },

  /**
   * Complete Email Link sign-in from a deep link URL.
   * Reuses the same backend JWT exchange as Google SSO.
   */
  async completeEmailLinkSignIn(
    emailLink: string,
    options?: { onBackendAttempt?: AuthLoginAttemptListener; email?: string }
  ): Promise<LoginResponse["user"]> {
    const link = emailLink.trim();
    if (!link) {
      throw new AppError("Missing sign-in link.", 400, "INVALID_EMAIL_LINK");
    }

    const email = (options?.email ?? (await getPendingEmailForLink()))?.trim().toLowerCase();
    if (!email) {
      throw new AppError(
        "We could not verify which email requested this link. Enter your email on the login screen and request a new link.",
        400,
        "EMAIL_REQUIRED"
      );
    }

    try {
      const firebaseResult = await firebaseAuthService.signInWithEmailLink(email, link);
      const user = await persistLoginFromFirebaseToken(firebaseResult.firebaseToken, options);
      await clearPendingEmailForLink();
      return user;
    } catch (error) {
      devLog.error("[authService] email link login failed:", error);
      await rollbackFailedLoginAttempt();
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to complete email link sign-in.", 500, "EMAIL_LINK_FAILURE");
    }
  },

  /** Standard sign-out (keeps Google account cached for faster next sign-in). */
  async logout(): Promise<void> {
    await performFullSignOut({ notifyBackend: true, revokeGoogleAccess: false, reason: "logout" });
  },

  /** After account deletion — revoke Google access so the next sign-in is predictable. */
  async logoutAfterAccountDeletion(): Promise<void> {
    await performFullSignOut({
      notifyBackend: false,
      revokeGoogleAccess: true,
      reason: "account_deleted",
    });
  },

  /** @deprecated Prefer authStore.bootstrap — kept for direct service calls. */
  async restoreSession(): Promise<boolean> {
    return authSession.restoreFromStorage((token) => apiClient.setAccessToken(token));
  },

  async sendOtp(identifier: string, method: "email" | "mobile"): Promise<string> {
    try {
      if (method === "email") {
        await this.sendEmailSignInLink(identifier);
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
      return await persistLoginFromFirebaseToken(firebaseResult.firebaseToken);
    } catch (error: unknown) {
      devLog.error("[authService] OTP verification failed:", error);
      await rollbackFailedLoginAttempt();
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
