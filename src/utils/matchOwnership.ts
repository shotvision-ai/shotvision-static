import type { Match } from "../../types/match";
import { matchService, type MatchStatusFilter } from "../services/api/matchService";
import { MATCH_API_MAX_PAGE_SIZE } from "./exploreApiDebug";
import { enrichMyDashboardMatches } from "./enrichMyDashboardMatches";
import { devLog } from "./devLog";
import {
  getMatchOwnershipSnapshot,
  useMatchOwnershipStore,
} from "../stores/matchOwnershipStore";
import { resolveMatchLifecycleFields } from "./matchEditEligibility";

let ownershipSyncedForUserId: string | null = null;
let ownershipSyncPromise: Promise<void> | null = null;
let myMatchesExploreCache: { userId: string; items: Match[] } | null = null;

/** Clears session sync guard (call on logout). */
export function resetMatchOwnershipSession(): void {
  ownershipSyncedForUserId = null;
  ownershipSyncPromise = null;
  myMatchesExploreCache = null;
}

/** Drops cached my-matches rows used to supplement Explore (call after create/edit visibility). */
export function invalidateMyMatchesExploreCache(): void {
  myMatchesExploreCache = null;
  ownershipSyncedForUserId = null;
}

/**
 * Optimistically add/update a row in the explore supplement cache (e.g. right after create).
 * Lets Explore show a new public match before GET `/api/matches/explore` indexes it.
 */
export function seedMyMatchesExploreCacheItem(viewerUserId: string, match: Match): void {
  const userId = viewerUserId.trim();
  const matchId = match.id.trim();
  if (!userId || !matchId) return;

  const row = enrichMyDashboardMatches([{ ...match, isPublic: Boolean(match.isPublic) }], userId)[0];
  if (!row) return;

  if (!myMatchesExploreCache || myMatchesExploreCache.userId !== userId) {
    myMatchesExploreCache = { userId, items: [row] };
    return;
  }

  const items = myMatchesExploreCache.items.filter((m) => m.id.trim() !== matchId);
  myMatchesExploreCache = { userId, items: [row, ...items] };
}

/** Recent GET `/api/matches/my` snapshot from ownership sync — avoids duplicate fetch when possible. */
export function getMyMatchesCachedForExplore(viewerUserId: string): Match[] | null {
  const id = viewerUserId.trim();
  if (!id || !myMatchesExploreCache || myMatchesExploreCache.userId !== id) {
    return null;
  }
  return myMatchesExploreCache.items;
}

/** Paginate GET `/api/matches/my` — API rejects `size` > 50. */
async function fetchAllMyMatchesForExplore(
  viewerUserId: string,
  status: MatchStatusFilter = "all"
): Promise<Match[]> {
  const pageSize = MATCH_API_MAX_PAGE_SIZE;
  const collected: Match[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    const response = await matchService.getMyMatches(page, pageSize, status);
    collected.push(...enrichMyDashboardMatches(response.items, viewerUserId));
    hasMore = Boolean(response.hasNext);
    page += 1;
    if (response.items.length === 0) break;
  }

  return collected;
}

/**
 * Seeds ownership cache from GET `/api/matches/my` (explore items omit `creatorId`).
 * Runs at most once per signed-in user per app session unless `force` is true.
 */
export async function ensureMatchOwnershipSynced(
  viewerUserId: string | undefined,
  options?: { force?: boolean }
): Promise<void> {
  const id = viewerUserId?.trim();
  if (!id) return;
  if (!options?.force && ownershipSyncedForUserId === id) return;
  if (ownershipSyncPromise) {
    await ownershipSyncPromise;
    if (!options?.force && ownershipSyncedForUserId === id) return;
  }

  ownershipSyncPromise = (async () => {
    const items = await fetchAllMyMatchesForExplore(id, "all");
    syncMatchOwnershipFromMatches(items);
    myMatchesExploreCache = { userId: id, items };
    ownershipSyncedForUserId = id;
    if (__DEV__) {
      devLog.info("[explore:ownership-sync] cached my matches", {
        count: items.length,
        publicCount: items.filter((m) => m.isPublic).length,
      });
    }
  })();

  try {
    await ownershipSyncPromise;
  } finally {
    ownershipSyncPromise = null;
  }
}

/** Persist organizer ids from list/detail payloads that include `creatorId`. */
export function syncMatchOwnershipFromMatches(matches: Match[]): void {
  useMatchOwnershipStore.getState().syncFromMatches(matches);
}

export function recordMatchOwnership(
  matchId: string,
  creatorId: string,
  finishedAt?: string | null
): void {
  useMatchOwnershipStore.getState().recordOwnership(matchId, creatorId, finishedAt);
}

/**
 * Explore/dashboard list items often omit `creatorId`. Fill from the client ownership cache
 * so owner checks match My Matches behavior.
 */
export function applyMatchOwnership(match: Match): Match {
  const existing = match.creatorId?.trim();
  if (existing) return match;

  const snap = getMatchOwnershipSnapshot(match.id);
  if (!snap?.creatorId) return match;

  return { ...match, creatorId: snap.creatorId };
}

export function applyMatchOwnershipList(matches: Match[]): Match[] {
  return matches.map(applyMatchOwnership);
}

export function enrichExploreMatches(
  items: Match[],
  viewerUserId: string | undefined
): Match[] {
  const enriched = applyMatchOwnershipList(items).map(resolveMatchLifecycleFields);
  if (!viewerUserId?.trim()) return enriched;
  return enriched;
}

/**
 * Detail/edit flows: apply ownership cache so creator checks work when the API omits `creatorId`.
 */
export function enrichMatchForViewer(match: Match, viewerUserId: string | undefined): Match {
  let owned = resolveMatchLifecycleFields(applyMatchOwnership(match));
  const viewerId = viewerUserId?.trim();
  if (owned.creatorId?.trim() || !viewerId) return owned;

  const snap = getMatchOwnershipSnapshot(owned.id);
  if (snap?.creatorId === viewerId) {
    owned = resolveMatchLifecycleFields({ ...owned, creatorId: viewerId });
  }

  return owned;
}
