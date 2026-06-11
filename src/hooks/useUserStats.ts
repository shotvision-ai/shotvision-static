import { useState, useEffect, useCallback, useRef } from "react";
import { profileService } from "../services/api/profileService";
import type { UserStatsResponse } from "../services/api/contracts";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { devLog } from "../utils/devLog";
import { normalizeUserStatsResponse } from "../utils/userStats";

export const useUserStats = (enabled: boolean = true) => {
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const hasStatsRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestSeqRef.current;
    if (!hasStatsRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await profileService.getMyStats();
      if (requestId !== requestSeqRef.current) return;
      setStats(normalizeUserStatsResponse(data));
      hasStatsRef.current = true;
    } catch (err: unknown) {
      if (requestId !== requestSeqRef.current) return;
      devLog.error("[useUserStats]", err);
      setError(getUserFriendlyErrorMessage(err, "Failed to load statistics"));
      if (!hasStatsRef.current) {
        setStats(null);
      }
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      requestSeqRef.current += 1;
      setStats(null);
      hasStatsRef.current = false;
      setIsLoading(false);
      setError(null);
      return;
    }

    void fetchStats();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchStats, enabled]);

  return { stats, isLoading, error, refresh: fetchStats };
};
