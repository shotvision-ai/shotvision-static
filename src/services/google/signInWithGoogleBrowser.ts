import * as AuthSession from "expo-auth-session";
import { AccessTokenRequest } from "expo-auth-session";
import { discovery } from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { devLog } from "../../utils/devLog";
import { GOOGLE_BROWSER_OAUTH_SCOPES } from "./googleBrowserOAuthScopes";
import type { GoogleSignInResult } from "./googleSignInTypes";
import { resolveGoogleBrowserOAuth } from "./resolveGoogleBrowserOAuth";

WebBrowser.maybeCompleteAuthSession();

/**
 * Browser-based Google OAuth (Chrome Custom Tab). Reliable on emulators where Play Services
 * often returns ApiException NETWORK_ERROR for the native SDK.
 */
export async function signInWithGoogleBrowser(): Promise<GoogleSignInResult> {
  const { clientId, redirectUri } = resolveGoogleBrowserOAuth();

  devLog.info("[google] browser OAuth", { redirectUri, clientId: `${clientId.slice(0, 12)}…` });

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: [...GOOGLE_BROWSER_OAUTH_SCOPES],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { prompt: "select_account" },
  });

  const result = await request.promptAsync(discovery, {
    showInRecents: true,
  });

  if (result.type === "cancel" || result.type === "dismiss") {
    return { type: "cancel" };
  }

  if (result.type !== "success" || !result.params.code) {
    throw new Error("Google sign-in did not complete. Please try again.");
  }

  const tokenResponse = await new AccessTokenRequest({
    clientId,
    redirectUri,
    scopes: [...GOOGLE_BROWSER_OAUTH_SCOPES],
    code: result.params.code,
    extraParams: { code_verifier: request.codeVerifier ?? "" },
  }).performAsync(discovery);

  const idToken = tokenResponse.idToken?.trim();
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  return {
    type: "success",
    params: {
      id_token: idToken,
      access_token: tokenResponse.accessToken,
    },
  };
}
