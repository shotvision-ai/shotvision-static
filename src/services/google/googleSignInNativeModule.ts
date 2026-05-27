import Constants from "expo-constants";
import { Platform } from "react-native";

type GoogleSignInPkg = typeof import("@react-native-google-signin/google-signin");

let cached: GoogleSignInPkg | null | undefined;

/** Native `@react-native-google-signin/google-signin` (not available in Expo Go). */
export function getGoogleSignInNative(): GoogleSignInPkg | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === "web" || Constants.appOwnership === "expo") {
    cached = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("@react-native-google-signin/google-signin") as GoogleSignInPkg;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function isNativeGoogleSignInAvailable(): boolean {
  return getGoogleSignInNative() != null;
}
