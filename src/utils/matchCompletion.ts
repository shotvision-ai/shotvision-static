import type { Match, MatchSet } from "../../types/match";
import { isMatchOwner, type MatchEditEligibilityOptions } from "./matchEditEligibility";

const BEST_OF_THREE_MAX_SETS = 3;
const BEST_OF_THREE_REQUIRED_WINS = 2;

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

function countSetWins(sets: MatchSet[]): { playerAWins: number; playerBWins: number } {
  let playerAWins = 0;
  let playerBWins = 0;
  for (const set of sets) {
    if (set.playerAScore > set.playerBScore) playerAWins++;
    else if (set.playerBScore > set.playerAScore) playerBWins++;
  }
  return { playerAWins, playerBWins };
}

/** True when scores define a winner — required before POST `/finish`. */
export function canCompleteMatchWithScores(
  playerA: string,
  playerB: string,
  sets: MatchSet[]
): boolean {
  if (!playerA.trim() || !playerB.trim()) return false;
  if (sets.length === 0) return false;
  if (sets.length > BEST_OF_THREE_MAX_SETS) return false;
  if (!sets.every((set) => set.playerAScore > 0 || set.playerBScore > 0)) return false;
  const { playerAWins, playerBWins } = countSetWins(sets);
  if (playerAWins < BEST_OF_THREE_REQUIRED_WINS && playerBWins < BEST_OF_THREE_REQUIRED_WINS) {
    return false;
  }
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
  if (sets.length > BEST_OF_THREE_MAX_SETS) {
    return "A standard match is best of 3 sets. Keep at most 3 sets before completing.";
  }
  if (!sets.every((set) => set.playerAScore > 0 || set.playerBScore > 0)) {
    return "Each set needs at least one score greater than zero.";
  }
  const { playerAWins, playerBWins } = countSetWins(sets);
  if (playerAWins < BEST_OF_THREE_REQUIRED_WINS && playerBWins < BEST_OF_THREE_REQUIRED_WINS) {
    return "A player must win at least 2 sets to complete a best-of-3 match.";
  }
  if (!calculateWinnerFromSets(sets)) {
    return "Enter scores so one player has more set wins than the other.";
  }
  return null;
}
