import { Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { getGoogleOAuthClientIds } from "../../config/googleOAuth";

/**
 * Web client ID for Firebase + Google Sign-In.
 * Prefer EXPO_PUBLIC_* (inlined by Metro); fallback to app.config `extra` / google-services defaults.
 */
function resolveWebClientId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  return getGoogleOAuthClientIds().webClientId?.trim();
}

export type GoogleSignInResult =
  | { type: "success"; params: { id_token: string; access_token?: string } }
  | { type: "cancel" };

export function configureGoogleSignIn(): void {
  if (Platform.OS === "web") return;

  const webClientId = resolveWebClientId();
  if (!webClientId) return;

  GoogleSignin.configure({
    webClientId,
  });
}

/**
 * Native login path (no expo-auth-session / WebBrowser / redirect URIs):
 * configure → hasPlayServices → signIn → ID token → Firebase + backend (see AuthContext / authService).
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (Platform.OS === "web") {
    return { type: "cancel" };
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;
    if (!idToken) {
      throw new Error("Google Sign-In did not return an ID token.");
    }
    return {
      type: "success",
      params: {
        id_token: idToken,
        access_token: tokens.accessToken,
      },
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return { type: "cancel" };
    }
    throw err;
  }
}

export async function signOutGoogle(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
}
