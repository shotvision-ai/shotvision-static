import { AppError } from "../api/apiErrors";

/** Android GMS SignInStatusCode.NETWORK_ERROR (7) — often transient on emulators. */
export function isGooglePlaySignInNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    const s = String(err);
    return /NETWORK_ERROR|ApiException:\s*7\b/i.test(s);
  }
  const msg = err.message;
  const code = (err as { code?: string }).code;
  return (
    code === "NETWORK_ERROR" ||
    /NETWORK_ERROR/i.test(msg) ||
    /ApiException:\s*7\b/i.test(msg)
  );
}

export function isGooglePlayDeveloperError(err: unknown): boolean {
  if (!(err instanceof Error)) return /DEVELOPER_ERROR|ApiException:\s*10\b/i.test(String(err));
  return (
    (err as { code?: string }).code === "DEVELOPER_ERROR" ||
    /DEVELOPER_ERROR/i.test(err.message) ||
    /ApiException:\s*10\b/i.test(err.message)
  );
}

export function toGoogleSignInAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (isGooglePlaySignInNetworkError(err)) {
    return new AppError(
      "Google Sign-In couldn't reach Google's servers. On an emulator, use an image with Google Play, sign into a Google account in Settings, and check Wi‑Fi. Then try again.",
      0,
      "GOOGLE_SIGN_IN_NETWORK"
    );
  }

  if (isGooglePlayDeveloperError(err)) {
    return new AppError(
      "Google Sign-In isn't configured for this build. Add your debug/release SHA-1 in Firebase, download an updated google-services.json, and rebuild the native app.",
      0,
      "GOOGLE_SIGN_IN_CONFIG"
    );
  }

  const message = err instanceof Error ? err.message : "Google Sign-In failed.";
  if (/invalid_request|Access blocked.*invalid/i.test(message)) {
    return new AppError(
      "Google rejected the sign-in request, usually because the Web OAuth client was paired with a custom app redirect. Rebuild after setting the Android OAuth client from Firebase, or set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to the Android (not Web) client ID.",
      0,
      "GOOGLE_SIGN_IN_CONFIG"
    );
  }
  if (/redirect_uri_mismatch|redirect_mismatch|invalid_grant/i.test(message)) {
    return new AppError(
      "Google browser sign-in redirect mismatch. Confirm EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID matches your debug keystore in Firebase, then rebuild the app.",
      0,
      "GOOGLE_SIGN_IN_CONFIG"
    );
  }
  return new AppError(message, 0, "GOOGLE_SIGN_IN_FAILED");
}
