import { MATCH_LIST_CARD } from "../../components/match/matchListCardLayout";
import type { Match, MatchSet } from "../../types/match";
import { applyMatchSets } from "../stores/matchSetsStore";

const L = MATCH_LIST_CARD;

export type MatchCardSetColumns = {
  labels: string[];
  scoreA: number[];
  scoreB: number[];
};

function setHasEnteredScore(set: MatchSet): boolean {
  return set.playerAScore > 0 || set.playerBScore > 0;
}

/** Drop trailing 0–0 sets that were never started (e.g. empty “Add Set” slots). */
export function visibleMatchSets(sets: MatchSet[]): MatchSet[] {
  if (sets.length === 0) return [];
  let last = sets.length - 1;
  while (last > 0 && !setHasEnteredScore(sets[last])) {
    last -= 1;
  }
  return sets.slice(0, last + 1);
}

export function setColumnLabel(index: number): string {
  return `S${index + 1}`;
}

/**
 * All visible set columns for list cards (S1 … SN).
 * Set 1 is always shown when present; later sets appear when included after trimming trailing empties.
 */
export function getMatchCardSetColumns(match: Match): MatchCardSetColumns {
  const resolved = applyMatchSets(match);
  const sets = visibleMatchSets(resolved.sets ?? []);
  const labels: string[] = [];
  const scoreA: number[] = [];
  const scoreB: number[] = [];

  for (let i = 0; i < sets.length; i++) {
    labels.push(setColumnLabel(i));
    scoreA.push(sets[i].playerAScore);
    scoreB.push(sets[i].playerBScore);
  }

  return { labels, scoreA, scoreB };
}

export function formatMatchCardScoreCell(value: number): string {
  return String(value);
}

export function shouldShowMatchCardScores(status: Match["status"]): boolean {
  return status === "live" || status === "completed";
}

export function shouldShowMatchCardScoreRows(match: Match): boolean {
  return shouldShowMatchCardScores(match.status) && getMatchCardSetColumns(match).labels.length > 0;
}

export type MatchCardScoreColumnLayout = {
  scoreColW: number;
  scoreColWCompact: number;
  scoreColWDense: number;
  scoreColGap: number;
  scoreColGapTight: number;
  scoreFont: number;
  scoreFontCompact: number;
};

/** Column width + gap for N set columns on list cards. */
export function matchCardScoreColumnMetrics(
  count: number,
  layout: MatchCardScoreColumnLayout = L
): {
  colWidth: number;
  gap: number;
  fontSize: number;
  scrollable: boolean;
} {
  if (count <= 2) {
    return {
      colWidth: layout.scoreColW,
      gap: layout.scoreColGap,
      fontSize: layout.scoreFont,
      scrollable: false,
    };
  }
  if (count <= 5) {
    return {
      colWidth: layout.scoreColWCompact,
      gap: layout.scoreColGapTight,
      fontSize: layout.scoreFontCompact,
      scrollable: count >= 4,
    };
  }
  return {
    colWidth: layout.scoreColWDense,
    gap: layout.scoreColGapTight,
    fontSize: layout.scoreFontCompact,
    scrollable: true,
  };
}
