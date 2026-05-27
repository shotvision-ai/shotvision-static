import { useAuthStore } from "../stores/authStore";
import { saveUseBuiltInAvatar } from "../services/profile/defaultAvatarPreference";
import { normalizeProfileImageUrl } from "./profileImageUrl";

/**
 * Call after POST `/api/uploads/profile-image` succeeds.
 * Updates session user + switches display mode to remote URL (from a React screen also call
 * `preferUploadedProfileImage()` from DefaultAvatarContext to bump display revision).
 */
export async function applyUploadedProfileImageUrl(url: string): Promise<void> {
  const normalized = normalizeProfileImageUrl(url);
  useAuthStore.getState().setUserProfileImage(normalized);
  await saveUseBuiltInAvatar(false);
}
