import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import type { Match } from "~/types/match";
import {
  isMatchEditableByCreator,
  isMatchOwner,
  resolveMatchEditOwnerOptions,
  resolveMatchLifecycleFields,
} from "~/src/utils/matchEditEligibility";
import { canOwnerCompleteMatch } from "~/src/utils/matchCompletion";
import { getEditMatchNotesHref } from "~/src/utils/matchNotes";
import { getEditMatchCompleteHref, getEditMatchHref } from "~/src/utils/matchLifecycle";
import { useAppTheming } from "~/src/hooks/useAppTheming";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

type OwnerMatchCardActionsProps = {
  match: Match;
  currentUserId: string | undefined;
  /** My Matches list — viewer is always the organizer. */
  isOwnDashboardMatch?: boolean;
};

/**
 * Owner-only management row shared by My Matches and Explore cards.
 * Requires `match.creatorId` (or ownership cache) to be set for explore items.
 */
export function OwnerMatchCardActions({
  match,
  currentUserId,
  isOwnDashboardMatch = false,
}: OwnerMatchCardActionsProps) {
  const router = useRouter();
  const { colors, brand } = useAppTheming();
  const resolvedMatch = resolveMatchLifecycleFields(match);
  const ownerOptions =
    resolveMatchEditOwnerOptions(resolvedMatch, currentUserId) ??
    (isOwnDashboardMatch ? { isOwnDashboardMatch: true } : undefined);

  if (!isMatchOwner(resolvedMatch, currentUserId, ownerOptions)) {
    return null;
  }

  const editWindow = isMatchEditableByCreator(resolvedMatch, currentUserId, ownerOptions);

  const showCompleteAction = canOwnerCompleteMatch(resolvedMatch, currentUserId, ownerOptions);

  return (
    <View>
      {resolvedMatch.status === "scheduled" ? (
        <TouchableOpacity
          onPress={() => router.push(getEditMatchHref(resolvedMatch.id))}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Start scheduled match as live"
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 12,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: "rgba(37,99,235,0.1)",
            borderWidth: 1,
            borderColor: "rgba(37,99,235,0.3)",
          }}
        >
          <LucideIcon name="Play" size={14} color="#2563eb" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#2563eb" }}>Start Live</Text>
        </TouchableOpacity>
      ) : null}

      {showCompleteAction ? (
        <TouchableOpacity
          onPress={() => router.push(getEditMatchCompleteHref(resolvedMatch.id))}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Save and complete match"
          style={{
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 12,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: "rgba(34,197,94,0.1)",
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.3)",
          }}
        >
          <LucideIcon name="CircleCheck" size={14} color="#16a34a" />
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#16a34a" }}>Save & Complete</Text>
        </TouchableOpacity>
      ) : null}

      {editWindow ? (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.dividerSubtle,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push(getEditMatchHref(resolvedMatch.id))}
            hitSlop={STANDARD_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={
              resolvedMatch.status === "live" || resolvedMatch.status === "scheduled"
                ? "Edit match"
                : "Edit score"
            }
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 44,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: "rgba(37,99,235,0.08)",
              borderWidth: 1,
              borderColor: "rgba(37,99,235,0.2)",
            }}
          >
            <LucideIcon name="PenLine" size={14} color="#2563eb" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563eb" }}>Edit Score</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(getEditMatchNotesHref(resolvedMatch.id))}
            hitSlop={STANDARD_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Edit match notes"
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 44,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: "rgba(245,158,11,0.08)",
              borderWidth: 1,
              borderColor: "rgba(245,158,11,0.2)",
            }}
          >
            <LucideIcon name="StickyNote" size={14} color="#f59e0b" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#f59e0b" }}>Notes</Text>
          </TouchableOpacity>
          {resolvedMatch.status === "completed" ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: "rgba(0,0,0,0.04)",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: colors.muted, fontWeight: "500" }}>48h limit</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
