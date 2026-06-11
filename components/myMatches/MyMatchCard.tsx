import React, { memo } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import type { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { useMatchListViewer } from "../../src/context/MatchListViewerContext";
import { MatchVisibilityControl } from "../match/MatchVisibilityControl";
import { OwnerMatchCardActions } from "../match/OwnerMatchCardActions";
import { STANDARD_HIT_SLOP } from "../../src/utils/touchA11y";
import { exploreColors, exploreFontFamily, formatScheduledLabel, playerInitials } from "~/lib/exploreDesign";
import { MATCH_LIST_CARD as L } from "../match/matchListCardLayout";
import {
  matchListStatusAccent,
  MatchListStatusBadge,
  MatchListOwnBadge,
  MatchListWinnerChip,
  MatchListScheduledRow,
  MatchListCancelledNote,
  MatchListCardFooterDate,
  matchListCardShell,
  matchListCardInner,
  matchListCardFooterStyle,
  matchListCardHeaderStyle,
} from "../match/list/MatchListCardShared";
import { ExploreMatchCardScoreboard } from "../explore/ExploreMatchCardScoreboard";
import { resolveMatchLifecycleFields } from "../../src/utils/matchEditEligibility";
import {
  getMatchCardSetColumns,
  shouldShowMatchCardScoreRows,
} from "../../src/utils/matchListScores";

function MyMatchCardComponent({ match }: { match: Match }) {
  const router = useRouter();
  const { user: currentUser } = useMatchListViewer();
  const resolved = resolveMatchLifecycleFields(match);
  const userId = currentUser?.id;

  const { isLiked, likesCount, isLiking, canToggle, handleLike } = useMatchLike(match, {
    isOwnDashboardMatch: true,
  });

  const cancelled = resolved.status === "cancelled";
  const { labels: setLabels, scoreA, scoreB } = getMatchCardSetColumns(resolved);
  const showScores = shouldShowMatchCardScoreRows(resolved);
  const winnerText =
    resolved.status === "completed" && resolved.winner
      ? `${resolved.winner === "playerA" ? resolved.playerA : resolved.playerB} won`
      : null;

  const openDetails = () => router.push(`/match/${resolved.id}`);

  return (
    <View style={{ flexDirection: "row", ...matchListCardShell }}>
      <View style={{ width: L.accentWidth, backgroundColor: matchListStatusAccent(resolved.status) }} />
      <View style={matchListCardInner}>
        <View style={matchListCardHeaderStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap", gap: L.headerGap }}>
            <MatchVisibilityControl match={resolved} isOwnDashboardMatch variant="listBadge" />
            <MatchListOwnBadge />
            {winnerText ? <MatchListWinnerChip label={winnerText} /> : null}
          </View>
          <MatchListStatusBadge status={resolved.status} />
        </View>

        <ExploreMatchCardScoreboard
          labels={setLabels}
          playerA={{
            name: resolved.playerA,
            initials: playerInitials(resolved.playerA),
            scores: scoreA,
          }}
          playerB={{
            name: resolved.playerB,
            initials: playerInitials(resolved.playerB),
            scores: scoreB,
          }}
          cancelled={cancelled}
          showScores={showScores}
          onPressPlayer={openDetails}
        />

        {resolved.status === "scheduled" ? (
          <MatchListScheduledRow label={formatScheduledLabel(resolved.matchDate)} />
        ) : null}

        {cancelled ? <MatchListCancelledNote /> : null}

        <OwnerMatchCardActions
          match={resolved}
          currentUserId={userId}
          isOwnDashboardMatch
          compact
          exploreList
        />

        <View style={matchListCardFooterStyle}>
          <MatchListCardFooterDate matchDate={resolved.matchDate} onPress={openDetails} />

          <TouchableOpacity
            onPress={() => {
              if (canToggle && !isLiking) void handleLike();
            }}
            disabled={!canToggle || isLiking}
            hitSlop={STANDARD_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Like count on your match"
            style={{ flexDirection: "row", alignItems: "center", gap: L.badgeGap }}
          >
            {isLiking ? (
              <ActivityIndicator size="small" color={exploreColors.coral} />
            ) : (
              <LucideIcon
                name="Heart"
                size={L.heartIcon}
                color={isLiked ? exploreColors.heart : exploreColors.scoreMuted}
                fill={isLiked ? exploreColors.heart : "transparent"}
              />
            )}
            <Text
              style={{
                fontFamily: exploreFontFamily.extraBold,
                fontSize: L.heartFont,
                color: isLiked ? exploreColors.heart : exploreColors.scoreMuted,
              }}
            >
              {Math.max(0, likesCount)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const MyMatchCard = memo(MyMatchCardComponent);
