import { useState, useEffect, useCallback } from "react";
import { matchService, MatchStatusFilter, PaginatedResponse } from "../services/api/matchService";
import { Match } from "../../types/match";
import { AppError } from "../services/api/apiErrors";
import { logShotVisionUi } from "../services/api/apiDebug";

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

  const fetchMatches = useCallback(
    async (pageNum: number, refresh: boolean = false) => {
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
        console.error(`Failed to fetch ${type} matches:`, err);
        const msg =
          err instanceof AppError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load matches";
        setError(msg);
        logShotVisionUi(`useMatches(${type})`, `ERROR ${msg}`);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [status, limit, type]
  );

  useEffect(() => {
    fetchMatches(1, true);
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
