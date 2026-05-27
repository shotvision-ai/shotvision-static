import { useEffect, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import type { MatchParticipantGender } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import {
  avatarIndexFromUserId,
  clampAvatarId,
  defaultAvatarAccent,
  defaultAvatarBuiltInImage,
} from "~/lib/defaultAvatars";
import {
  normalizeProfileImageUrl,
  withProfileImageCacheBust,
} from "~/src/utils/profileImageUrl";

export type ProfileAvatarProps = {
  /** Remote profile image; when empty/invalid, a built-in default is shown */
  imageUrl?: string | null;
  /** Current user's chosen default slot (1–16). Omit when showing another user with `fallbackUserId`. */
  preferredAvatarId?: number;
  /** When `imageUrl` is empty, stable avatar for another user from their id */
  fallbackUserId?: string;
  /** Used with `fallbackUserId` when there is no photo (female/male sets vs classic). */
  fallbackGender?: MatchParticipantGender;
  size?: number;
  withBorder?: boolean;
  /** No shadow ring — for dense layouts (e.g. match cards). */
  variant?: "default" | "plain";
  /** Changes when avatar selection or remote URL revision updates — busts image cache. */
  imageDisplayKey?: string;
  /** Combined display + store revision for remote URL cache busting. */
  profileImageCacheRevision?: number;
};

export function resolveLocalAvatarId(
  preferredAvatarId: number | undefined,
  fallbackUserId: string | undefined,
  fallbackGender: MatchParticipantGender | undefined
): number {
  if (preferredAvatarId != null) {
    return clampAvatarId(preferredAvatarId);
  }
  if (fallbackUserId) {
    return avatarIndexFromUserId(fallbackUserId, fallbackGender ?? null);
  }
  return 1;
}

function DefaultAvatarVisual({
  localId,
  size,
  displayKey,
}: {
  localId: number;
  size: number;
  displayKey?: string;
}) {
  const builtIn = defaultAvatarBuiltInImage(localId);
  if (builtIn) {
    return (
      <Image
        key={displayKey ? `builtin-${displayKey}` : `builtin-${localId}`}
        source={builtIn}
        style={{ width: size, height: size }}
        contentFit="cover"
        accessibilityLabel="Default profile picture"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: defaultAvatarAccent(localId),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LucideIcon name="User" size={Math.round(size * 0.45)} color="#ffffff" />
    </View>
  );
}

export function ProfileAvatar({
  imageUrl,
  preferredAvatarId,
  fallbackUserId,
  fallbackGender,
  size = 40,
  withBorder = false,
  variant = "default",
  imageDisplayKey,
  profileImageCacheRevision = 0,
}: ProfileAvatarProps) {
  const remoteUrl = normalizeProfileImageUrl(imageUrl);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [remoteUrl, imageDisplayKey]);

  // Signed-in user's built-in pick (SecureStore) wins over OAuth photo until upload ships.
  const hasChosenDefault = preferredAvatarId != null;
  const showRemote = Boolean(remoteUrl) && !remoteFailed && !hasChosenDefault;
  const localId = resolveLocalAvatarId(preferredAvatarId, fallbackUserId, fallbackGender);

  const remoteUri =
    remoteUrl && profileImageCacheRevision > 0
      ? withProfileImageCacheBust(remoteUrl, profileImageCacheRevision)
      : remoteUrl;

  const inner = showRemote ? (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
      className="bg-muted"
    >
      <Image
        key={imageDisplayKey ? `remote-${imageDisplayKey}` : `remote-${remoteUri}`}
        source={{ uri: remoteUri }}
        style={{ width: size, height: size }}
        contentFit="cover"
        accessibilityLabel="Profile photo"
        onError={() => setRemoteFailed(true)}
      />
    </View>
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
      className="bg-muted"
    >
      <DefaultAvatarVisual
        localId={localId}
        size={size}
        displayKey={imageDisplayKey ?? String(localId)}
      />
    </View>
  );

  if (variant === "plain") {
    return inner;
  }

  return (
    <View
      style={{
        width: size + (withBorder ? 4 : 0),
        height: size + (withBorder ? 4 : 0),
        borderRadius: (size + (withBorder ? 4 : 0)) / 2,
        backgroundColor: withBorder ? "white" : "transparent",
        padding: withBorder ? 2 : 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {inner}
    </View>
  );
}
