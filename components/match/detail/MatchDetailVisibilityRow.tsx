import { View, ActivityIndicator } from "react-native";
import { Text } from "~/components/ui/text";
import { Switch } from "~/components/ui/switch";
import type { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useMatchVisibility } from "../../../src/hooks/useMatchVisibility";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";

type MatchDetailVisibilityRowProps = {
  match: Match;
  isOwnDashboardMatch?: boolean;
  onVisibilityUpdated?: (isPublic: boolean) => void;
};

export function MatchDetailVisibilityRow({
  match,
  isOwnDashboardMatch = false,
  onVisibilityUpdated,
}: MatchDetailVisibilityRowProps) {
  const { isPublic, canManage, isUpdating, lockMessage, requestToggle } = useMatchVisibility(match, {
    isOwnDashboardMatch,
    onVisibilityUpdated,
  });

  const sublabel = canManage
    ? isPublic
      ? "Visible in Explore"
      : "Only visible to you"
    : lockMessage ?? (isPublic ? "Visible in Explore" : "Only visible to you");

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 }}>
      <LucideIcon
        name="Lock"
        size={18}
        color={exploreColors.muted}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: exploreFontFamily.regular,
            fontSize: 11,
            color: exploreColors.muted,
            marginBottom: 4,
          }}
        >
          Visibility
        </Text>
        <Text
          style={{
            fontFamily: exploreFontFamily.bold,
            fontSize: 15,
            color: exploreColors.ink,
          }}
        >
          {isPublic ? "Public" : "Private"}
        </Text>
        <Text
          style={{
            fontFamily: exploreFontFamily.regular,
            fontSize: 12,
            color: exploreColors.muted,
            marginTop: 2,
          }}
        >
          {sublabel}
        </Text>
      </View>
      {canManage ? (
        isUpdating ? (
          <ActivityIndicator size="small" color={exploreColors.coral} />
        ) : (
          <Switch
            checked={isPublic}
            onCheckedChange={() => requestToggle()}
            accessibilityLabel={isPublic ? "Match is public" : "Match is private"}
          />
        )
      ) : null}
    </View>
  );
}
