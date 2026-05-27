import type { MatchSet } from "../../types/match";

type MatchWriteStatus = "live" | "scheduled" | "completed" | undefined;

/**
 * Backend rule: SCHEDULED matches must not include set rows (even 0–0 placeholders).
 */
export function setsForMatchWrite(sets: MatchSet[], status: MatchWriteStatus): MatchSet[] {
  if (status === "scheduled") {
    return [];
  }
  return sets;
}

/** Default score row for live/complete create UI when the user can enter scores. */
export const DEFAULT_LIVE_MATCH_SETS: MatchSet[] = [{ playerAScore: 0, playerBScore: 0 }];
