import type { UserProfile } from "../services/api/profileService";
import { coalesceProfileImageUrl } from "./profileImageUrl";

/** Non-empty trimmed string, or undefined when absent/blank. */
export function coerceProfileText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Merge a fresh `/api/users/me` profile into the session user.
 * Never overwrites session scalars with empty strings from partial/null API payloads.
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
