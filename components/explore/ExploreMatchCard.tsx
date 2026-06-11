import React, { memo, useState } from "react";
import { View, TouchableOpacity, Alert, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import type { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { useMatchReport } from "../../src/hooks/useMatchReport";
import { useMatchListViewer } from "../../src/context/MatchListViewerContext";
import { isMatchOwner } from "../../src/utils/matchEditEligibility";
import { MatchVisibilityControl } from "../match/MatchVisibilityControl";
import { OwnerMatchCardActions } from "../match/OwnerMatchCardActions";
import { STANDARD_HIT_SLOP } from "../../src/utils/touchA11y";
import {
  exploreColors,
  exploreFontFamily,
  formatExploreFooterDate,
  formatScheduledLabel,
  playerInitials,
} from "~/lib/exploreDesign";
import { matchListStatusAccent } from "../match/list/MatchListCardShared";
import { ExploreReportModals } from "./ExploreReportModals";
import { ExploreMatchCardScoreboard } from "./ExploreMatchCardScoreboard";
import {
  ExplorePublicBadge,
  ExploreOwnBadge,
  ExploreStatusBadge,
  ExploreWinnerChip,
} from "./ExploreMatchCardBadges";
import {
  EXPLORE_MATCH_CARD as E,
  exploreMatchCardShell,
  exploreMatchCardInner,
  exploreMatchCardHeaderStyle,
  exploreMatchCardFooterStyle,
} from "./exploreMatchCardLayout";
import {
  getMatchCardSetColumns,
  shouldShowMatchCardScoreRows,
} from "../../src/utils/matchListScores";

function ExploreMatchCardFooter({
  matchDate,
  isLiked,
  likesCount,
  isLiking,
  canToggle,
  isReported,
  isReportSubmitting,
  onOpenMatch,
  onLike,
  onReport,
}: {
  matchDate: string;
  isLiked: boolean;
  likesCount: number;
  isLiking: boolean;
  canToggle: boolean;
  isReported: boolean;
  isReportSubmitting: boolean;
  onOpenMatch: () => void;
  onLike: () => void;
  onReport: () => void;
}) {
  const dateLabel = formatExploreFooterDate(matchDate);

  return (
    <View style={exploreMatchCardFooterStyle}>
      <Pressable
        onPress={onOpenMatch}
        accessibilityRole="button"
        accessibilityLabel={dateLabel ? `Match date ${dateLabel}` : "Open match"}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          flexShrink: 1,
          maxWidth: "48%",
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <LucideIcon
            name="Calendar"
            size={E.footerIcon}
            color={exploreColors.scoreMuted}
            style={{ marginRight: E.footerIconMr }}
          />
          <Text
            numberOfLines={1}
            style={{
              fontFamily: exploreFontFamily.regular,
              fontSize: E.footerFont,
              color: exploreColors.scoreMuted,
            }}
          >
            {dateLabel}
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", gap: E.footerActionsGap }}>
        <TouchableOpacity
          onPress={onLike}
          disabled={!canToggle || isLiking}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? "Unlike match" : "Like match"}
          style={{ flexDirection: "row", alignItems: "center", gap: E.badgeGap }}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color={exploreColors.coral} />
          ) : (
            <LucideIcon
              name="Heart"
              size={E.heartIcon}
              color={isLiked ? exploreColors.heart : exploreColors.scoreMuted}
              fill={isLiked ? exploreColors.heart : "transparent"}
            />
          )}
          <Text
            style={{
              fontFamily: exploreFontFamily.extraBold,
              fontSize: E.heartFont,
              color: isLiked ? exploreColors.heart : exploreColors.scoreMuted,
            }}
          >
            {Math.max(0, likesCount)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onReport}
          disabled={isReportSubmitting}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={isReported ? "Withdraw report" : "Report match"}
          style={{ flexDirection: "row", alignItems: "center", gap: E.badgeGap }}
        >
          {isReportSubmitting ? (
            <ActivityIndicator size="small" color={exploreColors.coral} />
          ) : (
            <LucideIcon
              name={isReported ? "CircleCheck" : "Flag"}
              size={E.reportIcon}
              color={isReported ? exploreColors.badge.finishedText : exploreColors.coral}
            />
          )}
          <Text
            style={{
              fontFamily: exploreFontFamily.extraBold,
              fontSize: E.reportFont,
              color: isReported ? exploreColors.badge.finishedText : exploreColors.coral,
            }}
          >
            {isReported ? "Reported" : "Report"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExploreMatchCardComponent({ match }: { match: Match }) {
  const router = useRouter();
  const { user: currentUser } = useMatchListViewer();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState("");

  const { isLiked, likesCount, isLiking, canToggle, handleLike } = useMatchLike(match);
  const { isReported, isSubmitting: isReportSubmitting, submitReport, undoReport } =
    useMatchReport(match);

  const isOwner = isMatchOwner(match, currentUser?.id);
  const cancelled = match.status === "cancelled";
  const { labels: setLabels, scoreA, scoreB } = getMatchCardSetColumns(match);
  const showScores = shouldShowMatchCardScoreRows(match);

  const winnerText =
    match.status === "completed" && match.winner
      ? `${match.winner === "playerA" ? match.playerA : match.playerB} won`
      : null;

  const openDetails = () => router.push(`/match/${match.id}`);

  const handleReport = async () => {
    if (!selectedReason || isReportSubmitting) return;
    const ok = await submitReport(selectedReason, reportNotes.trim() || undefined);
    if (!ok) return;
    setShowReportModal(false);
    setSelectedReason(null);
    setReportNotes("");
    Alert.alert("Report submitted", "Thanks for helping keep Shot Vision safe.");
  };

  const onReportPress = () => {
    if (isOwner) {
      Alert.alert("Unavailable", "You can't report your own match.");
      return;
    }
    if (isReported) setShowUndoModal(true);
    else setShowReportModal(true);
  };

  return (
    <>
      <View style={{ flexDirection: "row", ...exploreMatchCardShell }}>
        <View
          style={{
            width: E.accentWidth,
            backgroundColor: matchListStatusAccent(match.status),
          }}
        />
        <View style={exploreMatchCardInner}>
          <View style={exploreMatchCardHeaderStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: E.headerGap }}>
              {isOwner ? (
                <>
                  <MatchVisibilityControl match={match} isOwnDashboardMatch variant="listBadge" />
                  <ExploreOwnBadge />
                </>
              ) : (
                <ExplorePublicBadge />
              )}
              {winnerText ? <ExploreWinnerChip label={winnerText} /> : null}
            </View>
            <ExploreStatusBadge status={match.status} />
          </View>

          <ExploreMatchCardScoreboard
            labels={setLabels}
            playerA={{
              name: match.playerA,
              initials: playerInitials(match.playerA),
              scores: scoreA,
            }}
            playerB={{
              name: match.playerB,
              initials: playerInitials(match.playerB),
              scores: scoreB,
            }}
            cancelled={cancelled}
            showScores={showScores}
            onPressPlayer={openDetails}
          />

          {match.status === "scheduled" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: E.inlineGap,
                marginBottom: E.inlineMb,
              }}
            >
              <LucideIcon name="Clock" size={E.scheduledIcon} color={exploreColors.accent.scheduled} />
              <Text
                style={{
                  fontFamily: exploreFontFamily.bold,
                  fontSize: E.scheduledFont,
                  color: exploreColors.accent.scheduled,
                }}
              >
                {formatScheduledLabel(match.matchDate)}
              </Text>
            </View>
          ) : null}

          {cancelled ? (
            <Text
              style={{
                fontFamily: exploreFontFamily.regular,
                fontSize: E.noteFont,
                fontStyle: "italic",
                color: exploreColors.muted,
                marginBottom: E.inlineMb,
              }}
            >
              Match was cancelled — no result recorded.
            </Text>
          ) : null}

          {isOwner ? (
            <OwnerMatchCardActions
              match={match}
              currentUserId={currentUser?.id}
              isOwnDashboardMatch
              compact
              exploreList
            />
          ) : null}

          <ExploreMatchCardFooter
            matchDate={match.matchDate}
            isLiked={isLiked}
            likesCount={likesCount}
            isLiking={isLiking}
            canToggle={canToggle}
            isReported={isReported}
            isReportSubmitting={isReportSubmitting}
            onOpenMatch={openDetails}
            onLike={() => {
              if (canToggle && !isLiking) void handleLike();
            }}
            onReport={onReportPress}
          />
        </View>
      </View>

      <ExploreReportModals
        showReport={showReportModal}
        showUndo={showUndoModal}
        selectedReason={selectedReason}
        reportNotes={reportNotes}
        isSubmitting={isReportSubmitting}
        onCloseReport={() => setShowReportModal(false)}
        onCloseUndo={() => setShowUndoModal(false)}
        onSelectReason={setSelectedReason}
        onChangeNotes={setReportNotes}
        onSubmit={() => void handleReport()}
        onConfirmUndo={() => void undoReport().then((ok) => ok && setShowUndoModal(false))}
      />
    </>
  );
}

export const ExploreMatchCard = memo(ExploreMatchCardComponent);
