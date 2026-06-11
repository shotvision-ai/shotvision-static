import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, ScrollView, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from "expo-router";
import { Match } from "~/types/match";
import { exploreColors } from "~/lib/exploreDesign";
import { MatchDetailHeader } from "~/components/match/detail/MatchDetailHeader";
import { MatchDetailHeroCard } from "~/components/match/detail/MatchDetailHeroCard";
import { MatchDetailInfoCard } from "~/components/match/detail/MatchDetailInfoCard";
import { MatchDetailNotesSection } from "~/components/match/detail/MatchDetailNotesSection";
import { MatchDetailDangerZone } from "~/components/match/detail/MatchDetailDangerZone";
import { matchService } from "../../src/services/api/matchService";
import { shareMatchById } from "../../src/utils/shareMatch";
import { useAuth } from "../../src/context/AuthContext";
import { getUserFriendlyErrorMessage } from "../../src/services/api/userFriendlyErrors";
import { formatMatchSaveError } from "../../src/services/api/matchFormErrors";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";
import { ScreenErrorState, ScreenLoadingState } from "~/components/ui/AsyncListState";
import { devLog } from "../../src/utils/devLog";
import {
  canDeleteMatch,
  canEditMatchNotes,
  isMatchEditableByCreator,
  isMatchOwner,
  matchDeleteBlockedMessage,
  resolveMatchEditOwnerOptions,
  resolveMatchLifecycleFields,
} from "../../src/utils/matchEditEligibility";
import {
  getEditMatchCompleteHref,
  getEditMatchHref,
  MATCH_NAV_SOURCE_DETAIL,
} from "../../src/utils/matchLifecycle";
import { getEditMatchNotesHref } from "../../src/utils/matchNotes";
import {
  scheduleMatchCalendarRemoval,
  scheduleMatchCalendarSync,
} from "../../src/services/calendar/matchCalendarSync";
import { notifyParticipantsOfMatchUpdate } from "../../src/services/notifications/matchUpdateNotifier";
import { hydrateMatchLikeFromApi } from "../../src/utils/matchLike";
import {
  applyMatchVisibilityOverrides,
  seedMatchVisibilityFromMatch,
} from "../../src/utils/matchVisibility";
import {
  enrichMatchForViewer,
  ensureMatchOwnershipSynced,
  invalidateMyMatchesExploreCache,
  recordMatchOwnership,
  syncMatchOwnershipFromMatches,
} from "../../src/utils/matchOwnership";
import { recordMatchSets } from "../../src/stores/matchSetsStore";
import {
  buildCancellationNotes,
  extractCancellationReason,
  MATCH_CANCELLATION_REASONS,
  type MatchCancellationReason,
} from "../../src/utils/matchCancellation";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Monotonic request id — stale responses after fast navigation or unmount are ignored.
   * We also use it as a "needs refresh" flag from focus: when a child edit screen returns,
   * we increment this ref so the next `fetchMatchDetails` is treated as fresh.
   */
  const fetchSeqRef = useRef(0);
  /** True when we navigated to an edit/notes/complete screen and need to re-fetch on return. */
  const needsRefreshOnFocusRef = useRef(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMatchDetails = useCallback(
    async (refresh: boolean = false) => {
      const requestId = ++fetchSeqRef.current;

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      devLog.info("[match-detail] fetching", id, { refresh, requestId });

      try {
        await ensureMatchOwnershipSynced(currentUser?.id);
        const { match: rawMatch, raw: rawPayload } = await matchService.getMatchDetailsWithRaw(id);
        if (requestId !== fetchSeqRef.current) {
          devLog.info("[match-detail] stale response discarded", { requestId });
          return;
        }
        const owned = enrichMatchForViewer(rawMatch, currentUser?.id);
        const withLikes = hydrateMatchLikeFromApi(owned, "detail", rawPayload);
        const data = applyMatchVisibilityOverrides(withLikes);
        syncMatchOwnershipFromMatches([data]);
        if (data.creatorId) {
          recordMatchOwnership(data.id, data.creatorId, data.finishedAt);
        }
        seedMatchVisibilityFromMatch(data);
        recordMatchSets(data.id, data.sets);
        setMatch(data);
        devLog.info("[match-detail] loaded", {
          id: data.id,
          status: data.status,
          isPublic: data.isPublic,
          creatorId: data.creatorId,
          finishedAt: data.finishedAt,
        });
      } catch (err: unknown) {
        if (requestId !== fetchSeqRef.current) return;
        devLog.error("[match-detail] fetch failed:", err);
        setError(getUserFriendlyErrorMessage(err, "Failed to load match details"));
      } finally {
        if (requestId === fetchSeqRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [id, currentUser?.id]
  );

  useEffect(() => {
    void fetchMatchDetails();
    return () => {
      fetchSeqRef.current += 1;
    };
  }, [fetchMatchDetails]);

  /**
   * Re-fetch when returning from edit / notes / complete flows so the detail screen
   * always shows the latest persisted state without requiring a manual pull-to-refresh.
   */
  useFocusEffect(
    useCallback(() => {
      if (needsRefreshOnFocusRef.current) {
        needsRefreshOnFocusRef.current = false;
        void fetchMatchDetails(true);
      }
    }, [fetchMatchDetails])
  );

  const onRefresh = useCallback(() => {
    void fetchMatchDetails(true);
  }, [fetchMatchDetails]);

  // ── Stable derived ownership / eligibility ──────────────────────────────────
  // Computed here so they're consistent across every callsite in this render.

  const lifecycleMatch = useMemo(
    () => (match ? resolveMatchLifecycleFields(match) : null),
    [match]
  );

  const ownerOptions = useMemo(
    () =>
      lifecycleMatch ? resolveMatchEditOwnerOptions(lifecycleMatch, currentUser?.id) : undefined,
    [lifecycleMatch, currentUser?.id]
  );

  const isCreator = useMemo(
    () =>
      lifecycleMatch ? isMatchOwner(lifecycleMatch, currentUser?.id, ownerOptions) : false,
    [lifecycleMatch, currentUser?.id, ownerOptions]
  );

  const canDelete = useMemo(
    () => (lifecycleMatch ? canDeleteMatch(lifecycleMatch, currentUser?.id) : false),
    [lifecycleMatch, currentUser?.id]
  );

  const isEditable = useMemo(
    () => isMatchEditableByCreator(lifecycleMatch, currentUser?.id, ownerOptions),
    [lifecycleMatch, currentUser?.id, ownerOptions]
  );

  const canEditNotes = useMemo(
    () => canEditMatchNotes(lifecycleMatch, currentUser?.id, ownerOptions),
    [lifecycleMatch, currentUser?.id, ownerOptions]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleEdit = useCallback(() => {
    if (!match?.id) return;
    needsRefreshOnFocusRef.current = true;
    router.push(getEditMatchHref(match.id));
  }, [match?.id, router]);

  const handleEditNotes = useCallback(() => {
    if (!match) return;
    needsRefreshOnFocusRef.current = true;
    router.push(getEditMatchNotesHref(match.id));
  }, [match, router]);

  const handleCompleteMatch = useCallback(() => {
    if (!match) return;
    needsRefreshOnFocusRef.current = true;
    router.push(getEditMatchCompleteHref(match.id, MATCH_NAV_SOURCE_DETAIL));
  }, [match, router]);

  const handleStartLive = useCallback(() => {
    if (!match || isStartingLive) return;

    Alert.alert(
      "Start match live?",
      "This scheduled match will move to Live so you can record scores and complete it when finished.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Live",
          onPress: () => {
            void (async () => {
              setIsStartingLive(true);
              devLog.info("[match-detail] starting live", match.id);
              try {
                const updated = await matchService.startLiveMatch(match.id, {
                  playerA: match.playerA,
                  playerB: match.playerB,
                  matchDate: match.matchDate,
                  location: match.location,
                  notes: match.notes,
                  isPublic: match.isPublic,
                  sets: [],
                });
                seedMatchVisibilityFromMatch(updated, { markExploreStale: true });
                useMatchVisibilityStore.getState().markAllListsStale();
                const hydrated = applyMatchVisibilityOverrides(
                  hydrateMatchLikeFromApi(updated, "detail")
                );
                setMatch(hydrated);
                scheduleMatchCalendarSync(hydrated, currentUser?.id);
                await notifyParticipantsOfMatchUpdate({
                  previousMatch: match,
                  nextMatch: hydrated,
                  actorUserId: currentUser?.id,
                  reason: "match_started_live",
                });
                devLog.info("[match-detail] live started", updated.id, updated.status);
              } catch (err: unknown) {
                devLog.error("[match-detail] start live failed:", err);
                const { title, body } = formatMatchSaveError(err);
                Alert.alert(title, body);
              } finally {
                setIsStartingLive(false);
              }
            })();
          },
        },
      ]
    );
  }, [match, isStartingLive]);

  const handleShare = useCallback(async () => {
    if (!match) return;
    devLog.info("[match-detail] sharing", match.id);
    try {
      await shareMatchById(match.id);
    } catch {
      // shareMatchById shows Alert on failure internally
    }
  }, [match]);

  const handleDelete = useCallback(() => {
    if (!match) return;
    if (!canDeleteMatch(match, currentUser?.id)) {
      Alert.alert("Cannot delete", matchDeleteBlockedMessage());
      return;
    }
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            devLog.info("[match-detail] deleting", match.id);
            try {
              await matchService.deleteMatch(match.id, {
                creatorId: match.creatorId,
                actorUserId: currentUser?.id,
              });
              scheduleMatchCalendarRemoval(match.id, currentUser?.id);
              invalidateMyMatchesExploreCache();
              useMatchVisibilityStore.getState().markAllListsStale();
              router.replace("/(tabs)/dashboard");
            } catch (err: unknown) {
              devLog.error("[match-detail] delete failed:", err);
              Alert.alert(
                "Error",
                getUserFriendlyErrorMessage(err, "Failed to delete match. Please try again.")
              );
            }
          },
        },
      ]
    );
  }, [match, router, currentUser?.id]);

  const confirmCancelMatch = useCallback(
    (reason: MatchCancellationReason) => {
      if (!match) return;
      Alert.alert(
        "Cancel Match",
        `Cancel this match due to "${reason}"? Participants will be notified.`,
        [
          { text: "Keep Match", style: "cancel" },
          {
            text: "Cancel Match",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  const updated = await matchService.updateMatch(match.id, {
                    status: "cancelled",
                    notes: buildCancellationNotes(reason, match.notes),
                  });
                  const hydrated = applyMatchVisibilityOverrides(
                    hydrateMatchLikeFromApi(updated, "detail")
                  );
                  setMatch(hydrated);
                  scheduleMatchCalendarRemoval(match.id, currentUser?.id);
                  invalidateMyMatchesExploreCache();
                  useMatchVisibilityStore.getState().markAllListsStale();
                  await notifyParticipantsOfMatchUpdate({
                    previousMatch: match,
                    nextMatch: hydrated,
                    actorUserId: currentUser?.id,
                    reason: "match_cancelled",
                  });
                } catch (err: unknown) {
                  devLog.error("[match-detail] cancel failed:", err);
                  const { title, body } = formatMatchSaveError(err);
                  Alert.alert(title, body);
                }
              })();
            },
          },
        ]
      );
    },
    [match, currentUser?.id]
  );

  const handleCancelMatch = useCallback(() => {
    if (!match) return;
    Alert.alert("Select cancellation reason", "Choose why this match is being cancelled.", [
      ...MATCH_CANCELLATION_REASONS.map((reason) => ({
        text: reason,
        onPress: () => confirmCancelMatch(reason),
      })),
      { text: "Back", style: "cancel" },
    ]);
  }, [match, confirmCancelMatch]);

  if (isLoading && !isRefreshing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: exploreColors.pageBg }}>
          <MatchDetailHeader
            topInset={insets.top}
            onBack={() => router.back()}
            onShare={() => {}}
          />
          <ScreenLoadingState message="Loading match details…" />
        </View>
      </>
    );
  }

  if (error || !match) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: exploreColors.pageBg }}>
          <MatchDetailHeader
            topInset={insets.top}
            onBack={() => router.back()}
            onShare={() => {}}
          />
          <ScreenErrorState
            title={error ? "Couldn't load match" : "Match not found"}
            message={
              error ?? "This match may have been removed or is no longer available."
            }
            onRetry={error ? () => void fetchMatchDetails() : undefined}
            onBack={() => router.back()}
          />
        </View>
      </>
    );
  }

  const organiserLabel = isCreator ? "You" : match.creatorName;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: exploreColors.pageBg }}>
        <MatchDetailHeader
          topInset={insets.top}
          onBack={() => router.back()}
          onShare={() => void handleShare()}
          onEdit={handleEdit}
          showEdit={isEditable && match.status !== "cancelled" && match.status !== "completed"}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 32 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={exploreColors.coral}
            />
          }
        >
          <MatchDetailHeroCard
            match={match}
            isCreator={isCreator}
            currentUserId={currentUser?.id}
            organiserLabel={organiserLabel}
            onSaveComplete={isCreator ? handleCompleteMatch : undefined}
            onStartLive={isCreator ? handleStartLive : undefined}
            isStartingLive={isStartingLive}
          />

          <MatchDetailInfoCard
            match={match}
            isOwnDashboardMatch={Boolean(ownerOptions?.isOwnDashboardMatch ?? isCreator)}
            onVisibilityUpdated={(nextPublic) => {
              setMatch((current) => {
                if (!current) return null;
                const next = { ...current, isPublic: nextPublic };
                seedMatchVisibilityFromMatch(next, { markExploreStale: true });
                return next;
              });
            }}
          />

          <MatchDetailNotesSection
            notes={match.notes}
            canEdit={canEditNotes}
            onAddOrEdit={handleEditNotes}
          />

          <MatchDetailDangerZone
            showCancel={isCreator && match.status !== "cancelled"}
            showDelete={canDelete}
            onCancel={handleCancelMatch}
            onDelete={handleDelete}
          />
        </ScrollView>
      </View>
    </>
  );
}
