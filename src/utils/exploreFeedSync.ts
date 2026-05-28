import type { Match } from "../../types/match";
import type { MatchStatusFilter } from "../services/api/matchService";
import {
  applyMatchOwnershipList,
  ensureMatchOwnershipSynced,
  getMyMatchesCachedForExplore,
} from "./matchOwnership";
import { getMatchVisibilitySnapshot } from "../stores/matchVisibilityStore";
import { isPublicForExploreSupplement } from "./explorePublicSync";
import { devLog } from "./devLog";

function matchesExploreStatusFilter(match: Match, status: MatchStatusFilter): boolean {
  if (status === "all") return true;
  return match.status === status;
}

function sortByMatchDateDesc(a: Match, b: Match): number {
  return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
}

/**
 * Final Explore feed filter.
 * Rows returned by GET `/api/matches/explore` are public by construction — never hide them
 * because of a stale local visibility snapshot (common after create/toggle lag).
 * Only suppress supplemented owner rows the user explicitly marked private.
 */
export function filterExploreFeedMatches(
  items: Match[],
  exploreApiIds: ReadonlySet<string>
): Match[] {
  let suppressedPrivate = 0;
  let suppressedMissingId = 0;
  const out = items.filter((m) => {
    const id = m.id.trim();
    if (!id) {
      suppressedMissingId += 1;
      return false;
    }
    if (exploreApiIds.has(id)) return true;
    const snap = getMatchVisibilitySnapshot(id);
    if (snap && !snap.isPublic) {
      suppressedPrivate += 1;
      return false;
    }
    return true;
  });
  if (__DEV__ && (suppressedPrivate > 0 || suppressedMissingId > 0)) {
    devLog.info(
      `[explore:filter] kept=${out.length} suppressedPrivate=${suppressedPrivate} missingId=${suppressedMissingId}`
    );
  }
  return out;
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
  const candidates = myItems.filter(
    (m) =>
      Boolean(m.id?.trim()) &&
      isPublicForExploreSupplement(m) &&
      matchesExploreStatusFilter(m, status) &&
      !exploreIds.has(m.id.trim())
  );
  const missing = applyMatchOwnershipList(candidates)
    .map((m) => ({ ...m, isPublic: true }))
    .sort(sortByMatchDateDesc);

  if (__DEV__ && missing.length > 0) {
    devLog.info(
      `[explore:supplement] added=${missing.length} fromMy=${myItems.length} exploreApi=${exploreItems.length}`
    );
  }

  if (missing.length === 0) return exploreItems;

  return [...missing, ...exploreItems];
}
