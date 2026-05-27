import type { MatchSet } from "../../types/match";
import type { MatchStatus } from "../../types/match";

/** True when any set has a score greater than zero (not a 0–0 placeholder row). */
export function hasEnterableMatchScores(sets: MatchSet[]): boolean {
  return sets.some((set) => set.playerAScore > 0 || set.playerBScore > 0);
}

/**
 * Backend: SCHEDULED matches must not include set rows.
 * Blocks saving as scheduled when the form has real scores.
 */
export function scheduledSaveBlockedMessage(sets: MatchSet[]): string | null {
  if (!hasEnterableMatchScores(sets)) {
    return null;
  }
  return "Scheduled matches can't include scores. Start the match as Live, or clear all scores.";
}

/** Whether a scheduled match should transition to LIVE based on entered scores. */
export function shouldPromoteScheduledToLive(
  currentStatus: MatchStatus | undefined,
  sets: MatchSet[]
): boolean {
  return currentStatus === "scheduled" && hasEnterableMatchScores(sets);
}

export function scheduledMatchSaveLabel(hasScores: boolean): string {
  return hasScores ? "Can't save as Scheduled" : "Save as Scheduled";
}
