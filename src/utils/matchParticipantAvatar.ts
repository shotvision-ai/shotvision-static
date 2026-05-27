import { normalizeProfileImageUrl } from "./profileImageUrl";

export function participantNamesEqual(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return Boolean(left) && Boolean(right) && left === right;
}

/** Whether the signed-in user is this match participant (id preferred, name fallback). */
export function isMatchParticipantSelf(
  participantUserId: string | undefined,
  participantName: string,
  currentUser: { id: string; name: string } | null | undefined
): boolean {
  if (!currentUser) return false;
  const viewerId = currentUser.id.trim();
  const participantId = participantUserId?.trim();
  if (viewerId && participantId && viewerId === participantId) {
    return true;
  }
  return participantNamesEqual(participantName, currentUser.name);
}

/**
 * Match list/detail payloads often omit `profileImage`. When the viewer is a participant,
 * fall back to their session profile photo.
 */
export function resolveMatchParticipantImageUrl(
  matchImage: string | null | undefined,
  options: { isSelf: boolean; selfImage?: string | null }
): string | undefined {
  const fromMatch = normalizeProfileImageUrl(matchImage);
  if (fromMatch) return fromMatch;
  if (options.isSelf) {
    return normalizeProfileImageUrl(options.selfImage);
  }
  return undefined;
}
