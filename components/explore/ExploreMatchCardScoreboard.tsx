import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "~/components/ui/text";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import {
  formatMatchCardScoreCell,
  matchCardScoreColumnMetrics,
} from "../../src/utils/matchListScores";
import { MATCH_LIST_CARD as E, matchListLeadingWidth } from "../match/matchListCardLayout";

type ExploreMatchCardScoreboardProps = {
  labels: string[];
  playerA: { name: string; initials: string; scores: number[] };
  playerB: { name: string; initials: string; scores: number[] };
  cancelled: boolean;
  showScores: boolean;
  onPressPlayer: () => void;
};

function ExploreScoreColumns({
  columnCount,
  children,
}: {
  columnCount: number;
  children: React.ReactNode;
}) {
  const metrics = matchCardScoreColumnMetrics(columnCount, E);
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
  );
  if (!metrics.scrollable) return row;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, flexShrink: 0 }}
    >
      {row}
    </ScrollView>
  );
}

function SetLabelRow({ labels }: { labels: string[] }) {
  const metrics = matchCardScoreColumnMetrics(labels.length, E);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: E.scoreHeaderPb }}>
      <View style={{ width: matchListLeadingWidth }} />
      <View style={{ flex: 1 }} />
      <ExploreScoreColumns columnCount={labels.length}>
        {labels.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={{
              width: metrics.colWidth,
              textAlign: "center",
              fontFamily: exploreFontFamily.extraBold,
              fontSize: E.scoreLabel,
              color: exploreColors.scoreMuted,
              marginRight: index < labels.length - 1 ? metrics.gap : 0,
            }}
          >
            {label}
          </Text>
        ))}
      </ExploreScoreColumns>
    </View>
  );
}

type PlayerScoreRowProps = {
  name: string;
  initials: string;
  side: "A" | "B";
  scores: number[];
  showScores: boolean;
  cancelled: boolean;
  showDivider: boolean;
  onPress: () => void;
};

function PlayerScoreRow({
  name,
  initials,
  side,
  scores,
  showScores,
  cancelled,
  showDivider,
  onPress,
}: PlayerScoreRowProps) {
  const metrics = matchCardScoreColumnMetrics(scores.length, E);
  const avatarBg = cancelled
    ? exploreColors.badge.publicBg
    : side === "A"
      ? exploreColors.playerA
      : exploreColors.playerB;
  const avatarFg = cancelled ? exploreColors.muted : "#FFFFFF";
  const nameColor = cancelled ? exploreColors.muted : exploreColors.ink;
  const scoreColor = cancelled ? exploreColors.scoreMuted : exploreColors.ink;

  return (
    <>
      {showDivider ? (
        <View
          style={{
            height: 1,
            backgroundColor: exploreColors.cardBorderHairline,
            marginVertical: E.dividerMv,
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
            paddingVertical: E.rowPy,
          }}
        >
          <View
            style={{
              width: E.avatar,
              height: E.avatar,
              borderRadius: E.avatarRadius,
              backgroundColor: avatarBg,
              justifyContent: "center",
              alignItems: "center",
              marginRight: E.avatarMr,
            }}
          >
            <Text
              style={{
                fontFamily: exploreFontFamily.extraBold,
                fontSize: E.avatarFont,
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
              fontSize: E.playerName,
              color: nameColor,
              marginRight: showScores ? 6 : 0,
            }}
          >
            {name}
          </Text>
          {showScores ? (
            <ExploreScoreColumns columnCount={scores.length}>
              {scores.map((score, index) => (
                <Text
                  key={index}
                  style={{
                    width: metrics.colWidth,
                    textAlign: "center",
                    fontFamily: exploreFontFamily.black,
                    fontSize: metrics.fontSize,
                    color: scoreColor,
                    marginRight: index < scores.length - 1 ? metrics.gap : 0,
                  }}
                >
                  {formatMatchCardScoreCell(score)}
                </Text>
              ))}
            </ExploreScoreColumns>
          ) : null}
        </View>
      </Pressable>
    </>
  );
}

export function ExploreMatchCardScoreboard({
  labels,
  playerA,
  playerB,
  cancelled,
  showScores,
  onPressPlayer,
}: ExploreMatchCardScoreboardProps) {
  return (
    <View style={{ marginBottom: E.scoreboardMb }}>
      {showScores && labels.length > 0 ? <SetLabelRow labels={labels} /> : null}
      <PlayerScoreRow
        name={playerA.name}
        initials={playerA.initials}
        side="A"
        scores={playerA.scores}
        showScores={showScores}
        cancelled={cancelled}
        showDivider={false}
        onPress={onPressPlayer}
      />
      <PlayerScoreRow
        name={playerB.name}
        initials={playerB.initials}
        side="B"
        scores={playerB.scores}
        showScores={showScores}
        cancelled={cancelled}
        showDivider
        onPress={onPressPlayer}
      />
    </View>
  );
}
