import React from "react";
import { View, Pressable, ScrollView, type PressableProps } from "react-native";
import { Text } from "~/components/ui/text";
import type { MatchStatus } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily, formatExploreFooterDate } from "~/lib/exploreDesign";
import {
  formatMatchCardScoreCell,
  matchCardScoreColumnMetrics,
} from "../../../src/utils/matchListScores";
import {
  MATCH_LIST_CARD as L,
  matchListCardShell,
  matchListCardInner,
  matchListCardFooterStyle,
  matchListCardHeaderStyle,
} from "../matchListCardLayout";

export { matchListCardShell, matchListCardInner, matchListCardFooterStyle, matchListCardHeaderStyle };

export function matchListStatusAccent(status: MatchStatus): string {
  switch (status) {
    case "live":
      return exploreColors.accent.live;
    case "completed":
      return exploreColors.accent.finished;
    case "scheduled":
      return exploreColors.accent.scheduled;
    case "cancelled":
      return exploreColors.accent.cancelled;
  }
}

export function MatchListStatusBadge({ status }: { status: MatchStatus }) {
  const live = status === "live";
  const config =
    status === "live"
      ? { label: "LIVE", bg: exploreColors.badge.liveBg, fg: exploreColors.badge.liveText }
      : status === "completed"
        ? { label: "FINISHED", bg: exploreColors.badge.finishedBg, fg: exploreColors.badge.finishedText }
        : status === "scheduled"
          ? { label: "SCHEDULED", bg: exploreColors.badge.scheduledBg, fg: exploreColors.badge.scheduledText }
          : { label: "CANCELLED", bg: exploreColors.badge.cancelledBg, fg: exploreColors.badge.cancelledText };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: L.badgePadH,
        paddingVertical: L.badgePadV,
        borderRadius: L.badgeRadius,
        backgroundColor: config.bg,
        gap: live ? L.badgeGap : 0,
      }}
    >
      {live ? (
        <View
          style={{
            width: L.liveDot,
            height: L.liveDot,
            borderRadius: L.liveDot / 2,
            backgroundColor: config.fg,
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: L.badgeFont,
          letterSpacing: 0.5,
          color: config.fg,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}

export function MatchListPublicBadge() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: L.listBadgePadH,
        paddingVertical: L.listBadgePadV,
        borderRadius: L.listBadgeRadius,
        backgroundColor: exploreColors.badge.publicBg,
        gap: L.badgeGap,
      }}
    >
      <LucideIcon name="Globe" size={L.publicIcon} color={exploreColors.badge.publicText} />
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: L.listBadgeFont,
          letterSpacing: 0.4,
          color: exploreColors.badge.publicText,
        }}
      >
        PUBLIC
      </Text>
    </View>
  );
}

export function MatchListOwnBadge() {
  return (
    <View
      style={{
        paddingHorizontal: L.listBadgePadH,
        paddingVertical: L.listBadgePadV,
        borderRadius: L.listBadgeRadius,
        backgroundColor: exploreColors.notesBtnBg,
      }}
    >
      <Text
        style={{
          fontFamily: exploreFontFamily.extraBold,
          fontSize: L.listBadgeFont,
          letterSpacing: 0.4,
          color: exploreColors.coral,
        }}
      >
        OWN
      </Text>
    </View>
  );
}

export function MatchListWinnerChip({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: L.badgeGap }}>
      <LucideIcon name="Trophy" size={L.trophyIcon} color={exploreColors.trophyGold} />
      <Text
        style={{
          fontFamily: exploreFontFamily.bold,
          fontSize: L.winnerFont,
          color: exploreColors.trophyGold,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

type MatchListPlayerRowProps = {
  name: string;
  initials: string;
  side: "A" | "B";
  /** One score per visible set column (inline when showScores). */
  setScores: number[];
  isLoser: boolean;
  cancelled: boolean;
  showScores: boolean;
  showDivider: boolean;
  onPress: () => void;
};

export function MatchListPlayerRow({
  name,
  initials,
  side,
  setScores,
  isLoser,
  cancelled,
  showScores,
  showDivider,
  onPress,
}: MatchListPlayerRowProps) {
  const avatarBg = cancelled
    ? exploreColors.badge.publicBg
    : side === "A"
      ? exploreColors.playerA
      : exploreColors.playerB;
  const avatarFg = cancelled ? exploreColors.muted : "#FFFFFF";
  const nameColor = cancelled || isLoser ? exploreColors.muted : exploreColors.ink;
  const scoreColor = cancelled ? exploreColors.scoreMuted : exploreColors.ink;

  return (
    <>
      {showDivider ? (
        <View
          style={{
            height: 1,
            backgroundColor: exploreColors.cardBorderHairline,
            marginVertical: L.dividerMv,
          }}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, open match`}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: L.rowPy,
          }}
        >
          <View
            style={{
              width: L.avatar,
              height: L.avatar,
              borderRadius: L.avatarRadius,
              backgroundColor: avatarBg,
              justifyContent: "center",
              alignItems: "center",
              marginRight: L.avatarMr,
            }}
          >
            <Text
              style={{
                fontFamily: exploreFontFamily.extraBold,
                fontSize: L.avatarFont,
                color: avatarFg,
              }}
            >
              {initials}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: exploreFontFamily.bold,
              fontSize: L.playerName,
              color: nameColor,
            }}
          >
            {name}
          </Text>
          {showScores ? (
            <MatchListScoreStrip columnCount={setScores.length}>
              {(() => {
                const metrics = matchCardScoreColumnMetrics(setScores.length);
                return setScores.map((score, index) => (
                  <Text
                    key={index}
                    style={{
                      width: metrics.colWidth,
                      textAlign: "center",
                      fontFamily: exploreFontFamily.black,
                      fontSize: metrics.fontSize,
                      color: scoreColor,
                      marginRight: index < setScores.length - 1 ? metrics.gap : 0,
                    }}
                  >
                    {formatMatchCardScoreCell(score)}
                  </Text>
                ));
              })()}
            </MatchListScoreStrip>
          ) : null}
        </View>
      </Pressable>
    </>
  );
}

function MatchListScoreStrip({
  columnCount,
  children,
}: {
  columnCount: number;
  children: React.ReactNode;
}) {
  const metrics = matchCardScoreColumnMetrics(columnCount);
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
  );
  if (!metrics.scrollable) return row;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 1 }}
    >
      {row}
    </ScrollView>
  );
}

export function MatchListScoreHeader({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  const metrics = matchCardScoreColumnMetrics(labels.length);
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingTop: L.scoreHeaderPt,
        paddingBottom: L.scoreHeaderPb,
      }}
    >
      <MatchListScoreStrip columnCount={labels.length}>
        {labels.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={{
              width: metrics.colWidth,
              textAlign: "center",
              fontFamily: exploreFontFamily.extraBold,
              fontSize: L.scoreLabel,
              color: exploreColors.scoreMuted,
              marginRight: index < labels.length - 1 ? metrics.gap : 0,
            }}
          >
            {label}
          </Text>
        ))}
      </MatchListScoreStrip>
    </View>
  );
}

type MatchListCardFooterDateProps = {
  matchDate: string;
  onPress: PressableProps["onPress"];
};

export function MatchListCardFooterDate({ matchDate, onPress }: MatchListCardFooterDateProps) {
  const label = formatExploreFooterDate(matchDate);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ? `Match date ${label}` : "Open match"}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexShrink: 1,
        maxWidth: "100%",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LucideIcon
          name="Calendar"
          size={L.footerIcon}
          color={exploreColors.scoreMuted}
          style={{ marginRight: L.footerIconMr, flexShrink: 0 }}
        />
        <Text
          numberOfLines={1}
          style={{
            fontFamily: exploreFontFamily.regular,
            fontSize: L.footerFont,
            color: exploreColors.scoreMuted,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function MatchListScheduledRow({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: L.inlineGap,
        marginTop: L.inlineMt,
        marginBottom: L.inlineMb,
      }}
    >
      <LucideIcon name="Clock" size={L.scheduledIcon} color={exploreColors.accent.scheduled} />
      <Text
        style={{
          fontFamily: exploreFontFamily.bold,
          fontSize: L.scheduledFont,
          color: exploreColors.accent.scheduled,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function MatchListCancelledNote() {
  return (
    <Text
      style={{
        fontFamily: exploreFontFamily.regular,
        fontSize: L.noteFont,
        fontStyle: "italic",
        color: exploreColors.muted,
        marginTop: L.inlineMt,
        marginBottom: L.inlineMb,
      }}
    >
      Match was cancelled — no result recorded.
    </Text>
  );
}
