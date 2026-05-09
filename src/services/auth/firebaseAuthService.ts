import {
  GoogleAuthProvider,
  signInWithCredential,
  User,
  PhoneAuthProvider,
  sendSignInLinkToEmail,
} from "firebase/auth";
import { auth } from "../../config/firebase";
import { isFirebaseAuthLikeError, toFirebaseAuthAppError } from "./firebaseAuthErrors";

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
      console.error("Firebase sendOtp error:", error);
      throw error;
    }
  },

  /**
   * Sends a sign-in link to the provided email address.
   */
  async sendEmailLink(email: string): Promise<void> {
    try {
      const actionCodeSettings = {
        // This URL must be whitelisted in the Firebase Console (Authentication > Settings > Authorized domains)
        url: "https://shotvision-c677b.firebaseapp.com/finishSignUp",
        handleCodeInApp: true,
        iOS: {
          bundleId: "com.shotvision.app",
        },
        android: {
          packageName: "com.shotvision.app",
          installApp: true,
          minimumVersion: "12",
        },
        dynamicLinkDomain: "shotvision.page.link",
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    } catch (error) {
      console.error("Firebase sendEmailLink error:", error);
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
      console.error("Firebase verifyOtp error:", error);
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
      if (__DEV__) {
        // Copy from Metro terminal after Google SSO — same JWT sent as `firebaseToken` to POST /api/auth/login
        console.log(
          "\n[FIREBASE JWT / ID TOKEN]\n" + firebaseToken + "\n[/FIREBASE JWT]\n"
        );
      }
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
        console.log("Google Login cancelled by user");
        return null;
      } else if (response?.type === "error") {
        console.error("Google Login error:", response.error);
        throw new Error(response.error?.message || "Google Login failed");
      }
      
      return null;
    } catch (error) {
      console.error("Error during Firebase Google Login:", error);
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
      console.error("Error during sign out:", error);
      throw error;
    }
  }
};
