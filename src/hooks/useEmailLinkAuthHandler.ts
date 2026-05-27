import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { urlLooksLikeEmailSignInLink } from "../config/emailLinkAuth";
import { useAuthStore } from "../stores/authStore";
import { devLog } from "../utils/devLog";

/**
 * Listens for Firebase Email Link deep links and completes sign-in via authStore.
 * Mount once inside AuthProvider.
 */
export function useEmailLinkAuthHandler(isHydrated: boolean): void {
  const completeEmailLinkSignIn = useAuthStore((s) => s.completeEmailLinkSignIn);
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const handlingRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || isAuthenticated) return;

    const handleUrl = async (rawUrl: string | null) => {
      const url = rawUrl?.trim();
      if (!url || !urlLooksLikeEmailSignInLink(url)) return;
      if (handlingRef.current || isAuthenticating) return;

      handlingRef.current = true;
      devLog.info("[email-link] deep link received");
      try {
        await completeEmailLinkSignIn(url);
      } catch (error) {
        devLog.error("[email-link] completion failed:", error);
      } finally {
        handlingRef.current = false;
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [isHydrated, isAuthenticated, isAuthenticating, completeEmailLinkSignIn]);
}
