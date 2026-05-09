import Constants from "expo-constants";

/**
 * Google OAuth client IDs for `@react-native-google-signin/google-signin` + Firebase.
 * Configure via app.config.js `extra` or EXPO_PUBLIC_* env vars (Firebase Console → Project settings → Your apps).
 */
export type GoogleOAuthClientIds = {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

export function getGoogleOAuthClientIds(): GoogleOAuthClientIds {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return {
    webClientId:
      extra?.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? undefined,
    iosClientId:
      extra?.googleIosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? undefined,
    androidClientId:
      extra?.googleAndroidClientId ??
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
      undefined,
  };
}

/** Native Google Sign-In + Firebase need the Web client ID (`webClientId`). */
export function isGoogleOAuthConfigured(): boolean {
  const { webClientId } = getGoogleOAuthClientIds();
  return Boolean(webClientId?.trim());
}
