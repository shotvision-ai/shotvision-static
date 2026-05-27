import * as Application from "expo-application";
import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";
import { AppError } from "../api/apiErrors";
import { getGoogleOAuthClientIds } from "../../config/googleOAuth";

/** Google Android installed-app redirect (allowed for Android OAuth clients). */
export function androidReverseRedirectUri(androidClientId: string): string {
  const idPart = androidClientId.replace(/\.apps\.googleusercontent\.com$/i, "");
  return `com.googleusercontent.apps.${idPart}:/oauthredirect`;
}

/**
 * Resolves OAuth `client_id` + `redirect_uri` for in-app browser (Custom Tabs) sign-in.
 *
 * Important: **Web** OAuth clients cannot use custom URI redirects — that yields Google
 * `400 invalid_request`. On Android we must use the **Android** client from Firebase + reverse scheme.
 */
export function resolveGoogleBrowserOAuth(): { clientId: string; redirectUri: string } {
  const ids = getGoogleOAuthClientIds();
  const webId = ids.webClientId?.trim();

  if (Platform.OS === "android") {
    const androidId = ids.androidClientId?.trim();
    if (!androidId) {
      throw new AppError(
        "Google browser sign-in is missing the Android OAuth client ID. Add SHA-1 in Firebase, ensure google-services.json is in the project root, rebuild the app, or set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.",
        0,
        "GOOGLE_SIGN_IN_CONFIG"
      );
    }
    if (webId && androidId === webId) {
      throw new AppError(
        "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID must be the Android client from Firebase (type Android), not the Web client ID.",
        0,
        "GOOGLE_SIGN_IN_CONFIG"
      );
    }
    // Android OAuth clients require the reverse-client-ID scheme for the redirect URI.
    // Using the app package ID (com.shotvision.app:/) causes Google Error 400 invalid_request
    // because that scheme is not registered as an allowed redirect for type-1 Android clients.
    return {
      clientId: androidId,
      redirectUri: AuthSession.makeRedirectUri({
        native: androidReverseRedirectUri(androidId),
      }),
    };
  }

  if (Platform.OS === "ios") {
    const iosId = ids.iosClientId?.trim();
    if (!iosId) {
      throw new AppError(
        "Google browser sign-in on iOS needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (iOS OAuth client from Firebase / Google Cloud).",
        0,
        "GOOGLE_SIGN_IN_CONFIG"
      );
    }
    const appId = Application.applicationId;
    if (!appId) {
      throw new AppError("Could not read the app bundle identifier for Google sign-in.", 0, "GOOGLE_SIGN_IN_CONFIG");
    }
    return {
      clientId: iosId,
      redirectUri: AuthSession.makeRedirectUri({ native: `${appId}:/oauthredirect` }),
    };
  }

  throw new AppError("Google browser sign-in is not supported on this platform.", 0, "GOOGLE_SIGN_IN_FAILED");
}
