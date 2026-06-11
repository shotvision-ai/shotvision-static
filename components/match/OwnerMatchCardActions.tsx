import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import type { Match } from "~/types/match";
import {
  canEditMatchNotes,
  isMatchEditableByCreator,
  isMatchOwner,
  resolveMatchEditOwnerOptions,
  resolveMatchLifecycleFields,
} from "~/src/utils/matchEditEligibility";
import { canOwnerCompleteMatch } from "~/src/utils/matchCompletion";
import { getEditMatchNotesHref } from "~/src/utils/matchNotes";
import { getEditMatchCompleteHref, getEditMatchHref } from "~/src/utils/matchLifecycle";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { MATCH_LIST_CARD as L } from "./matchListCardLayout";
import { useAppTheming } from "~/src/hooks/useAppTheming";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

type OwnerMatchCardActionsProps = {
  match: Match;
  currentUserId: string | undefined;
  /** My Matches list — viewer is always the organizer. */
  isOwnDashboardMatch?: boolean;
  compact?: boolean;
  /** Match Explore list card spacing and coral/green styling. */
  exploreList?: boolean;
};

/**
 * Owner-only management row shared by My Matches and Explore cards.
 * Requires `match.creatorId` (or ownership cache) to be set for explore items.
 */
export function OwnerMatchCardActions({
  match,
  currentUserId,
  isOwnDashboardMatch = false,
  compact = false,
  exploreList = false,
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
  const notesEditable = canEditMatchNotes(resolvedMatch, currentUserId, ownerOptions);

  const showCompleteAction = canOwnerCompleteMatch(resolvedMatch, currentUserId, ownerOptions);

  const listCompact = compact || exploreList;
  const actionMb = exploreList ? L.actionMb : listCompact ? 4 : 12;
  const actionMinH = exploreList ? L.actionMinH : listCompact ? 32 : 44;
  const actionPy = exploreList ? L.actionPy : listCompact ? 8 : 10;
  const actionFont = exploreList ? L.actionFont : listCompact ? 13 : 13;
  const actionCompleteFont = exploreList ? L.actionCompleteFont : actionFont;
  const iconSize = exploreList ? L.actionIcon : listCompact ? 16 : 14;
  const editRowPt = listCompact ? 0 : 12;
  const editRowMb = exploreList ? L.actionMb : listCompact ? 4 : 12;
  const editRowGap = exploreList ? L.actionGap : listCompact ? 8 : 8;
  const actionRadius = exploreList ? L.actionRadius : 10;
  const actionMt = exploreList ? L.actionMt : 0;
  const actionRowMt = exploreList ? L.actionRowMt : 0;
  const completeMt = exploreList ? L.actionMt : 0;

  return (
    <View>
      {resolvedMatch.status === "scheduled" ? (
        <TouchableOpacity
          onPress={() => router.push(getEditMatchHref(resolvedMatch.id))}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Start scheduled match as live"
          style={{
            minHeight: actionMinH,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: actionMt,
            marginBottom: actionMb,
            paddingVertical: actionPy,
            borderRadius: actionRadius,
            backgroundColor: exploreList ? exploreColors.editBtnBg : "rgba(37,99,235,0.1)",
            borderWidth: exploreList ? 0 : 1,
            borderColor: "rgba(37,99,235,0.3)",
          }}
        >
          <LucideIcon
            name="Play"
            size={iconSize}
            color={exploreList ? exploreColors.editBtnText : "#2563eb"}
          />
          <Text
            style={{
              fontFamily: exploreList ? exploreFontFamily.extraBold : undefined,
              fontSize: actionFont,
              fontWeight: exploreList ? undefined : "600",
              color: exploreList ? exploreColors.editBtnText : "#2563eb",
            }}
          >
            Start Live
          </Text>
        </TouchableOpacity>
      ) : null}

      {showCompleteAction ? (
        <TouchableOpacity
          onPress={() => router.push(getEditMatchCompleteHref(resolvedMatch.id))}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Save and complete match"
          style={{
            minHeight: actionMinH,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: completeMt,
            marginBottom: actionMb,
            paddingVertical: actionPy,
            borderRadius: actionRadius,
            backgroundColor: exploreList
              ? exploreColors.completeBtnBg
              : "rgba(34,197,94,0.1)",
            borderWidth: exploreList ? 0 : 1,
            borderColor: "rgba(34,197,94,0.3)",
          }}
        >
          <LucideIcon
            name="CircleCheck"
            size={iconSize}
            color={exploreList ? exploreColors.completeBtnText : "#16a34a"}
          />
          <Text
            style={{
              fontFamily: exploreList ? exploreFontFamily.extraBold : undefined,
              fontSize: actionCompleteFont,
              fontWeight: exploreList ? undefined : "600",
              color: exploreList ? exploreColors.completeBtnText : "#16a34a",
            }}
          >
            Save & Complete
          </Text>
        </TouchableOpacity>
      ) : null}

      {editWindow || notesEditable ? (
        <View
          style={{
            flexDirection: "row",
            gap: editRowGap,
            marginTop: exploreList && !showCompleteAction ? actionRowMt : 0,
            marginBottom: editRowMb,
            paddingTop: editRowPt,
            borderTopWidth: exploreList ? 0 : 1,
            borderTopColor: colors.dividerSubtle,
          }}
        >
          {editWindow && resolvedMatch.status !== "completed" ? (
            <TouchableOpacity
              onPress={() => router.push(getEditMatchHref(resolvedMatch.id))}
              hitSlop={STANDARD_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Edit match"
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: actionMinH,
                paddingVertical: actionPy,
                borderRadius: actionRadius,
                backgroundColor: exploreList ? exploreColors.editBtnBg : "rgba(37,99,235,0.08)",
                borderWidth: exploreList ? 0 : 1,
                borderColor: "rgba(37,99,235,0.2)",
              }}
            >
              <LucideIcon
                name="PenLine"
                size={iconSize}
                color={exploreList ? exploreColors.editBtnText : "#2563eb"}
              />
              <Text
                style={{
                  fontFamily: exploreList ? exploreFontFamily.extraBold : undefined,
                  fontSize: actionFont,
                  fontWeight: exploreList ? undefined : "600",
                  color: exploreList ? exploreColors.editBtnText : "#2563eb",
                }}
              >
                Edit
              </Text>
            </TouchableOpacity>
          ) : null}
          {notesEditable ? (
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
                minHeight: actionMinH,
                paddingVertical: actionPy,
                borderRadius: actionRadius,
                backgroundColor: exploreList ? exploreColors.notesBtnBg : "rgba(245,158,11,0.08)",
                borderWidth: exploreList ? 0 : 1,
                borderColor: "rgba(245,158,11,0.2)",
              }}
            >
              <LucideIcon
                name="FileText"
                size={iconSize}
                color={exploreList ? exploreColors.coral : "#f59e0b"}
              />
              <Text
                style={{
                  fontFamily: exploreList ? exploreFontFamily.extraBold : undefined,
                  fontSize: actionFont,
                  fontWeight: exploreList ? undefined : "600",
                  color: exploreList ? exploreColors.coral : "#f59e0b",
                }}
              >
                Notes
              </Text>
            </TouchableOpacity>
          ) : null}
          {editWindow && resolvedMatch.status === "completed" && !exploreList ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: "rgba(0,0,0,0.04)",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: colors.muted, fontWeight: "500" }}>48h scores</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
