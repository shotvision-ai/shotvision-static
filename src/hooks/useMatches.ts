import { useState, useEffect, useCallback, useRef } from "react";
import { matchService, MatchStatusFilter, PaginatedResponse } from "../services/api/matchService";
import { Match } from "../../types/match";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { logShotVisionUi } from "../services/api/apiDebug";
import { devLog } from "../utils/devLog";
import { hydrateMatchLikeListFromApi } from "../utils/matchLike";
import { enrichMyDashboardMatches } from "../utils/enrichMyDashboardMatches";
import {
  enrichExploreMatches,
  ensureMatchOwnershipSynced,
  syncMatchOwnershipFromMatches,
} from "../utils/matchOwnership";
import {
  applyMatchVisibilityOverridesList,
  reconcileExploreApiVisibility,
  reconcileVisibilityFromApiItems,
} from "../utils/matchVisibility";
import { applyMatchReportOverridesList } from "../utils/matchReport";
import {
  dedupeExploreFeedMatches,
  filterExploreFeedMatches,
  supplementExploreWithViewerPublicMatches,
} from "../utils/exploreFeedSync";
import { buildExploreApiIdSet, logExplorePipelineStats } from "../utils/explorePublicSync";
import { syncMatchSetsFromMatches } from "../stores/matchSetsStore";
import { hydrateMissingMatchSets } from "../utils/hydrateMissingMatchSets";
import { useAuth } from "../context/AuthContext";
import { useMatchLikeStore } from "../stores/matchLikeStore";
import { useMatchVisibilityStore } from "../stores/matchVisibilityStore";

interface UseMatchesOptions {
  status?: MatchStatusFilter;
  limit?: number;
  type?: "my" | "explore";
  /** When false, skips fetch (use until auth user + token are ready). */
  enabled?: boolean;
}

export const useMatches = (options: UseMatchesOptions = {}) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { status = "all", limit = 10, type = "my", enabled = true } = options;

  /** Monotonic id — stale responses are ignored (prevents wrong list after fast filter changes). */
  const requestSeqRef = useRef(0);
  const hasCachedRowsRef = useRef(false);

  const fetchMatches = useCallback(
    async (pageNum: number, refresh: boolean = false): Promise<boolean> => {
      const requestId = ++requestSeqRef.current;

      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum > 1) {
        setIsLoadingMore(true);
      } else if (!hasCachedRowsRef.current) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const userId = user?.id?.trim();
        const likeStore = useMatchLikeStore.getState();
        const likeHydratePromise =
          userId && likeStore.hydratedForUserId !== userId
            ? likeStore.hydrateForUser(userId)
            : Promise.resolve();

        let response: PaginatedResponse<Match>;

        if (type === "explore") {
          const visibility = useMatchVisibilityStore.getState();
          const forceOwnership =
            visibility.exploreStale || visibility.myMatchesStale;

          const ownershipSync = ensureMatchOwnershipSynced(user?.id, {
            force: forceOwnership,
          }).catch((err) => {
            devLog.warn("[useMatches:explore] ownership sync failed (continuing):", err);
          });

          const [exploreResponse] = await Promise.all([
            matchService.getExploreMatches(pageNum, limit, status),
            ownershipSync,
            likeHydratePromise,
          ]);
          response = exploreResponse;
        } else {
          const [myResponse] = await Promise.all([
            matchService.getMyMatches(pageNum, limit, status),
            likeHydratePromise,
          ]);
          response = myResponse;
        }

        if (requestId !== requestSeqRef.current) {
          return false;
        }

        let items = response.items;
        if (type === "my") {
          items = enrichMyDashboardMatches(items, user?.id);
          syncMatchOwnershipFromMatches(items);
        } else {
          const exploreApiCount = items.length;
          items = enrichExploreMatches(items, user?.id);
          const exploreApiIds = buildExploreApiIdSet(items);
          reconcileExploreApiVisibility(items);

          // Supplement only on page 1 — avoids re-prepending owner rows on load-more.
          if (pageNum === 1) {
            items = await supplementExploreWithViewerPublicMatches(items, user?.id, status);
          }
          const afterSupplementCount = items.length;
          const supplementedCount = Math.max(0, afterSupplementCount - exploreApiCount);

          items = dedupeExploreFeedMatches(items);
          const afterDedupeCount = items.length;

          reconcileVisibilityFromApiItems(items);

          const merged = applyMatchReportOverridesList(
            applyMatchVisibilityOverridesList(hydrateMatchLikeListFromApi(items, "explore"))
          );
          const beforeFilterCount = merged.length;
          items = filterExploreFeedMatches(merged, exploreApiIds);
          const afterFilterCount = items.length;

          logExplorePipelineStats({
            page: pageNum,
            status,
            exploreApiCount,
            afterSupplementCount,
            afterDedupeCount,
            afterFilterCount,
            supplementedCount,
            suppressedByPrivateSnapshot: Math.max(0, beforeFilterCount - afterFilterCount),
            suppressedMissingId: 0,
          });
        }
        if (type === "my") {
          reconcileVisibilityFromApiItems(items);
          items = applyMatchReportOverridesList(
            applyMatchVisibilityOverridesList(hydrateMatchLikeListFromApi(items, "dashboard"))
          );
        }

        syncMatchSetsFromMatches(items);
        items = await hydrateMissingMatchSets(items);

        if (refresh || pageNum === 1) {
          setMatches(items);
          hasCachedRowsRef.current = items.length > 0;
        } else {
          setMatches((prev) => {
            const next = dedupeExploreFeedMatches([...prev, ...items]);
            hasCachedRowsRef.current = next.length > 0;
            return next;
          });
        }

        const more =
          typeof response.hasNext === "boolean"
            ? response.hasNext
            : response.page < response.totalPages;
        setHasMore(more);
        setPage(response.page);
        logShotVisionUi(
          `useMatches(${type})`,
          `items=${response.items.length} total=${response.total} page=${response.page}/${response.totalPages} hasMore=${more}`
        );
        return true;
      } catch (err: unknown) {
        if (requestId !== requestSeqRef.current) {
          return false;
        }
        devLog.error(`[useMatches:${type}]`, err);
        const msg = getUserFriendlyErrorMessage(err, "Failed to load matches");
        setError(msg);
        logShotVisionUi(`useMatches(${type})`, `ERROR ${msg}`);
        return false;
      } finally {
        if (requestId === requestSeqRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [status, limit, type, user?.id]
  );

  useEffect(() => {
    if (!enabled) {
      requestSeqRef.current += 1;
      setMatches([]);
      hasCachedRowsRef.current = false;
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      setHasMore(true);
      setPage(1);
      return;
    }

    setMatches([]);
    hasCachedRowsRef.current = false;
    setPage(1);
    setHasMore(true);
    void fetchMatches(1, false);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchMatches, enabled]);

  const refresh = useCallback(async () => {
    return await fetchMatches(1, true);
  }, [fetchMatches]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isRefreshing && hasMore) {
      fetchMatches(page + 1);
    }
  }, [isLoading, isRefreshing, hasMore, page, fetchMatches]);

  return {
    matches,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
  };
};
