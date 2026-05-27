import { Pressable, View } from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useAppTheming } from "../../src/hooks/useAppTheming";

type MatchLikeButtonProps = {
  isLiked: boolean;
  likesCount: number;
  isLiking: boolean;
  canToggle: boolean;
  onLike: () => void;
  /**
   * When true (e.g. own match on My Matches / Explore owner row), show a non-tappable
   * like count. Owners cannot self-like; the control is display-only but always visible.
   */
  readOnlyWhenDisabled?: boolean;
};

/**
 * Isolated like control — must NOT be nested inside the card navigation Pressable.
 */
export function MatchLikeButton({
  isLiked,
  likesCount,
  isLiking,
  canToggle,
  onLike,
  readOnlyWhenDisabled = false,
}: MatchLikeButtonProps) {
  const { colors, brand } = useAppTheming();
  const accent = brand.blue;
  const muted = colors.muted;

  if (!canToggle && readOnlyWhenDisabled) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={
          likesCount === 1 ? "1 like on your match" : `${likesCount} likes on your match`
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 10,
          backgroundColor: "rgba(107,114,128,0.06)",
        }}
      >
        <LucideIcon name="Heart" size={14} color={muted} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: muted }}>{likesCount}</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        if (canToggle && !isLiking) {
          onLike();
        }
      }}
      disabled={isLiking || !canToggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={
        likesCount > 0
          ? `${isLiked ? "Unlike" : "Like"} match, ${likesCount} likes`
          : isLiked
            ? "Unlike match"
            : "Like match"
      }
      accessibilityState={{ disabled: isLiking || !canToggle }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: isLiked ? "rgba(37,99,235,0.08)" : "rgba(107,114,128,0.06)",
        opacity: pressed && canToggle ? 0.75 : isLiking || !canToggle ? 0.5 : 1,
      })}
    >
      <LucideIcon
        name="Heart"
        size={14}
        color={isLiked ? accent : muted}
        fill={isLiked ? accent : "transparent"}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: isLiked ? accent : muted,
        }}
      >
        {likesCount}
      </Text>
    </Pressable>
  );
}
