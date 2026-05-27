import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import type { Match } from "../../types/match";
import { matchService } from "../services/api/matchService";
import { useAuth } from "../context/AuthContext";
import { useMatchVisibilityStore } from "../stores/matchVisibilityStore";
import { invalidateMyMatchesExploreCache } from "../utils/matchOwnership";
import {
  buildVisibilityOnlyPatch,
  canManageMatchVisibility,
  matchVisibilityLockMessage,
  resolveMatchIsPublic,
} from "../utils/matchVisibility";
import { formatMatchSaveError } from "../services/api/matchFormErrors";
import type { MatchEditEligibilityOptions } from "../utils/matchEditEligibility";
import { devLog } from "../utils/devLog";

type UseMatchVisibilityOptions = MatchEditEligibilityOptions & {
  onVisibilityUpdated?: (isPublic: boolean) => void;
};

export function useMatchVisibility(match: Match, options: UseMatchVisibilityOptions = {}) {
  const { onVisibilityUpdated, ...ownerOptions } = options;
  const { user } = useAuth();
  const setSnapshot = useMatchVisibilityStore((s) => s.setSnapshot);
  const override = useMatchVisibilityStore((s) => s.overrides[match.id]);

  const resolved = resolveMatchIsPublic(match, override);
  const [isPublic, setIsPublic] = useState(resolved);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const next = resolveMatchIsPublic(match, useMatchVisibilityStore.getState().overrides[match.id]);
    setIsPublic(next);
  }, [match.id, match.isPublic, override]);

  const canManage = canManageMatchVisibility(match, user?.id, ownerOptions);
  const lockMessage = matchVisibilityLockMessage(match, user?.id, ownerOptions);

  const persistVisibility = useCallback(
    async (nextPublic: boolean) => {
      const patch =
        match.status === "completed"
          ? buildVisibilityOnlyPatch(nextPublic)
          : { ...buildVisibilityOnlyPatch(nextPublic), status: match.status };

      const patchOptions =
        match.status === "completed" ? { omitStatus: true as const } : undefined;

      const updated = await matchService.updateMatch(match.id, patch, patchOptions);
      setIsPublic(updated.isPublic);
      setSnapshot(match.id, { isPublic: updated.isPublic });
      onVisibilityUpdated?.(updated.isPublic);
      invalidateMyMatchesExploreCache();
      useMatchVisibilityStore.getState().markAllListsStale();
    },
    [match.id, match.status, onVisibilityUpdated, setSnapshot]
  );

  const requestToggle = useCallback(() => {
    if (!canManage || isUpdating) return;

    const nextPublic = !isPublic;
    const title = nextPublic ? "Make match public?" : "Make match private?";
    const message = nextPublic
      ? "Your match will appear in Explore for other players to view and like."
      : "Your match will be removed from Explore. Only you will be able to view it.";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: nextPublic ? "Make Public" : "Make Private",
        onPress: () => {
          void (async () => {
            const previous = isPublic;
            setIsPublic(nextPublic);
            setIsUpdating(true);
            try {
              await persistVisibility(nextPublic);
            } catch (error) {
              devLog.error("[useMatchVisibility] toggle failed:", error);
              setIsPublic(previous);
              const { title, body } = formatMatchSaveError(error);
              Alert.alert(title, body);
            } finally {
              setIsUpdating(false);
            }
          })();
        },
      },
    ]);
  }, [canManage, isUpdating, isPublic, persistVisibility]);

  return {
    isPublic,
    canManage,
    isUpdating,
    lockMessage,
    requestToggle,
  };
}
