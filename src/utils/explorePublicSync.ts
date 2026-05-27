import type { Match } from "../../types/match";
import type { MatchStatusFilter } from "../services/api/matchService";
import { getMatchVisibilitySnapshot } from "../stores/matchVisibilityStore";
import { devLog } from "./devLog";

/**
 * Whether a row from GET `/api/matches/my` should supplement Explore when missing from the feed.
 * Prefer the visibility store when the user explicitly published (create/toggle) even if the
 * dashboard DTO omits or lags `isPublic`.
 */
export function isPublicForExploreSupplement(m: Match): boolean {
  const id = m.id.trim();
  if (!id) return false;
  const snap = getMatchVisibilitySnapshot(id);
  if (snap?.isPublic) return true;
  return Boolean(m.isPublic);
}

export function buildExploreApiIdSet(items: Match[]): Set<string> {
  const ids = new Set<string>();
  for (const m of items) {
    const id = m.id.trim();
    if (id) ids.add(id);
  }
  return ids;
}

export type ExplorePipelineStats = {
  page: number;
  status: MatchStatusFilter;
  exploreApiCount: number;
  afterSupplementCount: number;
  afterDedupeCount: number;
  afterFilterCount: number;
  supplementedCount: number;
  suppressedByPrivateSnapshot: number;
  suppressedMissingId: number;
};

export function logExplorePipelineStats(stats: ExplorePipelineStats): void {
  if (!__DEV__) return;
  devLog.info(
    `[explore:public-sync] page=${stats.page} status=${stats.status} api=${stats.exploreApiCount} +supplement=${stats.supplementedCount} deduped=${stats.afterDedupeCount} visible=${stats.afterFilterCount} suppressedPrivate=${stats.suppressedByPrivateSnapshot} missingId=${stats.suppressedMissingId}`
  );
}
