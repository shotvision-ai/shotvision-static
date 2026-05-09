import { AppError } from "../services/api/apiErrors";

/**
 * Maps errors from the Google → Firebase → backend login chain into clear titles and copy.
 */
export function formatLoginFailure(err: unknown): { title: string; message: string } {
  if (err instanceof AppError) {
    if (err.code.startsWith("FIREBASE_") || err.code === "FIREBASE_AUTH") {
      return {
        title: "Sign-in with Google",
        message: err.message,
      };
    }

    if (err.code === "NETWORK_FAILURE" || err.code === "TIMEOUT") {
      return {
        title: "Check your connection",
        message: err.message,
      };
    }

    if (err.code === "INVALID_RESPONSE") {
      return {
        title: "Can't finish signing in",
        message:
          "Something went wrong while connecting to Shot Vision. Please wait a few minutes and try again.",
      };
    }

    if (err.statusCode > 0 && err.statusCode < 500) {
      return {
        title: "Can't sign you in",
        message: err.message,
      };
    }

    if (err.statusCode >= 500 || err.code === "API_ERROR") {
      return {
        title: "Service unavailable",
        message: err.message,
      };
    }

    if (err.code === "UNKNOWN_ERROR") {
      return { title: "Login failed", message: err.message };
    }

    return { title: "Login failed", message: err.message };
  }

  if (err instanceof Error) {
    return { title: "Login failed", message: err.message };
  }

  return {
    title: "Login failed",
    message: "Something went wrong. Please try again.",
  };
}
