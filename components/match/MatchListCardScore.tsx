import { View } from "react-native";
import { Text } from "~/components/ui/text";
import type { Match } from "~/types/match";
import { extractCancellationReason } from "../../src/utils/matchCancellation";
import { MATCH_LIST_CARD as L } from "./matchListCardLayout";

type MatchListCardScoreProps = {
  match: Match;
};

export function MatchListCardScore({ match }: MatchListCardScoreProps) {
  const cancellation = extractCancellationReason(match);
  const statusLabel =
    match.status === "completed"
      ? "Final"
      : match.status === "live"
        ? "Live"
        : match.status === "cancelled"
          ? "Cancelled"
          : "Scheduled";

  return (
    <View style={{ marginBottom: L.sectionGap }}>
      <View className="flex-row items-center justify-between" style={{ marginBottom: 4 }}>
        <Text
          className="font-medium text-muted-foreground"
          style={{ fontSize: L.scoreLabel }}
        >
          Score
        </Text>
        <Text className="text-muted-foreground" style={{ fontSize: L.scoreLabel }}>
          {statusLabel}
        </Text>
      </View>

      {match.status === "scheduled" ? (
        <View
          className="bg-muted/40 border border-border rounded-lg"
          style={{ paddingHorizontal: L.emptyScorePadH, paddingVertical: L.emptyScorePadV }}
        >
          <Text className="text-muted-foreground" style={{ fontSize: L.meta }}>
            Match hasn’t started yet
          </Text>
        </View>
      ) : match.status === "cancelled" ? (
        <View
          className="bg-destructive/5 border border-destructive/20 rounded-lg"
          style={{ paddingHorizontal: L.emptyScorePadH, paddingVertical: L.emptyScorePadV }}
        >
          <Text className="text-muted-foreground" style={{ fontSize: L.meta }} numberOfLines={2}>
            {cancellation ? `Cancelled (${cancellation})` : "Match cancelled"}
          </Text>
        </View>
      ) : (match.sets ?? []).length > 0 ? (
        <View className="flex-row flex-wrap gap-1.5">
          {(match.sets ?? []).map((set, index) => (
            <View
              key={index}
              className="bg-muted/40 border border-border rounded-lg"
              style={{
                paddingHorizontal: L.scoreChipPadH,
                paddingVertical: L.scoreChipPadV,
              }}
            >
              <Text
                className="text-foreground font-semibold"
                style={{ fontSize: L.scoreFont }}
              >
                {set.playerAScore}-{set.playerBScore}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View
          className="bg-muted/40 border border-border rounded-lg"
          style={{ paddingHorizontal: L.emptyScorePadH, paddingVertical: L.emptyScorePadV }}
        >
          <Text className="text-muted-foreground" style={{ fontSize: L.meta }}>
            No score yet
          </Text>
        </View>
      )}
    </View>
  );
}
