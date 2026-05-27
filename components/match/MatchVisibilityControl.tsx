import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/components/ui/text";
import { Switch } from "~/components/ui/switch";
import LucideIcon from "~/lib/icons/LucideIcon";
import type { Match } from "~/types/match";
import { useMatchVisibility } from "../../src/hooks/useMatchVisibility";
import { useAppTheming } from "../../src/hooks/useAppTheming";
import { STANDARD_HIT_SLOP } from "../../src/utils/touchA11y";

type MatchVisibilityControlProps = {
  match: Match;
  /** My Matches list — viewer is always the organizer. */
  isOwnDashboardMatch?: boolean;
  /** Compact chip for match cards; full row for match details. */
  variant?: "chip" | "row";
  onVisibilityUpdated?: (isPublic: boolean) => void;
};

export function MatchVisibilityControl({
  match,
  isOwnDashboardMatch = false,
  variant = "row",
  onVisibilityUpdated,
}: MatchVisibilityControlProps) {
  const { colors, brand } = useAppTheming();
  const { isPublic, canManage, isUpdating, lockMessage, requestToggle } = useMatchVisibility(match, {
    isOwnDashboardMatch,
    onVisibilityUpdated,
  });
  const accent = brand.blue;
  const muted = colors.muted;

  if (variant === "chip") {
    if (!canManage) {
      return (
        <View
          className="flex-row items-center gap-1 px-2 py-1 rounded-md"
          style={{
            backgroundColor: isPublic ? "rgba(37,99,235,0.08)" : "rgba(107,114,128,0.08)",
          }}
        >
          <LucideIcon
            name={isPublic ? "Globe" : "Lock"}
            size={12}
            color={isPublic ? accent : muted}
          />
          <Text style={{ fontSize: 11, fontWeight: "600", color: isPublic ? accent : muted }}>
            {isPublic ? "Public" : "Private"}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => requestToggle()}
        disabled={isUpdating}
        hitSlop={STANDARD_HIT_SLOP}
        className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-md"
        style={{
          backgroundColor: isPublic ? "rgba(37,99,235,0.1)" : "rgba(107,114,128,0.08)",
          borderWidth: 1,
          borderColor: isPublic ? "rgba(37,99,235,0.25)" : "rgba(107,114,128,0.15)",
          opacity: isUpdating ? 0.6 : 1,
        }}
        accessibilityRole="button"
        accessibilityLabel={isPublic ? "Make match private" : "Make match public"}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color={isPublic ? accent : muted} />
        ) : (
          <LucideIcon
            name={isPublic ? "Globe" : "Lock"}
            size={12}
            color={isPublic ? accent : muted}
          />
        )}
        <Text style={{ fontSize: 11, fontWeight: "600", color: isPublic ? accent : muted }}>
          {isPublic ? "Public" : "Private"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center">
      <LucideIcon
        name={isPublic ? "Globe" : "Lock"}
        size={20}
        className="text-muted-foreground mr-3"
      />
      <View className="flex-1">
        <Text className="text-caption text-muted-foreground mb-0.5">Visibility</Text>
        <Text className="text-body font-medium text-foreground">
          {isPublic ? "Public" : "Private"}
        </Text>
        {canManage ? (
          <Text className="text-caption text-muted-foreground mt-0.5">
            {isPublic ? "Visible in Explore" : "Only visible to you"}
          </Text>
        ) : lockMessage ? (
          <Text className="text-caption text-muted-foreground mt-0.5 leading-5">{lockMessage}</Text>
        ) : null}
      </View>
      {canManage ? (
        <View className="flex-row items-center gap-2">
          {isUpdating ? <ActivityIndicator size="small" color="#2563eb" /> : null}
          <Switch
            checked={isPublic}
            onCheckedChange={() => requestToggle()}
            disabled={isUpdating}
            accessibilityLabel={isPublic ? "Match is public" : "Match is private"}
            accessibilityHint={isPublic ? "Double tap to make private" : "Double tap to make public"}
          />
        </View>
      ) : null}
    </View>
  );
}
