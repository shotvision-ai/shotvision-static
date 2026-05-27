import type { Match } from "../../types/match";
import { matchService } from "../services/api/matchService";
import { enrichMyDashboardMatches } from "./enrichMyDashboardMatches";
import {
  getMatchOwnershipSnapshot,
  useMatchOwnershipStore,
} from "../stores/matchOwnershipStore";

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

/** Recent GET `/api/matches/my` snapshot from ownership sync — avoids duplicate fetch when possible. */
export function getMyMatchesCachedForExplore(viewerUserId: string): Match[] | null {
  const id = viewerUserId.trim();
  if (!id || !myMatchesExploreCache || myMatchesExploreCache.userId !== id) {
    return null;
  }
  return myMatchesExploreCache.items;
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
    const response = await matchService.getMyMatches(1, 100, "all");
    const items = enrichMyDashboardMatches(response.items, id);
    syncMatchOwnershipFromMatches(items);
    myMatchesExploreCache = { userId: id, items };
    ownershipSyncedForUserId = id;
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
  const enriched = applyMatchOwnershipList(items);
  if (!viewerUserId?.trim()) return enriched;
  return enriched;
}

/**
 * Detail/edit flows: apply ownership cache so creator checks work when the API omits `creatorId`.
 */
export function enrichMatchForViewer(match: Match, viewerUserId: string | undefined): Match {
  const owned = applyMatchOwnership(match);
  const viewerId = viewerUserId?.trim();
  if (owned.creatorId?.trim() || !viewerId) return owned;

  const snap = getMatchOwnershipSnapshot(owned.id);
  if (snap?.creatorId === viewerId) {
    return { ...owned, creatorId: viewerId };
  }

  return owned;
}
