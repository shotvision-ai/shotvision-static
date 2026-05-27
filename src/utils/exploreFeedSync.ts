import type { Match } from "../../types/match";
import type { MatchStatusFilter } from "../services/api/matchService";
import {
  applyMatchOwnershipList,
  ensureMatchOwnershipSynced,
  getMyMatchesCachedForExplore,
} from "./matchOwnership";
import { getMatchVisibilitySnapshot } from "../stores/matchVisibilityStore";

function matchesExploreStatusFilter(match: Match, status: MatchStatusFilter): boolean {
  if (status === "all") return true;
  return match.status === status;
}

function sortByMatchDateDesc(a: Match, b: Match): number {
  return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
}

/** Public on server per GET `/api/matches/my` (never use stale visibility overrides here). */
function isPublicOnMyMatchesApi(m: Match): boolean {
  return Boolean(m.isPublic);
}

/**
 * Hide rows the owner explicitly made private locally (explore API may lag after toggle).
 * Do not filter by `match.isPublic` alone — explore DTOs omit the field before normalization.
 */
export function filterExploreFeedMatches(items: Match[]): Match[] {
  return items.filter((m) => {
    const id = m.id.trim();
    if (!id) return false;
    const snap = getMatchVisibilitySnapshot(id);
    if (snap && !snap.isPublic) return false;
    return true;
  });
}

/** Stable unique list for FlatList (supplement + explore API can overlap). */
export function dedupeExploreFeedMatches(items: Match[]): Match[] {
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const m of items) {
    const id = m.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(m);
  }
  return out;
}

/**
 * Explore may omit the viewer's own public matches (indexing lag or server policy).
 * Merge authoritative public rows from GET `/api/matches/my` so owners see matches they
 * just published without faking visibility — only rows the backend already stores as public.
 */
export async function supplementExploreWithViewerPublicMatches(
  exploreItems: Match[],
  viewerUserId: string | undefined,
  status: MatchStatusFilter
): Promise<Match[]> {
  const viewerId = viewerUserId?.trim();
  if (!viewerId) return exploreItems;

  if (!getMyMatchesCachedForExplore(viewerId)) {
    await ensureMatchOwnershipSynced(viewerId);
  }
  const myItems = getMyMatchesCachedForExplore(viewerId);
  if (!myItems) return exploreItems;

  const exploreIds = new Set(exploreItems.map((m) => m.id.trim()).filter(Boolean));
  const missing = applyMatchOwnershipList(
    myItems.filter(
      (m) =>
        Boolean(m.id?.trim()) &&
        isPublicOnMyMatchesApi(m) &&
        matchesExploreStatusFilter(m, status) &&
        !exploreIds.has(m.id.trim())
    )
  ).sort(sortByMatchDateDesc);

  if (missing.length === 0) return exploreItems;

  return [...missing, ...exploreItems];
}
