import { AppError } from "../services/api/apiErrors";
import { isRetryableColdStartError } from "../services/auth/authLoginRequest";

export type LoginFailurePresentation = {
  title: string;
  message: string;
  /** Show a primary “Try again” action on the login screen. */
  canRetry: boolean;
};

/**
 * Maps errors from the Google → Firebase → backend login chain into clear titles and copy.
 */
export function formatLoginFailure(err: unknown): LoginFailurePresentation {
  const canRetry = isRetryableColdStartError(err);

  if (err instanceof AppError) {
    if (err.code.startsWith("FIREBASE_") || err.code === "FIREBASE_AUTH") {
      return {
        title: "Sign-in with Google",
        message: err.message,
        canRetry: false,
      };
    }

    if (err.code === "GOOGLE_SIGN_IN_NETWORK") {
      return {
        title: "Can't reach Google",
        message:
          "Google Play Services couldn't connect. If you're on an emulator, reload the app — we switch to browser sign-in automatically. On a real device, check Wi‑Fi and try again.",
        canRetry: true,
      };
    }

    if (err.code === "GOOGLE_SIGN_IN_CONFIG") {
      return {
        title: "Google Sign-In setup",
        message: err.message,
        canRetry: false,
      };
    }

    if (err.code === "GOOGLE_SIGN_IN_FAILED") {
      return {
        title: "Google Sign-In failed",
        message: err.message,
        canRetry: true,
      };
    }

    if (err.code === "NETWORK_FAILURE") {
      return {
        title: "Can't reach the server",
        message:
          "We couldn't connect to Shot Vision. Check your internet connection. If the app was idle for a while, the server may still be waking up — try again.",
        canRetry: true,
      };
    }

    if (err.code === "TIMEOUT") {
      return {
        title: "Server is waking up",
        message:
          "Shot Vision's backend can take up to a minute to start after inactivity. We tried a few times — tap Continue with Google to try again.",
        canRetry: true,
      };
    }

    if (err.code === "INVALID_RESPONSE") {
      return {
        title: "Server still starting",
        message:
          "The server didn't respond normally yet. This often happens during a cold start — wait a moment and try again.",
        canRetry: true,
      };
    }

    if (err.code === "LOGIN_FAILURE") {
      return {
        title: "Couldn't finish signing in",
        message:
          "Google sign-in worked, but Shot Vision's server didn't respond in time. It may still be starting — please try again.",
        canRetry: true,
      };
    }

    if (err.statusCode > 0 && err.statusCode < 500) {
      return {
        title: "Can't sign you in",
        message: err.message,
        canRetry: false,
      };
    }

    if (err.statusCode >= 500 || err.code === "API_ERROR") {
      return {
        title: "Service unavailable",
        message:
          "Shot Vision's server isn't ready yet. This is common after idle periods on the test environment — try again in a moment.",
        canRetry: true,
      };
    }

    if (err.code === "UNKNOWN_ERROR") {
      return { title: "Login failed", message: err.message, canRetry: canRetry };
    }

    return { title: "Login failed", message: err.message, canRetry: canRetry };
  }

  if (err instanceof Error) {
    return { title: "Login failed", message: err.message, canRetry: false };
  }

  return {
    title: "Login failed",
    message: "Something went wrong. Please try again.",
    canRetry: true,
  };
}

