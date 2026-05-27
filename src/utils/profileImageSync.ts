/**
 * @deprecated Import from `profileSessionMerge` instead.
 * Re-exported for existing imports.
 */
export {
  mergeSessionUserProfile,
  coerceProfileText,
  profileFieldsSnapshot,
} from "./profileSessionMerge";

import { coalesceProfileImageUrl } from "./profileImageUrl";

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
