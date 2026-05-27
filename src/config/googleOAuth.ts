import Constants from "expo-constants";
import * as Application from "expo-application";
import { Platform } from "react-native";

/**
 * Google OAuth client IDs for `@react-native-google-signin/google-signin` + Firebase.
 * Configure via app.config.js `extra` or EXPO_PUBLIC_* env vars (Firebase Console → Project settings → Your apps).
 */
export type GoogleOAuthClientIds = {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

type GoogleServicesOauthEntry = {
  client_type: number;
  client_id: string;
  android_info?: { package_name: string };
};

type GoogleServicesDoc = {
  client?: Array<{
    oauth_client?: GoogleServicesOauthEntry[];
    client_info?: { android_client_info?: { package_name: string } };
  }>;
};

/**
 * Reads Android OAuth client IDs (type 1) from bundled `google-services.json` when `extra` / env
 * did not embed them (fixes browser OAuth using Web client + custom redirect → Google 400 invalid_request).
 */
function readBundledAndroidOAuthClientIdsForPackage(packageName: string | undefined): string[] {
  if (!packageName) return [];
  try {
    // Metro bundles root `google-services.json` when present.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const doc = require("../../google-services.json") as GoogleServicesDoc;
    const out: string[] = [];
    for (const c of doc.client ?? []) {
      if (c.client_info?.android_client_info?.package_name !== packageName) continue;
      for (const oc of c.oauth_client ?? []) {
        if (oc.client_type === 1 && typeof oc.client_id === "string") {
          out.push(oc.client_id);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function getGoogleOAuthClientIds(): GoogleOAuthClientIds {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const webClientId =
    extra?.googleWebClientId?.trim() || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId =
    extra?.googleIosClientId?.trim() || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  let androidClientId =
    extra?.googleAndroidClientId?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();

  if (Platform.OS === "android") {
    const bundled = readBundledAndroidOAuthClientIdsForPackage(
      Application.applicationId ?? undefined
    );
    // If env/extra is missing OR points at an unknown client id, prefer the bundled Android client.
    // This prevents Google 400 invalid_request when a stale EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID is set.
    const hasBundled = bundled.length > 0;
    const androidLooksValid =
      !androidClientId || !hasBundled ? Boolean(androidClientId) : bundled.includes(androidClientId);
    if ((!androidClientId || !androidLooksValid) && hasBundled) {
      // Match app.config.js: last Android client in file.
      // google-services.json order: unknown-env, debug, release — last = release client.
      androidClientId = bundled[bundled.length - 1];
    }
  }

  return {
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
  };
}

/** Native Google Sign-In + Firebase need the Web client ID (`webClientId`). */
export function isGoogleOAuthConfigured(): boolean {
  const { webClientId } = getGoogleOAuthClientIds();
  return Boolean(webClientId?.trim());
}
