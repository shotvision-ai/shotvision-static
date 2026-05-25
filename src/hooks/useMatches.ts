import { useState, useEffect, useCallback, useRef } from "react";
import { matchService, MatchStatusFilter, PaginatedResponse } from "../services/api/matchService";
import { Match } from "../../types/match";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { logShotVisionUi } from "../services/api/apiDebug";
import { devLog } from "../utils/devLog";

interface UseMatchesOptions {
  status?: MatchStatusFilter;
  limit?: number;
  type?: "my" | "explore";
}

export const useMatches = (options: UseMatchesOptions = {}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { status = "all", limit = 10, type = "my" } = options;

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
          response = await matchService.getExploreMatches(pageNum, limit, status);
        } else {
          response = await matchService.getMyMatches(pageNum, limit, status);
        }

        if (requestId !== requestSeqRef.current) {
          return;
        }

        if (refresh) {
          setMatches(response.items);
        } else {
          setMatches((prev) => [...prev, ...response.items]);
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
    [status, limit, type]
  );

  useEffect(() => {
    fetchMatches(1, true);
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchMatches]);

  const refresh = useCallback(() => {
    fetchMatches(1, true);
  }, [fetchMatches]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchMatches(page + 1);
    }
  }, [isLoading, hasMore, page, fetchMatches]);

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
