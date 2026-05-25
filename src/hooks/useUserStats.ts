import { useState, useEffect, useCallback, useRef } from "react";
import { profileService } from "../services/api/profileService";
import type { UserStatsResponse } from "../services/api/contracts";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { devLog } from "../utils/devLog";

export const useUserStats = (enabled: boolean = true) => {
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const fetchStats = useCallback(async () => {
    if (!enabled) return;

    const requestId = ++requestSeqRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await profileService.getMyStats();
      if (requestId !== requestSeqRef.current) return;
      setStats(data);
    } catch (err: unknown) {
      if (requestId !== requestSeqRef.current) return;
      devLog.error("[useUserStats]", err);
      setError(getUserFriendlyErrorMessage(err, "Failed to load statistics"));
      setStats(null);
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    void fetchStats();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
};
