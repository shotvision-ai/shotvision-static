import { AppError } from "../api/apiErrors";

/** Map Firebase Auth errors to user-facing copy + stable code for UI. */
export function toFirebaseAuthAppError(error: unknown): AppError {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  const rawMessage =
    error instanceof Error ? error.message : "Firebase authentication failed.";

  const messages: Record<string, string> = {
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using a different sign-in method.",
    "auth/invalid-credential": "Google sign-in could not be verified. Try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No user found for this Google account.",
    "auth/network-request-failed":
      "Firebase could not reach Google’s servers. Check your internet connection and try again.",
    "auth/internal-error": "Firebase encountered an internal error. Try again shortly.",
    "auth/web-storage-unsupported": "This device blocked secure storage needed for sign-in.",
  };

  const message =
    code && messages[code] ? messages[code] : rawMessage.length > 0 ? rawMessage : "Firebase sign-in failed.";

  return new AppError(message, 401, code ? `FIREBASE_${code.replace(/\//g, "_")}` : "FIREBASE_AUTH");
}

export function isFirebaseAuthLikeError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  return code.startsWith("auth/");
}
