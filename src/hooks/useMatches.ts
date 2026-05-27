import { useState, useEffect, useCallback, useRef } from "react";
import { matchService, MatchStatusFilter, PaginatedResponse } from "../services/api/matchService";
import { Match } from "../../types/match";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { logShotVisionUi } from "../services/api/apiDebug";
import { devLog } from "../utils/devLog";
import { applyMatchLikeOverridesList } from "../utils/matchLike";
import { enrichMyDashboardMatches } from "../utils/enrichMyDashboardMatches";
import {
  enrichExploreMatches,
  ensureMatchOwnershipSynced,
  syncMatchOwnershipFromMatches,
} from "../utils/matchOwnership";
import {
  applyMatchVisibilityOverridesList,
  reconcileVisibilityFromApiItems,
} from "../utils/matchVisibility";
import { applyMatchReportOverridesList } from "../utils/matchReport";
import {
  dedupeExploreFeedMatches,
  filterExploreFeedMatches,
  supplementExploreWithViewerPublicMatches,
} from "../utils/exploreFeedSync";
import { useAuth } from "../context/AuthContext";

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
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { status = "all", limit = 10, type = "my", enabled = true } = options;

  /** Monotonic id — stale responses are ignored (prevents wrong list after fast filter changes). */
  const requestSeqRef = useRef(0);

  const fetchMatches = useCallback(
    async (pageNum: number, refresh: boolean = false) => {
      const requestId = ++requestSeqRef.current;

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        let response: PaginatedResponse<Match>;

        if (type === "explore") {
          await ensureMatchOwnershipSynced(user?.id, refresh ? { force: true } : undefined);
          response = await matchService.getExploreMatches(pageNum, limit, status);
        } else {
          response = await matchService.getMyMatches(pageNum, limit, status);
        }

        if (requestId !== requestSeqRef.current) {
          return;
        }

        let items = response.items;
        if (type === "my") {
          items = enrichMyDashboardMatches(items, user?.id);
          syncMatchOwnershipFromMatches(items);
        } else {
          items = enrichExploreMatches(items, user?.id);
          // Supplement only on the first page (refresh or initial load) — applying it on
          // subsequent pages would re-prepend already-shown owner matches, producing duplicates.
          if (pageNum === 1) {
            items = await supplementExploreWithViewerPublicMatches(items, user?.id, status);
          }
          items = dedupeExploreFeedMatches(items);
          // Reconcile store snapshots from fresh API data so stale overrides don't corrupt
          // visibility chip display (e.g. showing "Private" for a match that's now public).
          reconcileVisibilityFromApiItems(items);
          items = filterExploreFeedMatches(
            applyMatchReportOverridesList(
              applyMatchVisibilityOverridesList(applyMatchLikeOverridesList(items))
            )
          );
        }
        if (type === "my") {
          reconcileVisibilityFromApiItems(items);
          items = applyMatchReportOverridesList(
            applyMatchVisibilityOverridesList(applyMatchLikeOverridesList(items))
          );
        }

        if (refresh) {
          setMatches(items);
        } else {
          setMatches((prev) => [...prev, ...items]);
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
      } catch (err: unknown) {
        if (requestId !== requestSeqRef.current) {
          return;
        }
        devLog.error(`[useMatches:${type}]`, err);
        const msg = getUserFriendlyErrorMessage(err, "Failed to load matches");
        setError(msg);
        logShotVisionUi(`useMatches(${type})`, `ERROR ${msg}`);
      } finally {
        if (requestId === requestSeqRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [status, limit, type, user?.id]
  );

  useEffect(() => {
    if (!enabled) {
      requestSeqRef.current += 1;
      setMatches([]);
      setError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setHasMore(true);
      setPage(1);
      return;
    }

    fetchMatches(1, true);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchMatches, enabled]);

  const refresh = useCallback(() => {
    fetchMatches(1, true);
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
    error,
    hasMore,
    refresh,
    loadMore,
  };
};
