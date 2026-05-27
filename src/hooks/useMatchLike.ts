import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import type { Match } from "../../types/match";
import { matchService } from "../services/api/matchService";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { useAuth } from "../context/AuthContext";
import { useMatchLikeStore } from "../stores/matchLikeStore";
import {
  canUserToggleMatchLike,
  isValidMatchIdForApi,
  resolveMatchLikeFields,
  type MatchLikeToggleOptions,
} from "../utils/matchLike";
import { devLog } from "../utils/devLog";

type UseMatchLikeOptions = MatchLikeToggleOptions & {
  /** When false, skips self-like guard (e.g. read-only display). Default true. */
  allowToggle?: boolean;
};

/**
 * Shared like state: optimistic UI, API reconcile, zustand snapshot for list refresh sync.
 */
export function useMatchLike(match: Match, options: UseMatchLikeOptions = {}) {
  const { allowToggle = true, isOwnDashboardMatch = false } = options;
  const { user } = useAuth();
  const setSnapshot = useMatchLikeStore((s) => s.setSnapshot);
  const override = useMatchLikeStore((s) => s.overrides[match.id]);

  const resolved = resolveMatchLikeFields(match, override);
  const [isLiked, setIsLiked] = useState(resolved.isLiked);
  const [likesCount, setLikesCount] = useState(resolved.likesCount);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    const next = resolveMatchLikeFields(match, useMatchLikeStore.getState().overrides[match.id]);
    setIsLiked(next.isLiked);
    setLikesCount(next.likesCount);
  }, [match.id, match.isLiked, match.likesCount, override]);

  const canToggle =
    allowToggle &&
    canUserToggleMatchLike(match, user?.id, { isOwnDashboardMatch }) &&
    isValidMatchIdForApi(match.id);

  const handleLike = useCallback(async () => {
    if (!canToggle || isLiking) return;

    if (!isValidMatchIdForApi(match.id)) {
      Alert.alert("Error", "This match cannot be liked right now. Try refreshing the list.");
      return;
    }

    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(!previousIsLiked);
    setLikesCount(previousIsLiked ? Math.max(0, previousLikesCount - 1) : previousLikesCount + 1);
    setIsLiking(true);

    try {
      const result = previousIsLiked
        ? await matchService.unlikeMatch(match.id)
        : await matchService.likeMatch(match.id);

      setIsLiked(result.likedByMe);
      setLikesCount(result.likesCount);
      setSnapshot(match.id, { isLiked: result.likedByMe, likesCount: result.likesCount });
    } catch (error) {
      devLog.error("[useMatchLike] failed:", error);
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      Alert.alert(
        "Error",
        getUserFriendlyErrorMessage(error, "Failed to update like. Please try again.")
      );
    } finally {
      setIsLiking(false);
    }
  }, [
    canToggle,
    isLiking,
    isLiked,
    likesCount,
    match.id,
    setSnapshot,
  ]);

  return {
    isLiked,
    likesCount,
    isLiking,
    canToggle,
    handleLike,
  };
}
