import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { getGoogleOAuthClientIds } from "../../config/googleOAuth";
import { devLog } from "../../utils/devLog";
import { AppError } from "../api/apiErrors";
import {
  isGooglePlaySignInNetworkError,
  toGoogleSignInAppError,
} from "./googleSignInErrors";
import {
  getGoogleSignInNative,
  isNativeGoogleSignInAvailable,
} from "./googleSignInNativeModule";
import type { GoogleSignInResult } from "./googleSignInTypes";
import { signInWithGoogleBrowser } from "./signInWithGoogleBrowser";

export type { GoogleSignInResult } from "./googleSignInTypes";

/**
 * Web client ID for Firebase + Google Sign-In (OAuth client type Web in Firebase Console).
 * Prefer EXPO_PUBLIC_* (inlined by Metro); fallback to app.config `extra` / google-services defaults.
 */
function resolveWebClientId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  return getGoogleOAuthClientIds().webClientId?.trim();
}

const GOOGLE_SIGN_IN_RETRY_MS = [0, 2_000, 4_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prefer in-app browser OAuth on Android emulators (GMS often returns NETWORK_ERROR).
 * iOS simulator only if an iOS OAuth client is configured.
 */
export function shouldPreferBrowserGoogleSignIn(): boolean {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) {
    if (Platform.OS === "android") return true;
    if (Platform.OS === "ios") {
      return Boolean(getGoogleOAuthClientIds().iosClientId?.trim());
    }
  }
  return false;
}

export function configureGoogleSignIn(): void {
  if (Platform.OS === "web") return;

  const native = getGoogleSignInNative();
  if (!native) return;

  const webClientId = resolveWebClientId();
  if (!webClientId) return;

  native.GoogleSignin.configure({
    webClientId,
    scopes: ["email", "profile"],
    offlineAccess: false,
  });
}

function idTokenFromSignInResponse(
  data: { idToken?: string | null } | null | undefined
): string | undefined {
  const token = data?.idToken?.trim();
  return token || undefined;
}

async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  const native = getGoogleSignInNative();
  if (!native) {
    throw new AppError(
      "Google Sign-In requires the ShotVision development build. In the Metro terminal press `s` to switch off Expo Go, or run `npx expo run:android`.",
      0,
      "GOOGLE_SIGN_IN_CONFIG"
    );
  }

  const { GoogleSignin, statusCodes } = native;

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    await GoogleSignin.signOut();
  } catch {
    // clear stale GMS session before a new attempt
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < GOOGLE_SIGN_IN_RETRY_MS.length; attempt++) {
    if (GOOGLE_SIGN_IN_RETRY_MS[attempt] > 0) {
      await sleep(GOOGLE_SIGN_IN_RETRY_MS[attempt]);
    }

    try {
      const response = await GoogleSignin.signIn();

      if (response.type === "cancelled") {
        return { type: "cancel" };
      }

      let idToken = idTokenFromSignInResponse(response.data);
      let accessToken: string | undefined;

      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken?.trim() || undefined;
        accessToken = tokens.accessToken?.trim() || undefined;
      }

      if (!idToken) {
        throw new Error("Google Sign-In did not return an ID token.");
      }

      return {
        type: "success",
        params: {
          id_token: idToken,
          access_token: accessToken,
        },
      };
    } catch (err: unknown) {
      lastError = err;
      const code = (err as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return { type: "cancel" };
      }
      if (code === statusCodes.IN_PROGRESS) {
        throw toGoogleSignInAppError(err);
      }
      if (isGooglePlaySignInNetworkError(err) && attempt < GOOGLE_SIGN_IN_RETRY_MS.length - 1) {
        devLog.warn(
          `[google] signIn NETWORK_ERROR, retry ${attempt + 2}/${GOOGLE_SIGN_IN_RETRY_MS.length}`
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Google sign-in: native Play Services on device; browser OAuth on emulator (and as fallback).
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (Platform.OS === "web") {
    return { type: "cancel" };
  }

  if (Constants.appOwnership === "expo") {
    throw new AppError(
      "Google Sign-In is not supported in Expo Go. Open ShotVision from the development build (run `npx expo run:android`, then press `s` in Metro if it says Expo Go).",
      0,
      "GOOGLE_SIGN_IN_CONFIG"
    );
  }

  if (shouldPreferBrowserGoogleSignIn() || !isNativeGoogleSignInAvailable()) {
    devLog.info("[google] Using browser OAuth (emulator/simulator)");
    return signInWithGoogleBrowser();
  }

  try {
    return await signInWithGoogleNative();
  } catch (err: unknown) {
    const appErr = toGoogleSignInAppError(err);
    if (appErr.code === "GOOGLE_SIGN_IN_NETWORK") {
      devLog.warn("[google] Native NETWORK_ERROR — falling back to browser OAuth");
      try {
        return await signInWithGoogleBrowser();
      } catch (browserErr) {
        throw toGoogleSignInAppError(browserErr);
      }
    }
    throw appErr;
  }
}

export async function signOutGoogle(options?: { revokeAccess?: boolean }): Promise<void> {
  if (Platform.OS === "web") return;

  const native = getGoogleSignInNative();
  if (!native) return;

  const { GoogleSignin } = native;

  try {
    if (options?.revokeAccess) {
      const revoke = (GoogleSignin as { revokeAccess?: () => Promise<unknown> }).revokeAccess;
      if (typeof revoke === "function") {
        try {
          await revoke.call(GoogleSignin);
        } catch {
          // optional
        }
      }
    }
    await GoogleSignin.signOut();
  } catch (error) {
    devLog.warn("[google] signOut failed:", error);
  }
}
