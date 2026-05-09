import { apiClient } from "../api/apiClient";
import { tokenStorage } from "./tokenStorage";
import { firebaseAuthService, FirebaseAuthResult } from "./firebaseAuthService";
import { AppError } from "../api/apiErrors";
import { signOutGoogle } from "../google/signInWithGoogle";
import { normalizeLoginPayload, type LoginResponse } from "./loginPayload";

export type { LoginResponse };

/**
 * authService orchestrates the authentication flow between Firebase and the backend.
 */
export const authService = {
  /**
   * Google login: native SDK → Firebase (`signInWithGoogleIdToken`) → POST `/api/auth/login` with
   * Firebase ID token → persist backend JWT in SecureStore.
   */
  async loginWithGoogle(googleResponse: any): Promise<LoginResponse["user"] | null> {
    try {
      const firebaseResult: FirebaseAuthResult | null = await firebaseAuthService.handleGoogleLoginResponse(googleResponse);
      
      if (!firebaseResult) {
        return null;
      }

      // 2. POST /api/auth/login — body uses Firebase ID token only here; response carries ShotVision JWTs.
      const rawLogin = await apiClient.post<unknown>("/api/auth/login", {
        firebaseToken: firebaseResult.firebaseToken,
      });
      const loginData = normalizeLoginPayload(rawLogin);

      // 3. Store tokens securely
      await Promise.all([
        tokenStorage.saveAccessToken(loginData.accessToken),
        tokenStorage.saveRefreshToken(loginData.refreshToken),
      ]);

      // 4. Update apiClient with the new access token for future requests
      apiClient.setAccessToken(loginData.accessToken);

      // 5. Return the authenticated user
      return loginData.user;
    } catch (error) {
      console.error("Login flow failed:", error);
      
      // If it's already an AppError, rethrow it
      if (error instanceof AppError) {
        throw error;
      }
      
      // Otherwise, wrap it in a standardized error
      throw new AppError(
        "Failed to complete login with backend",
        500,
        "LOGIN_FAILURE"
      );
    }
  },

  /**
   * Logs out the user by clearing local storage and signing out from Firebase.
   */
  async logout(): Promise<void> {
    try {
      await signOutGoogle();
      await Promise.all([
        tokenStorage.clearSession(),
        firebaseAuthService.signOut(),
      ]);
      
      // Clear the access token in the API client
      apiClient.setAccessToken(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw new AppError("Failed to logout correctly", 500, "LOGOUT_FAILURE");
    }
  },

  /**
   * Restores the session if an access token exists.
   */
  async restoreSession(): Promise<boolean> {
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        apiClient.setAccessToken(token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to restore session:", error);
      return false;
    }
  },

  /**
   * Sends an OTP to the user's phone (via Firebase) or a sign-in link to their email (via Firebase).
   * @returns The sessionInfo (Firebase mobile) or "email_sent" (Firebase email)
   */
  async sendOtp(identifier: string, method: "email" | "mobile"): Promise<string> {
    try {
      if (method === "email") {
        // Use Firebase Email Link authentication
        await firebaseAuthService.sendEmailLink(identifier);
        return "email_sent";
      }

      // Call Firebase to send SMS
      return await firebaseAuthService.sendOtp(identifier);
    } catch (error: any) {
      console.error(`Failed to send ${method} auth:`, error);
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || "Failed to send verification", 500, "AUTH_SEND_FAILURE");
    }
  },

  /**
   * Verifies the OTP with either Firebase (mobile) or Backend (email).
   */
  async verifyOtp(sessionInfo: string, otp: string): Promise<LoginResponse["user"]> {
    try {
      let loginData: LoginResponse;

      if (sessionInfo.includes("@")) {
        const raw = await apiClient.post<unknown>("/api/auth/otp/verify", {
          identifier: sessionInfo,
          otp,
        });
        loginData = normalizeLoginPayload(raw);
      } else {
        const firebaseResult = await firebaseAuthService.verifyOtp(sessionInfo, otp);
        const raw = await apiClient.post<unknown>("/api/auth/login", {
          firebaseToken: firebaseResult.firebaseToken,
        });
        loginData = normalizeLoginPayload(raw);
      }

      // 3. Store tokens securely
      await Promise.all([
        tokenStorage.saveAccessToken(loginData.accessToken),
        tokenStorage.saveRefreshToken(loginData.refreshToken),
      ]);

      // 4. Update apiClient
      apiClient.setAccessToken(loginData.accessToken);

      return loginData.user;
    } catch (error: any) {
      console.error("OTP verification failed:", error);
      if (error instanceof AppError) {
        if (error.statusCode === 400) {
          throw new AppError("The verification code is invalid or has expired", 400, "INVALID_OTP");
        }
        throw error;
      }
      throw new AppError(error.message || "Verification failed. Please try again.", 500, "OTP_VERIFY_FAILURE");
    }
  }
};
