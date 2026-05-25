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

export type ProfileAvatarProps = {
  /** Remote profile image; when empty, a built-in default is shown */
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
};

function resolveLocalAvatarId(
  imageUrl: string | null | undefined,
  preferredAvatarId: number | undefined,
  fallbackUserId: string | undefined,
  fallbackGender: MatchParticipantGender | undefined
): number | null {
  const trimmed = imageUrl?.trim();
  if (trimmed) return null;
  if (fallbackUserId) {
    return avatarIndexFromUserId(fallbackUserId, fallbackGender ?? null);
  }
  return preferredAvatarId != null ? clampAvatarId(preferredAvatarId) : 1;
}

export function ProfileAvatar({
  imageUrl,
  preferredAvatarId,
  fallbackUserId,
  fallbackGender,
  size = 40,
  withBorder = false,
  variant = "default",
}: ProfileAvatarProps) {
  const trimmed = imageUrl?.trim();
  const localId = resolveLocalAvatarId(imageUrl, preferredAvatarId, fallbackUserId, fallbackGender);
  const builtIn =
    !trimmed && localId != null ? defaultAvatarBuiltInImage(localId) : undefined;

  const inner =
    trimmed ? (
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
          source={{ uri: trimmed }}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel="Profile photo"
        />
      </View>
    ) : builtIn ? (
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
          source={builtIn}
          style={{ width: size, height: size }}
          contentFit="cover"
          accessibilityLabel="Profile photo"
        />
      </View>
    ) : (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: defaultAvatarAccent(localId ?? 1),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LucideIcon name="User" size={Math.round(size * 0.45)} color="#ffffff" />
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
