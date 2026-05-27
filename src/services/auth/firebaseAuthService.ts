import {
  GoogleAuthProvider,
  signInWithCredential,
  User,
  PhoneAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "../../config/firebase";
import { buildEmailLinkActionCodeSettings } from "../../config/emailLinkAuth";
import { isFirebaseAuthLikeError, toFirebaseAuthAppError } from "./firebaseAuthErrors";
import { devLog } from "../../utils/devLog";
import { AppError } from "../api/apiErrors";

export interface FirebaseAuthResult {
  firebaseToken: string;
  user: User;
}

/**
 * firebaseAuthService handles Firebase authentication using Google Sign-In, Phone Auth, and Email Link.
 */
export const firebaseAuthService = {
  /**
   * Sends an OTP to the provided phone number using Firebase REST API.
   */
  async sendOtp(phoneNumber: string): Promise<string> {
    try {
      const apiKey = (auth.app as any).options.apiKey;
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to send SMS via Firebase");
      }

      return data.sessionInfo;
    } catch (error) {
      devLog.error("[firebase] sendOtp failed:", error);
      throw error;
    }
  },

  /**
   * Sends a passwordless sign-in link (Firebase Email Link Authentication).
   */
  async sendEmailLink(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      throw new AppError("Enter a valid email address.", 400, "INVALID_EMAIL");
    }
    try {
      const actionCodeSettings = buildEmailLinkActionCodeSettings();
      devLog.info("[firebase] sendEmailLink", {
        email: normalized.replace(/(.{2}).+(@.+)/, "$1***$2"),
        continueUrl: actionCodeSettings.url,
      });
      await sendSignInLinkToEmail(auth, normalized, actionCodeSettings);
    } catch (error) {
      devLog.error("[firebase] sendEmailLink failed:", error);
      if (isFirebaseAuthLikeError(error)) {
        throw toFirebaseAuthAppError(error);
      }
      throw error;
    }
  },

  /**
   * Completes Firebase sign-in from the link in the user's email.
   */
  async signInWithEmailLink(email: string, emailLink: string): Promise<FirebaseAuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const link = emailLink.trim();
    if (!normalizedEmail || !link) {
      throw new AppError("Missing email or sign-in link.", 400, "INVALID_EMAIL_LINK");
    }
    try {
      if (!isSignInWithEmailLink(auth, link)) {
        throw new AppError(
          "This sign-in link is invalid or has expired. Request a new link from the login screen.",
          400,
          "INVALID_EMAIL_LINK"
        );
      }
      const userCredential = await signInWithEmailLink(auth, normalizedEmail, link);
      const firebaseToken = await userCredential.user.getIdToken();
      devLog.info("[firebase] email link sign-in ok", {
        uid: userCredential.user.uid,
      });
      return {
        firebaseToken,
        user: userCredential.user,
      };
    } catch (error) {
      devLog.error("[firebase] signInWithEmailLink failed:", error);
      if (error instanceof AppError) throw error;
      if (isFirebaseAuthLikeError(error)) {
        throw toFirebaseAuthAppError(error);
      }
      throw error;
    }
  },

  /**
   * Verifies the OTP code with Firebase and returns the user.
   */
  async verifyOtp(sessionInfo: string, code: string): Promise<FirebaseAuthResult> {
    try {
      const apiKey = (auth.app as any).options.apiKey;
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionInfo, code }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.message === "INVALID_CODE") {
          throw new Error("The verification code is invalid or has expired");
        }
        throw new Error(data.error?.message || "Failed to verify SMS via Firebase");
      }

      const credential = PhoneAuthProvider.credential(sessionInfo, code);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseToken = await userCredential.user.getIdToken();

      return {
        firebaseToken,
        user: userCredential.user,
      };
    } catch (error) {
      devLog.error("[firebase] verifyOtp failed:", error);
      throw error;
    }
  },

  /**
   * Firebase step after native Google Sign-In: `GoogleAuthProvider.credential(idToken)` →
   * `signInWithCredential` → Firebase ID token for `/api/auth/login`.
   */
  async signInWithGoogleIdToken(idToken: string): Promise<FirebaseAuthResult> {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseToken = await userCredential.user.getIdToken();
      // Dev-only: full JWT never reaches production logs (prevents token leakage in release builds).
      devLog.info(
        "\n[FIREBASE JWT / ID TOKEN]\n" + firebaseToken + "\n[/FIREBASE JWT]\n"
      );
      return {
        firebaseToken,
        user: userCredential.user,
      };
    } catch (error: unknown) {
      if (isFirebaseAuthLikeError(error)) {
        throw toFirebaseAuthAppError(error);
      }
      throw error;
    }
  },

  /**
   * Handles the `{ type, params }` object from `signInWithGoogle()`.
   */
  async handleGoogleLoginResponse(response: any): Promise<FirebaseAuthResult | null> {
    try {
      if (response?.type === "success") {
        const params = response.params ?? {};
        const idToken = typeof params.id_token === "string" ? params.id_token : undefined;

        if (!idToken) {
          throw new Error(
            "Google sign-in did not return an ID token. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the native app."
          );
        }

        return await firebaseAuthService.signInWithGoogleIdToken(idToken);
      } else if (response?.type === "cancel") {
        devLog.info("[firebase] Google login cancelled");
        return null;
      } else if (response?.type === "error") {
        devLog.error("[firebase] Google login error:", response.error);
        throw new Error(response.error?.message || "Google Login failed");
      }
      
      return null;
    } catch (error) {
      devLog.error("[firebase] Google login failed:", error);
      throw error;
    }
  },

  /**
   * Gets the current user's ID token if they are logged in.
   */
  async getCurrentIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  },

  /**
   * Signs out from Firebase.
   */
  async signOut(): Promise<void> {
    try {
      await auth.signOut();
    } catch (error) {
      devLog.error("[firebase] signOut failed:", error);
      throw error;
    }
  }
};
