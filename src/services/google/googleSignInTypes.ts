export type GoogleSignInResult =
  | { type: "success"; params: { id_token: string; access_token?: string } }
  | { type: "cancel" };
