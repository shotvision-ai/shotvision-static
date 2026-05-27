import { useMemo } from "react";
import { useDefaultAvatar } from "../context/DefaultAvatarContext";
import { useAuthStore } from "../stores/authStore";

/**
 * Stable avatar props for the signed-in user — syncs built-in pick + remote URL revision.
 */
export function useCurrentUserAvatarProps(userId: string | undefined) {
  const { preferredAvatarId, useBuiltInAvatar, displayRevision } = useDefaultAvatar();
  const profileImageRevision = useAuthStore((s) => s.profileImageRevision);

  return useMemo(() => {
    const revision = displayRevision + profileImageRevision;
    const id = userId?.trim() || "self";
    return {
      preferredAvatarId: useBuiltInAvatar ? preferredAvatarId : undefined,
      fallbackUserId: userId?.trim() || undefined,
      imageDisplayKey: `${id}-${revision}`,
      profileImageCacheRevision: revision,
    };
  }, [
    preferredAvatarId,
    useBuiltInAvatar,
    displayRevision,
    profileImageRevision,
    userId,
  ]);
}
