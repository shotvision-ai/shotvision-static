import type { UserProfile } from "../services/api/profileService";
import { coalesceProfileImageUrl } from "./profileImageUrl";

/**
 * Merge a fresh `/api/users/me` profile into the session user without dropping
 * fields the GET omitted (e.g. image during replication lag).
 */
export function mergeSessionUserProfile(
  existing: UserProfile,
  incoming: UserProfile
): UserProfile {
  const image =
    coalesceProfileImageUrl(incoming.image) ??
    coalesceProfileImageUrl(existing.image) ??
    existing.image;

  return {
    ...existing,
    ...incoming,
    id: existing.id,
    email: existing.email || incoming.email,
    image,
    bio: incoming.bio !== undefined ? incoming.bio : existing.bio,
    location: incoming.location !== undefined ? incoming.location : existing.location,
  };
}

/** True when the remote profile image URL changed (needs cache bust / re-render). */
export function profileImageUrlChanged(
  before: string | undefined,
  after: string | undefined
): boolean {
  const a = coalesceProfileImageUrl(before);
  const b = coalesceProfileImageUrl(after);
  if (!a && !b) return false;
  return a !== b;
}
