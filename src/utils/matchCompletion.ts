import type { Match, MatchSet } from "../../types/match";
import { isMatchOwner, type MatchEditEligibilityOptions } from "./matchEditEligibility";

export function calculateWinnerFromSets(sets: MatchSet[]): "playerA" | "playerB" | undefined {
  let playerAWins = 0;
  let playerBWins = 0;

  for (const set of sets) {
    if (set.playerAScore > set.playerBScore) playerAWins++;
    else if (set.playerBScore > set.playerAScore) playerBWins++;
  }

  if (playerAWins > playerBWins) return "playerA";
  if (playerBWins > playerAWins) return "playerB";
  return undefined;
}

/** True when scores define a winner — required before POST `/finish`. */
export function canCompleteMatchWithScores(
  playerA: string,
  playerB: string,
  sets: MatchSet[]
): boolean {
  if (!playerA.trim() || !playerB.trim()) return false;
  if (sets.length === 0) return false;
  if (!sets.every((set) => set.playerAScore > 0 || set.playerBScore > 0)) return false;
  return calculateWinnerFromSets(sets) !== undefined;
}

export function canOwnerCompleteMatch(
  match: Pick<Match, "status" | "creatorId"> | null | undefined,
  currentUserId: string | undefined,
  options?: MatchEditEligibilityOptions
): boolean {
  if (!match || !isMatchOwner(match, currentUserId, options)) return false;
  return match.status === "live" || match.status === "scheduled";
}

export function completeMatchValidationMessage(
  playerA: string,
  playerB: string,
  sets: MatchSet[]
): string | null {
  if (!playerA.trim() || !playerB.trim()) {
    return "Enter both player names before completing the match.";
  }
  if (sets.length === 0) {
    return "Add at least one set score before completing the match.";
  }
  if (!sets.every((set) => set.playerAScore > 0 || set.playerBScore > 0)) {
    return "Each set needs at least one score greater than zero.";
  }
  if (!calculateWinnerFromSets(sets)) {
    return "Enter scores so one player wins more sets than the other.";
  }
  return null;
}
