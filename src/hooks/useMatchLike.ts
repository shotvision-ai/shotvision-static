import { useCallback, useMemo, useRef } from "react";
import { Alert } from "react-native";
import type { Match } from "../../types/match";
import { matchService } from "../services/api/matchService";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { useAuth } from "../context/AuthContext";
import { useMatchLikeStore } from "../stores/matchLikeStore";
import {
  canUserToggleMatchLike,
  isValidMatchIdForApi,
  logLikeInteraction,
  resolveMatchLikeFields,
  type MatchLikeToggleOptions,
} from "../utils/matchLike";

type UseMatchLikeOptions = MatchLikeToggleOptions & {
  /** When false, skips self-like guard (e.g. read-only display). Default true. */
  allowToggle?: boolean;
};

function readBaselineSnapshot(match: Match) {
  return resolveMatchLikeFields(match, useMatchLikeStore.getState().overrides[match.id] ?? null);
}

/**
 * Centralized like engagement — reads/writes `useMatchLikeStore` only (no duplicate local counts).
 */
export function useMatchLike(match: Match, options: UseMatchLikeOptions = {}) {
  const { allowToggle = true, isOwnDashboardMatch = false } = options;
  const { user } = useAuth();
  const inFlightRef = useRef(false);

  const snapshot = useMatchLikeStore((s) => s.overrides[match.id]);
  const isPending = useMatchLikeStore((s) => Boolean(s.pendingIds[match.id]));

  const beginPending = useMatchLikeStore((s) => s.beginPending);
  const endPending = useMatchLikeStore((s) => s.endPending);
  const setSnapshot = useMatchLikeStore((s) => s.setSnapshot);
  const applyToggleResult = useMatchLikeStore((s) => s.applyToggleResult);

  const isLiked = snapshot?.isLiked ?? Boolean(match.isLiked);
  const likesCount =
    snapshot?.likesCount ??
    (typeof match.likesCount === "number" ? match.likesCount : 0);

  const canToggle = useMemo(
    () =>
      allowToggle &&
      canUserToggleMatchLike(match, user?.id, { isOwnDashboardMatch }) &&
      isValidMatchIdForApi(match.id) &&
      !isPending &&
      !inFlightRef.current,
    [allowToggle, match, user?.id, isOwnDashboardMatch, isPending]
  );

  const handleLike = useCallback(async () => {
    if (
      !allowToggle ||
      !canUserToggleMatchLike(match, user?.id, { isOwnDashboardMatch }) ||
      !isValidMatchIdForApi(match.id) ||
      inFlightRef.current ||
      useMatchLikeStore.getState().pendingIds[match.id]
    ) {
      return;
    }

    const previousSnapshot = readBaselineSnapshot(match);
    const nextLiked = !previousSnapshot.isLiked;
    const optimisticCount = nextLiked
      ? previousSnapshot.likesCount + 1
      : Math.max(0, previousSnapshot.likesCount - 1);

    logLikeInteraction("optimistic", {
      matchId: match.id,
      from: previousSnapshot,
      to: { isLiked: nextLiked, likesCount: optimisticCount },
    });

    inFlightRef.current = true;
    beginPending(match.id);
    setSnapshot(match.id, { isLiked: nextLiked, likesCount: optimisticCount }, "optimistic");

    try {
      const result = previousSnapshot.isLiked
        ? await matchService.unlikeMatch(match.id)
        : await matchService.likeMatch(match.id);

      logLikeInteraction("api success", {
        matchId: match.id,
        likedByMe: result.likedByMe,
        likesCount: result.likesCount,
      });

      applyToggleResult(match.id, result);
    } catch (error) {
      logLikeInteraction("api failed — rollback", {
        matchId: match.id,
        restore: previousSnapshot,
      });
      setSnapshot(match.id, previousSnapshot, "rollback");
      Alert.alert(
        "Error",
        getUserFriendlyErrorMessage(error, "Failed to update like. Please try again.")
      );
    } finally {
      inFlightRef.current = false;
      endPending(match.id);
    }
  }, [
    allowToggle,
    match,
    user?.id,
    isOwnDashboardMatch,
    beginPending,
    endPending,
    setSnapshot,
    applyToggleResult,
  ]);

  return {
    isLiked,
    likesCount,
    isLiking: isPending,
    canToggle,
    handleLike,
  };
}
