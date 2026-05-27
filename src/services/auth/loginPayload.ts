import { coalesceProfileImageUrl } from "../../utils/profileImageUrl";
import { AppError } from "../api/apiErrors";

/** Backend login envelope after `body.data` unwrap (ShotVision JWTs only — not Firebase). */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
}

/**
 * Maps backend login JSON (camelCase or snake_case) to `LoginResponse`.
 * Only ShotVision **accessToken** / **refreshToken** are stored for `Authorization: Bearer` —
 * never the Firebase ID token (that is only sent in `firebaseToken` on POST /api/auth/login).
 */
export function normalizeLoginPayload(raw: unknown): LoginResponse {
  if (raw == null || typeof raw !== "object") {
    throw new AppError("Invalid login response from server", 502, "INVALID_LOGIN_PAYLOAD");
  }
  const r = raw as Record<string, unknown>;
  const accessToken = String(r.accessToken ?? r.access_token ?? "").trim();
  const refreshToken = String(r.refreshToken ?? r.refresh_token ?? "").trim();
  if (!accessToken || !refreshToken) {
    throw new AppError("Login response missing access or refresh token", 502, "INVALID_LOGIN_PAYLOAD");
  }

  const userRaw = r.user ?? r.profile ?? r.userProfile;
  let user: LoginResponse["user"];
  if (userRaw && typeof userRaw === "object") {
    const u = userRaw as Record<string, unknown>;
    user = {
      id: String(u.userId ?? u.id ?? ""),
      email: String(u.email ?? ""),
      name: String(u.name ?? u.displayName ?? ""),
      image: coalesceProfileImageUrl(
        typeof u.profileImage === "string" ? u.profileImage : undefined,
        typeof u.image === "string" ? u.image : undefined,
        typeof u.photoURL === "string" ? u.photoURL : undefined,
        typeof u.picture === "string" ? u.picture : undefined
      ),
    };
  } else {
    user = { id: "", email: "", name: "" };
  }

  const expiresInRaw = r.expiresIn ?? r.expires_in;
  const expiresIn =
    typeof expiresInRaw === "number" && !Number.isNaN(expiresInRaw) ? expiresInRaw : undefined;

  return { accessToken, refreshToken, expiresIn, user };
}
