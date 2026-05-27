/** Scopes Google expects for OIDC + profile (avoids shorthand-only issues on some OAuth paths). */
export const GOOGLE_BROWSER_OAUTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
