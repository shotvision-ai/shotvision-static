import * as Linking from "expo-linking";
import type { ActionCodeSettings } from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";

/**
 * HTTPS continue URL for Firebase Email Link (must be on an Authorized domain in Firebase Console).
 * The native app receives this via Android intent filters / iOS associated domains.
 */
export const EMAIL_LINK_CONTINUE_URL =
  process.env.EXPO_PUBLIC_EMAIL_LINK_CONTINUE_URL ??
  `https://${firebaseConfig.authDomain}/auth/email-link`;

/** In-app route opened after the link is handled (Expo scheme). */
export function getEmailLinkAppPath(): string {
  return Linking.createURL("auth/email-link");
}

export function buildEmailLinkActionCodeSettings(): ActionCodeSettings {
  return {
    url: EMAIL_LINK_CONTINUE_URL,
    handleCodeInApp: true,
    iOS: {
      bundleId: "com.shotvision.app",
    },
    android: {
      packageName: "com.shotvision.app",
      installApp: true,
      minimumVersion: "12",
    },
  };
}

/** True when the URL looks like a Firebase email sign-in link. */
export function urlLooksLikeEmailSignInLink(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  return (
    u.includes("oobCode=") ||
    u.includes("mode=signIn") ||
    u.includes("/__/auth/action") ||
    u.includes("/auth/email-link")
  );
}
