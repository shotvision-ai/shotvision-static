import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/components/ui/text";
import type { Match, MatchSet } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import {
  exploreColors,
  exploreFontFamily,
  formatScheduledLabel,
  playerInitials,
} from "~/lib/exploreDesign";
import { extractCancellationReason } from "../../../src/utils/matchCancellation";
import { matchListStatusAccent, MatchListStatusBadge } from "../list/MatchListCardShared";
import { canOwnerCompleteMatch } from "../../../src/utils/matchCompletion";
import { STANDARD_HIT_SLOP } from "../../../src/utils/touchA11y";

type MatchDetailHeroCardProps = {
  match: Match;
  isCreator: boolean;
  currentUserId?: string;
  organiserLabel: string;
  onSaveComplete?: () => void;
  onStartLive?: () => void;
  isStartingLive?: boolean;
};

function setScoreTone(
  set: MatchSet | undefined,
  side: "A" | "B"
): "win" | "lose" | "neutral" | "empty" {
  if (!set) return "empty";
  const aAhead = set.playerAScore > set.playerBScore;
  const bAhead = set.playerBScore > set.playerAScore;
  if (side === "A") {
    if (aAhead) return "win";
    if (bAhead) return "lose";
    return "neutral";
  }
  if (bAhead) return "win";
  if (aAhead) return "lose";
  return "neutral";
}

function ScoreCell({
  value,
  tone,
}: {
  value: number | null;
  tone: "win" | "lose" | "neutral" | "empty";
}) {
  if (value == null || tone === "empty") {
    return (
      <Text
        style={{
          width: 36,
          textAlign: "center",
          fontFamily: exploreFontFamily.regular,
          fontSize: 17,
          color: exploreColors.scoreMuted,
        }}
      >
        —
      </Text>
    );
  }

  if (tone === "win") {
    return (
      <View
        style={{
          minWidth: 36,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 10,
          backgroundColor: exploreColors.accent.finished,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: exploreFontFamily.black,
            fontSize: 17,
            color: "#FFFFFF",
          }}
        >
          {value}
        </Text>
      </View>
    );
  }

  return (
    <Text
      style={{
        width: 36,
        textAlign: "center",
        fontFamily: exploreFontFamily.black,
        fontSize: 17,
        color: exploreColors.ink,
      }}
    >
      {value}
    </Text>
  );
}

type PlayerRowProps = {
  name: string;
  initials: string;
  side: "A" | "B";
  sets: MatchSet[];
  nameMuted: boolean;
  showScores: boolean;
  showDivider: boolean;
};

function HeroPlayerRow({
  name,
  initials,
  side,
  sets,
  nameMuted,
  showScores,
  showDivider,
}: PlayerRowProps) {
  const avatarBg =
    side === "A" ? exploreColors.playerA : exploreColors.playerB;

  return (
    <>
      {showDivider ? (
        <View style={{ height: 1, backgroundColor: exploreColors.divider, marginVertical: 4 }} />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: avatarBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
          }}
        >
          <Text
            style={{
              fontFamily: exploreFontFamily.extraBold,
              fontSize: 17,
              color: "#FFFFFF",
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
            fontSize: 17,
            color: nameMuted ? exploreColors.muted : exploreColors.ink,
          }}
        >
          {name}
        </Text>
        {showScores ? (
          <View style={{ flexDirection: "row", gap: 14 }}>
            <ScoreCell
              value={side === "A" ? (sets[0]?.playerAScore ?? null) : (sets[0]?.playerBScore ?? null)}
              tone={setScoreTone(sets[0], side)}
            />
            <ScoreCell
              value={side === "A" ? (sets[1]?.playerAScore ?? null) : (sets[1]?.playerBScore ?? null)}
              tone={setScoreTone(sets[1], side)}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

export function MatchDetailHeroCard({
  match,
  isCreator,
  currentUserId,
  organiserLabel,
  onSaveComplete,
  onStartLive,
  isStartingLive = false,
}: MatchDetailHeroCardProps) {
  const sets = (match.sets ?? []).slice(0, 2);
  const showScores =
    match.status === "live" ||
    match.status === "completed" ||
    ((match.sets ?? []).length > 0 && match.status !== "scheduled");
  const winnerA = match.winner === "playerA";
  const winnerB = match.winner === "playerB";
  const loserA = match.status === "completed" && winnerB;
  const loserB = match.status === "completed" && winnerA;
  const showComplete =
    isCreator &&
    onSaveComplete &&
    canOwnerCompleteMatch(match, currentUserId, { isOwnDashboardMatch: true });
  const showStartLive = isCreator && match.status === "scheduled" && onStartLive;

  const winnerText =
    match.status === "completed" && match.winner
      ? `${match.winner === "playerA" ? match.playerA : match.playerB} won`
      : null;

  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 20,
        backgroundColor: exploreColors.cardBg,
        borderWidth: 1,
        borderColor: exploreColors.cardBorder,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <View style={{ width: 4, backgroundColor: matchListStatusAccent(match.status) }} />
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <LucideIcon name="User" size={14} color={exploreColors.muted} />
            <Text style={{ fontFamily: exploreFontFamily.regular, fontSize: 12, color: exploreColors.muted }}>
              Organised by{" "}
              <Text style={{ fontFamily: exploreFontFamily.bold }}>{organiserLabel}</Text>
            </Text>
          </View>
          <MatchListStatusBadge status={match.status} />
        </View>

        {winnerText ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <LucideIcon name="Trophy" size={14} color={exploreColors.trophyGold} />
            <Text
              style={{
                fontFamily: exploreFontFamily.bold,
                fontSize: 13,
                color: exploreColors.trophyGold,
              }}
            >
              {winnerText}
            </Text>
          </View>
        ) : null}

        {showScores ? (
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: "row", gap: 14 }}>
              {(["SET 1", "SET 2"] as const).map((label) => (
                <Text
                  key={label}
                  style={{
                    width: 36,
                    textAlign: "center",
                    fontFamily: exploreFontFamily.extraBold,
                    fontSize: 10,
                    letterSpacing: 0.4,
                    color: exploreColors.scoreMuted,
                  }}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <HeroPlayerRow
          name={match.playerA}
          initials={playerInitials(match.playerA)}
          side="A"
          sets={sets}
          nameMuted={Boolean(loserA)}
          showScores={showScores}
          showDivider={false}
        />
        <HeroPlayerRow
          name={match.playerB}
          initials={playerInitials(match.playerB)}
          side="B"
          sets={sets}
          nameMuted={Boolean(loserB)}
          showScores={showScores}
          showDivider
        />

        {match.status === "scheduled" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <LucideIcon name="Clock" size={14} color={exploreColors.accent.scheduled} />
            <Text
              style={{
                fontFamily: exploreFontFamily.bold,
                fontSize: 13,
                color: exploreColors.accent.scheduled,
              }}
            >
              {formatScheduledLabel(match.matchDate)}
            </Text>
          </View>
        ) : null}

        {match.status === "cancelled" ? (
          <Text
            style={{
              marginTop: 8,
              fontFamily: exploreFontFamily.regular,
              fontSize: 13,
              fontStyle: "italic",
              color: exploreColors.muted,
            }}
          >
            {extractCancellationReason(match)
              ? `Match was cancelled — ${extractCancellationReason(match)}`
              : "Match was cancelled — no result recorded."}
          </Text>
        ) : null}

        {showStartLive ? (
          <TouchableOpacity
            onPress={onStartLive}
            disabled={isStartingLive}
            hitSlop={STANDARD_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Start match live"
            style={{
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: exploreColors.coral,
              alignItems: "center",
              opacity: isStartingLive ? 0.6 : 1,
            }}
          >
            {isStartingLive ? (
              <ActivityIndicator color={exploreColors.coral} />
            ) : (
              <Text
                style={{
                  fontFamily: exploreFontFamily.extraBold,
                  fontSize: 14,
                  color: exploreColors.coral,
                }}
              >
                Start Live
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        {showComplete ? (
          <TouchableOpacity
            onPress={onSaveComplete}
            hitSlop={STANDARD_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Save and complete match"
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: exploreColors.coral,
            }}
          >
            <LucideIcon name="CircleCheck" size={20} color="#FFFFFF" />
            <Text
              style={{
                fontFamily: exploreFontFamily.extraBold,
                fontSize: 15,
                color: "#FFFFFF",
              }}
            >
              Save & Complete
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
