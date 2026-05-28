import type { UserProfile } from "../services/api/profileService";
import type { UpdateUserProfileRequest } from "../services/api/contracts/user.types";
import { coalesceProfileImageUrl } from "./profileImageUrl";

/** Non-empty trimmed string, or undefined when absent/blank. */
export function coerceProfileText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readProfileId(r: Record<string, unknown>, existing?: UserProfile): string {
  return String(r.userId ?? r.id ?? existing?.id ?? "").trim();
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function apiRowHasImageField(r: Record<string, unknown>): boolean {
  return (
    "profileImage" in r ||
    "image" in r ||
    "photoUrl" in r ||
    "photoURL" in r ||
    "picture" in r
  );
}

/**
 * Merge GET `/api/users/me` (or PATCH body) into the session user.
 * Keys omitted from the API payload keep existing session values.
 * Explicit `null` clears optional text fields when that key is present.
 */
export function mergeApiMeIntoSession(raw: unknown, session: UserProfile): UserProfile {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return session;
  }
  const r = raw as Record<string, unknown>;
  const id = readProfileId(r, session) || session.id;

  return {
    id,
    email: coerceProfileText(r.email) ?? session.email,
    name: "name" in r ? (coerceProfileText(r.name) ?? session.name) : session.name,
    bio:
      "bio" in r
        ? typeof r.bio === "string"
          ? optionalTrimmedString(r.bio)
          : undefined
        : session.bio,
    location:
      "location" in r
        ? typeof r.location === "string"
          ? optionalTrimmedString(r.location)
          : undefined
        : session.location,
    image: apiRowHasImageField(r)
      ? coalesceProfileImageUrl(
          typeof r.profileImage === "string" ? r.profileImage : undefined,
          typeof r.image === "string" ? r.image : undefined,
          typeof r.photoUrl === "string" ? r.photoUrl : undefined,
          typeof r.photoURL === "string" ? r.photoURL : undefined,
          typeof r.picture === "string" ? r.picture : undefined,
          session.image
        )
      : session.image,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : session.createdAt,
  };
}

/**
 * Merge a normalized profile into the session user (refresh / secondary sources).
 * Never overwrites session scalars with empty strings from partial payloads.
 */
export function mergeSessionUserProfile(
  existing: UserProfile,
  incoming: UserProfile
): UserProfile {
  const image =
    coalesceProfileImageUrl(incoming.image) ??
    coalesceProfileImageUrl(existing.image) ??
    existing.image;

  const name = coerceProfileText(incoming.name) ?? existing.name;
  const email = coerceProfileText(incoming.email) ?? existing.email;

  return {
    id: existing.id,
    email,
    name,
    image,
    bio: incoming.bio !== undefined ? incoming.bio : existing.bio,
    location: incoming.location !== undefined ? incoming.location : existing.location,
    createdAt: incoming.createdAt ?? existing.createdAt,
  };
}

/**
 * Applies PATCH `/api/users/me` using request fields as source of truth.
 * Raw API rows cannot clear fields the user did not send in the patch body.
 */
export function mergeProfileFromPatch(
  existing: UserProfile,
  patch: UpdateUserProfileRequest,
  rawResponse?: unknown
): UserProfile {
  const fromApi =
    rawResponse != null && typeof rawResponse === "object" && !Array.isArray(rawResponse)
      ? mergeApiMeIntoSession(rawResponse, existing)
      : { ...existing };

  const next: UserProfile = {
    ...fromApi,
    id: existing.id,
    email: existing.email,
    name:
      patch.name !== undefined
        ? String(patch.name).trim()
        : coerceProfileText(fromApi.name) ?? existing.name,
    bio:
      patch.bio !== undefined
        ? optionalTrimmedString(patch.bio) ?? undefined
        : existing.bio,
    location:
      patch.location !== undefined
        ? optionalTrimmedString(patch.location) ?? undefined
        : existing.location,
  };

  return next;
}

/** Dev-safe snapshot for persistence tracing (no email). */
export function profileFieldsSnapshot(profile: UserProfile): Record<string, string | undefined> {
  return {
    id: profile.id,
    name: profile.name,
    bio: profile.bio,
    location: profile.location,
    hasImage: profile.image ? "yes" : "no",
  };
}
