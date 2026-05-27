import type { Match } from "../../types/match";
import type { UpdateMatchInput } from "../services/api/matchService";
import {
  getMatchVisibilitySnapshot,
  useMatchVisibilityStore,
  type MatchVisibilitySnapshot,
} from "../stores/matchVisibilityStore";
import { invalidateMyMatchesExploreCache } from "./matchOwnership";
import {
  finishedMatchEditLockMessage,
  isFinishedMatchWithinEditWindow,
  isMatchOwner,
  type MatchEditEligibilityOptions,
} from "./matchEditEligibility";

/** FINISHED matches: PATCH only `isPublic` — never send status or sets (API_CONTRACTS.md). */
export function buildVisibilityOnlyPatch(nextPublic: boolean): UpdateMatchInput {
  return { isPublic: nextPublic };
}

export function canManageMatchVisibility(
  match: Pick<Match, "id" | "status" | "matchDate" | "finishedAt" | "createdAt" | "creatorId">,
  currentUserId: string | undefined,
  options?: MatchEditEligibilityOptions
): boolean {
  if (!isMatchOwner(match, currentUserId, options)) return false;
  if (match.status === "live" || match.status === "scheduled") return true;
  if (match.status === "completed") return isFinishedMatchWithinEditWindow(match);
  return false;
}

export function matchVisibilityLockMessage(
  match: Pick<Match, "status" | "finishedAt" | "creatorId">,
  currentUserId: string | undefined,
  options?: MatchEditEligibilityOptions
): string | null {
  if (!isMatchOwner(match, currentUserId, options)) return null;
  if (match.status === "completed" && !isFinishedMatchWithinEditWindow(match)) {
    return finishedMatchEditLockMessage();
  }
  return null;
}

export function resolveMatchIsPublic(
  match: Match,
  override?: MatchVisibilitySnapshot | null
): boolean {
  const snap = override ?? getMatchVisibilitySnapshot(match.id);
  if (snap) return snap.isPublic;
  return Boolean(match.isPublic);
}

export function applyMatchVisibilityOverrides(match: Match): Match {
  const snap = getMatchVisibilitySnapshot(match.id);
  if (!snap) return match;
  return { ...match, isPublic: snap.isPublic };
}

export function applyMatchVisibilityOverridesList(matches: Match[]): Match[] {
  return matches.map(applyMatchVisibilityOverrides);
}

export function seedMatchVisibilityFromMatch(match: Match, options?: { markExploreStale?: boolean }): void {
  const id = match.id.trim();
  if (!id) return;
  useMatchVisibilityStore.getState().setSnapshot(id, { isPublic: Boolean(match.isPublic) });
  if (options?.markExploreStale) {
    invalidateMyMatchesExploreCache();
    useMatchVisibilityStore.getState().markAllListsStale();
  }
}

/**
 * Sync visibility snapshots from authoritative list/detail API rows.
 * Explore rows are normalized with `isPublic: true`; my-matches rows use server `isPublic`.
 */
export function reconcileVisibilityFromApiItems(matches: Match[]): void {
  const state = useMatchVisibilityStore.getState();
  for (const m of matches) {
    const id = m.id.trim();
    if (!id) continue;
    state.setSnapshot(id, { isPublic: Boolean(m.isPublic) });
  }
}

/**
 * GET `/api/matches/explore` only returns public matches — force snapshots so stale
 * private flags cannot suppress feed rows on the next pipeline pass.
 */
export function reconcileExploreApiVisibility(exploreApiMatches: Match[]): void {
  const state = useMatchVisibilityStore.getState();
  for (const m of exploreApiMatches) {
    const id = m.id.trim();
    if (!id) continue;
    state.setSnapshot(id, { isPublic: true });
  }
}
