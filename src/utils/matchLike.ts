import type { Match } from "../../types/match";
import type { LikeMatchResponse } from "../services/api/contracts/match.types";
import {
  getMatchLikeSnapshot,
  useMatchLikeStore,
  type LikeApiContext,
  type MatchLikeSnapshot,
} from "../stores/matchLikeStore";
import { devLog } from "./devLog";

export type { LikeApiContext, MatchLikeSnapshot };

export function isValidMatchIdForApi(matchId: string): boolean {
  const id = matchId.trim();
  if (!id) return false;
  if (id.startsWith("match-")) return false;
  return true;
}

export type MatchLikeToggleOptions = {
  /** Matches from GET `/api/matches/my` — viewer is always the organizer. */
  isOwnDashboardMatch?: boolean;
};

/** Explore / detail: only non-owners can toggle likes (backend typically rejects self-likes). */
export function canUserToggleMatchLike(
  match: Pick<Match, "id" | "creatorId">,
  currentUserId: string | undefined,
  options?: MatchLikeToggleOptions
): boolean {
  if (!isValidMatchIdForApi(match.id)) return false;
  if (options?.isOwnDashboardMatch && currentUserId) return false;
  if (currentUserId && match.creatorId && match.creatorId === currentUserId) return false;
  return true;
}

export function normalizeLikeResponse(raw: unknown, fallbackMatchId: string): LikeMatchResponse {
  const r = (raw != null && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const likesRaw = r.likesCount ?? r.likes_count ?? r.likeCount;
  const likedRaw = r.likedByMe ?? r.liked_by_me ?? r.isLiked ?? r.liked;

  return {
    matchId: String(r.matchId ?? r.match_id ?? fallbackMatchId).trim(),
    likesCount:
      typeof likesRaw === "number" && !Number.isNaN(likesRaw) ? Math.max(0, likesRaw) : 0,
    likedByMe: Boolean(likedRaw),
  };
}

export function resolveMatchLikeFields(
  match: Match,
  override?: MatchLikeSnapshot | null
): { likesCount: number; isLiked: boolean } {
  const snap = override ?? getMatchLikeSnapshot(match.id);
  if (snap) {
    return { likesCount: snap.likesCount, isLiked: snap.isLiked };
  }
  return {
    likesCount: typeof match.likesCount === "number" ? match.likesCount : 0,
    isLiked: Boolean(match.isLiked),
  };
}

/** Reconcile centralized store from a list/detail API row, then return merged match for list state. */
export function hydrateMatchLikeFromApi(match: Match, context: LikeApiContext): Match {
  if (!isValidMatchIdForApi(match.id)) return match;
  useMatchLikeStore.getState().reconcileFromApi(
    match.id,
    {
      likesCount: match.likesCount,
      isLiked: match.isLiked,
    },
    context
  );
  return applyMatchLikeOverrides(match);
}

export function hydrateMatchLikeListFromApi(matches: Match[], context: LikeApiContext): Match[] {
  return matches.map((m) => hydrateMatchLikeFromApi(m, context));
}

/** Persist authoritative like fields from GET match details into the centralized store. */
export function seedMatchLikeFromMatch(match: Match): void {
  if (!isValidMatchIdForApi(match.id)) return;
  hydrateMatchLikeFromApi(match, "detail");
}

export function applyMatchLikeOverrides(match: Match): Match {
  const snap = getMatchLikeSnapshot(match.id);
  if (!snap) return match;
  return { ...match, likesCount: snap.likesCount, isLiked: snap.isLiked };
}

export function applyMatchLikeOverridesList(matches: Match[]): Match[] {
  return matches.map(applyMatchLikeOverrides);
}

export function logLikeInteraction(
  stage: string,
  payload: Record<string, unknown>
): void {
  devLog.info(`[like:lifecycle] ${stage}`, payload);
}
