import { useMemo } from "react";
import { useDefaultAvatar } from "../context/DefaultAvatarContext";
import { useAuthStore } from "../stores/authStore";

export type CurrentUserAvatarProps = ReturnType<typeof buildCurrentUserAvatarProps>;

function buildCurrentUserAvatarProps(
  userId: string | undefined,
  preferredAvatarId: number,
  useBuiltInAvatar: boolean,
  displayRevision: number,
  profileImageRevision: number
) {
  const revision = displayRevision + profileImageRevision;
  const id = userId?.trim() || "self";
  return {
    preferredAvatarId: useBuiltInAvatar ? preferredAvatarId : undefined,
    fallbackUserId: userId?.trim() || undefined,
    imageDisplayKey: `${id}-${revision}`,
    profileImageCacheRevision: revision,
  };
}

/**
 * Stable avatar props for the signed-in user — syncs built-in pick + remote URL revision.
 */
export function useCurrentUserAvatarProps(userId: string | undefined) {
  const { preferredAvatarId, useBuiltInAvatar, displayRevision } = useDefaultAvatar();
  const profileImageRevision = useAuthStore((s) => s.profileImageRevision);

  return useMemo(
    () =>
      buildCurrentUserAvatarProps(
        userId,
        preferredAvatarId,
        useBuiltInAvatar,
        displayRevision,
        profileImageRevision
      ),
    [preferredAvatarId, useBuiltInAvatar, displayRevision, profileImageRevision, userId]
  );
}
