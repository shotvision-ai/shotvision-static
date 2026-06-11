import { View } from "react-native";
import { Text } from "~/components/ui/text";
import type { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { formatMatchDetailDateTime } from "./matchDetailFormat";
import { MatchDetailVisibilityRow } from "./MatchDetailVisibilityRow";

type MatchDetailInfoCardProps = {
  match: Match;
  isOwnDashboardMatch: boolean;
  onVisibilityUpdated?: (isPublic: boolean) => void;
};

function InfoDivider() {
  return <View style={{ height: 1, backgroundColor: exploreColors.divider }} />;
}

export function MatchDetailInfoCard({
  match,
  isOwnDashboardMatch,
  onVisibilityUpdated,
}: MatchDetailInfoCardProps) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: 18,
          color: exploreColors.ink,
          marginBottom: 10,
        }}
      >
        Match Details
      </Text>
      <View
        style={{
          backgroundColor: exploreColors.cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: exploreColors.cardBorder,
          paddingHorizontal: 16,
          paddingVertical: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 14, gap: 12 }}>
          <LucideIcon name="Calendar" size={18} color={exploreColors.muted} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: exploreFontFamily.regular,
                fontSize: 11,
                color: exploreColors.muted,
                marginBottom: 4,
              }}
            >
              Date & Time
            </Text>
            <Text
              style={{
                fontFamily: exploreFontFamily.bold,
                fontSize: 14,
                color: exploreColors.ink,
                lineHeight: 20,
              }}
            >
              {formatMatchDetailDateTime(match.matchDate)}
            </Text>
          </View>
        </View>

        {match.location ? (
          <>
            <InfoDivider />
            <View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 14, gap: 12 }}>
              <LucideIcon name="MapPin" size={18} color={exploreColors.muted} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: exploreFontFamily.regular,
                    fontSize: 11,
                    color: exploreColors.muted,
                    marginBottom: 4,
                  }}
                >
                  Location
                </Text>
                <Text
                  style={{
                    fontFamily: exploreFontFamily.bold,
                    fontSize: 14,
                    color: exploreColors.ink,
                  }}
                >
                  {match.location}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <InfoDivider />
        <MatchDetailVisibilityRow
          match={match}
          isOwnDashboardMatch={isOwnDashboardMatch}
          onVisibilityUpdated={onVisibilityUpdated}
        />
      </View>
    </View>
  );
}
