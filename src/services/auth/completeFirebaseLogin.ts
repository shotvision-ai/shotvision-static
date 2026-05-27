import { authSession } from "./authSession";
import { postAuthLoginWithRetry, type AuthLoginAttemptListener } from "./authLoginRequest";
import { normalizeLoginPayload, type LoginResponse } from "./loginPayload";
import { apiClient } from "../api/apiClient";

const syncAccessToken = (token: string | null) => apiClient.setAccessToken(token);

/**
 * Exchange a Firebase ID token for Shot Vision JWTs (shared by Google + Email Link).
 */
export async function persistLoginFromFirebaseToken(
  firebaseToken: string,
  options?: { onBackendAttempt?: AuthLoginAttemptListener }
): Promise<LoginResponse["user"]> {
  const rawLogin = await postAuthLoginWithRetry(
    { firebaseToken },
    options?.onBackendAttempt
  );
  const loginData = normalizeLoginPayload(rawLogin);

  await authSession.persistSession(
    {
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      expiresIn: loginData.expiresIn,
    },
    syncAccessToken
  );

  return loginData.user;
}
