import { View } from "react-native";
import { Text } from "~/components/ui/text";
import type { MatchStatus } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { EXPLORE_MATCH_CARD as E } from "./exploreMatchCardLayout";

export function ExplorePublicBadge() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: E.listBadgePadH,
        paddingVertical: E.listBadgePadV,
        borderRadius: E.listBadgeRadius,
        backgroundColor: exploreColors.badge.publicBg,
        gap: E.badgeGap,
      }}
    >
      <LucideIcon name="Globe" size={E.publicIcon} color={exploreColors.badge.publicText} />
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: E.listBadgeFont,
          letterSpacing: 0.5,
          color: exploreColors.badge.publicText,
        }}
      >
        PUBLIC
      </Text>
    </View>
  );
}

export function ExploreOwnBadge() {
  return (
    <View
      style={{
        paddingHorizontal: E.listBadgePadH,
        paddingVertical: E.listBadgePadV,
        borderRadius: E.listBadgeRadius,
        backgroundColor: exploreColors.notesBtnBg,
      }}
    >
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: E.listBadgeFont,
          letterSpacing: 0.5,
          color: exploreColors.coral,
        }}
      >
        OWN
      </Text>
    </View>
  );
}

export function ExploreStatusBadge({ status }: { status: MatchStatus }) {
  const live = status === "live";
  const config =
    status === "live"
      ? { label: "LIVE", bg: exploreColors.badge.liveBg, fg: exploreColors.badge.liveText, dot: exploreColors.coral }
      : status === "completed"
        ? {
            label: "FINISHED",
            bg: exploreColors.badge.finishedBg,
            fg: exploreColors.badge.finishedText,
            dot: exploreColors.badge.finishedText,
          }
        : status === "scheduled"
          ? {
              label: "SCHEDULED",
              bg: exploreColors.badge.scheduledBg,
              fg: exploreColors.badge.scheduledText,
              dot: exploreColors.badge.scheduledText,
            }
          : {
              label: "CANCELLED",
              bg: exploreColors.badge.cancelledBg,
              fg: exploreColors.badge.cancelledText,
              dot: exploreColors.badge.cancelledText,
            };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: E.badgePadH,
        paddingVertical: E.badgePadV,
        borderRadius: E.badgeRadius,
        backgroundColor: config.bg,
        gap: live ? E.badgeGap : 0,
      }}
    >
      {live ? (
        <View
          style={{
            width: E.liveDot,
            height: E.liveDot,
            borderRadius: E.liveDot / 2,
            backgroundColor: config.dot,
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: E.badgeFont,
          letterSpacing: 0.6,
          color: config.fg,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}

export function ExploreWinnerChip({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: E.badgeGap }}>
      <LucideIcon name="Trophy" size={E.trophyIcon} color={exploreColors.trophyGold} />
      <Text
        numberOfLines={1}
        style={{
          fontFamily: exploreFontFamily.bold,
          fontSize: E.winnerFont,
          color: exploreColors.trophyGold,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
