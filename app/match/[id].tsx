import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from "expo-router";
import { Text } from "~/components/ui/text";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { StatusBadge } from "~/components/match/StatusBadge";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { matchService } from "../../src/services/api/matchService";
import { shareMatchById } from "../../src/utils/shareMatch";
import { useAuth } from "../../src/context/AuthContext";
import { useCurrentUserAvatarProps } from "../../src/hooks/useCurrentUserAvatar";
import {
  isMatchParticipantSelf,
  resolveMatchParticipantImageUrl,
} from "../../src/utils/matchParticipantAvatar";
import { getUserFriendlyErrorMessage } from "../../src/services/api/userFriendlyErrors";
import { formatMatchSaveError } from "../../src/services/api/matchFormErrors";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";
import { ScreenErrorState, ScreenLoadingState } from "~/components/ui/AsyncListState";
import { devLog } from "../../src/utils/devLog";
import {
  isMatchEditableByCreator,
  isMatchOwner,
  isFinishedMatchWithinEditWindow,
  resolveMatchEditOwnerOptions,
} from "../../src/utils/matchEditEligibility";
import { getEditMatchHref } from "../../src/utils/matchLifecycle";
import { getEditMatchNotesHref } from "../../src/utils/matchNotes";
import { getEditMatchCompleteHref } from "../../src/utils/matchLifecycle";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { hydrateMatchLikeFromApi } from "../../src/utils/matchLike";
import {
  applyMatchVisibilityOverrides,
  seedMatchVisibilityFromMatch,
} from "../../src/utils/matchVisibility";
import { MatchVisibilityControl } from "~/components/match/MatchVisibilityControl";
import { MatchLikeButton } from "~/components/match/MatchLikeButton";
import {
  enrichMatchForViewer,
  ensureMatchOwnershipSynced,
  invalidateMyMatchesExploreCache,
  recordMatchOwnership,
  syncMatchOwnershipFromMatches,
} from "../../src/utils/matchOwnership";

// ─── Sub-components defined OUTSIDE the screen ───────────────────────────────
// Defining them inside the screen function causes them to remount on every render,
// losing focus state and causing layout flicker.

function MatchDetailLikeButton({ match }: { match: Match }) {
  const { isLiked, likesCount, isLiking, canToggle, handleLike } = useMatchLike(match);
  return (
    <MatchLikeButton
      isLiked={isLiked}
      likesCount={likesCount}
      isLiking={isLiking}
      canToggle={canToggle}
      onLike={() => void handleLike()}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMatchDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMatchTime(dateString: string): string {
  const date = new Date(dateString);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const currentUserAvatar = useCurrentUserAvatarProps(currentUser?.id);
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
        const raw = await matchService.getMatchDetails(id);
        if (requestId !== fetchSeqRef.current) {
          devLog.info("[match-detail] stale response discarded", { requestId });
          return;
        }
        const owned = enrichMatchForViewer(raw, currentUser?.id);
        const withLikes = hydrateMatchLikeFromApi(owned, "detail");
        const data = applyMatchVisibilityOverrides(withLikes);
        syncMatchOwnershipFromMatches([data]);
        if (data.creatorId) {
          recordMatchOwnership(data.id, data.creatorId, data.finishedAt);
        }
        seedMatchVisibilityFromMatch(data);
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

  const ownerOptions = useMemo(
    () => (match ? resolveMatchEditOwnerOptions(match, currentUser?.id) : undefined),
    [match, currentUser?.id]
  );

  const isCreator = useMemo(
    () => (match ? isMatchOwner(match, currentUser?.id, ownerOptions) : false),
    [match, currentUser?.id, ownerOptions]
  );

  const isEditable = useMemo(
    () => isMatchEditableByCreator(match, currentUser?.id, ownerOptions),
    [match, currentUser?.id, ownerOptions]
  );

  const isWithinEditWindow = useMemo(
    () => (match?.status === "completed" ? isFinishedMatchWithinEditWindow(match) : false),
    [match]
  );

  const canEditNotes = isEditable;

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
    router.push(getEditMatchCompleteHref(match.id));
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
                setMatch(
                  applyMatchVisibilityOverrides(hydrateMatchLikeFromApi(updated, "detail"))
                );
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
              await matchService.deleteMatch(match.id);
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
  }, [match, router]);

  // ── Header (stable — not a render-time inner component) ────────────────────

  const headerContent = (
    <View
      style={{
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: theme.colors.background,
      }}
    >
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
        }}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ padding: 8, marginLeft: 4 }}
        >
          <LucideIcon name="ChevronLeft" size={26} color={theme.colors.foreground} />
        </TouchableOpacity>

        {/* Title */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              fontFamily: theme.typography.h2?.fontFamily,
              color: theme.colors.foreground,
            }}
            numberOfLines={1}
          >
            Match Details
          </Text>
        </View>

        {/* Right actions */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginRight: 4 }}>
          <TouchableOpacity
            onPress={() => void handleShare()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: "rgba(37,99,235,0.1)",
              borderWidth: 1.5,
              borderColor: "rgba(37,99,235,0.25)",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel="Share match"
          >
            <LucideIcon name="Share2" size={20} color="#2563eb" />
          </TouchableOpacity>

          {match && isEditable ? (
            <TouchableOpacity
              onPress={handleEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "rgba(37,99,235,0.1)",
                borderWidth: 1.5,
                borderColor: "rgba(37,99,235,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit match"
            >
              <LucideIcon name="SquarePen" size={20} color="#2563eb" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  // ── Loading / Error guards ─────────────────────────────────────────────────

  if (isLoading && !isRefreshing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {headerContent}
          <ScreenLoadingState message="Loading match details…" />
        </View>
      </>
    );
  }

  if (error || !match) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {headerContent}
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

  // ── Main render ────────────────────────────────────────────────────────────

  const isCreatorSelf = Boolean(
    currentUser?.id && match.creatorId && match.creatorId === currentUser.id
  );
  const isPlayerASelf = isMatchParticipantSelf(
    match.playerAUserId,
    match.playerA,
    currentUser ?? undefined
  );
  const isPlayerBSelf = isMatchParticipantSelf(
    match.playerBUserId,
    match.playerB,
    currentUser ?? undefined
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {headerContent}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 40 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* ── Header Card ── */}
          <View
            className="bg-card rounded-2xl p-6 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {/* Creator row */}
            <View className="flex-row items-center mb-4">
              <ProfileAvatar
                imageUrl={resolveMatchParticipantImageUrl(match.creatorImage, {
                  isSelf: isCreatorSelf,
                  selfImage: currentUser?.image,
                })}
                preferredAvatarId={isCreatorSelf ? currentUserAvatar.preferredAvatarId : undefined}
                imageDisplayKey={isCreatorSelf ? currentUserAvatar.imageDisplayKey : undefined}
                profileImageCacheRevision={
                  isCreatorSelf ? currentUserAvatar.profileImageCacheRevision : undefined
                }
                fallbackUserId={
                  isCreatorSelf
                    ? currentUserAvatar.fallbackUserId
                    : match.creatorId || `${match.id}:creator`
                }
                fallbackGender={isCreatorSelf ? undefined : match.creatorGender}
                size={48}
              />
              <View className="ml-3 flex-1">
                <Text className="text-body font-medium text-muted-foreground">Organized by</Text>
                <Text className="text-h4 font-semibold text-foreground">{match.creatorName}</Text>
              </View>
              <View className="items-end gap-2">
                <StatusBadge status={match.status} />
                <MatchDetailLikeButton match={match} />
              </View>
            </View>

            {/* Players */}
            <View className="py-6 border-t border-b border-border">
              <View className="flex-row justify-center items-center gap-8 mb-5">
                <ProfileAvatar
                  imageUrl={resolveMatchParticipantImageUrl(match.playerAImage, {
                    isSelf: isPlayerASelf,
                    selfImage: currentUser?.image,
                  })}
                  preferredAvatarId={
                    isPlayerASelf ? currentUserAvatar.preferredAvatarId : undefined
                  }
                  imageDisplayKey={isPlayerASelf ? currentUserAvatar.imageDisplayKey : undefined}
                  profileImageCacheRevision={
                    isPlayerASelf ? currentUserAvatar.profileImageCacheRevision : undefined
                  }
                  fallbackUserId={
                    isPlayerASelf
                      ? currentUserAvatar.fallbackUserId
                      : match.playerAUserId ?? `${match.id}:playerA`
                  }
                  fallbackGender={isPlayerASelf ? undefined : match.playerAGender}
                  size={72}
                  variant="plain"
                />
                <Text className="text-h5 font-semibold text-muted-foreground">vs</Text>
                <ProfileAvatar
                  imageUrl={resolveMatchParticipantImageUrl(match.playerBImage, {
                    isSelf: isPlayerBSelf,
                    selfImage: currentUser?.image,
                  })}
                  preferredAvatarId={
                    isPlayerBSelf ? currentUserAvatar.preferredAvatarId : undefined
                  }
                  imageDisplayKey={isPlayerBSelf ? currentUserAvatar.imageDisplayKey : undefined}
                  profileImageCacheRevision={
                    isPlayerBSelf ? currentUserAvatar.profileImageCacheRevision : undefined
                  }
                  fallbackUserId={
                    isPlayerBSelf
                      ? currentUserAvatar.fallbackUserId
                      : match.playerBUserId ?? `${match.id}:playerB`
                  }
                  fallbackGender={isPlayerBSelf ? undefined : match.playerBGender}
                  size={72}
                  variant="plain"
                />
              </View>
              <Text className="text-h2 font-bold text-foreground text-center mb-2">
                {match.playerA}
              </Text>
              <Text className="text-h4 text-muted-foreground text-center mb-2">vs</Text>
              <Text className="text-h2 font-bold text-foreground text-center">
                {match.playerB}
              </Text>
            </View>

            {/* Winner banner */}
            {match.status === "completed" && match.winner ? (
              <View
                className="mt-4 rounded-2xl p-5"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(37, 99, 235, 0.25)",
                }}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Text style={{ fontSize: 24 }}>🏆</Text>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: "#2563eb" }}>
                    Winner: {match.winner === "playerA" ? match.playerA : match.playerB}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Live — owner complete */}
            {match.status === "live" ? (
              <View className="mt-4 bg-warning/10 rounded-lg p-4 gap-3">
                <Text className="text-h5 font-semibold text-warning text-center">
                  Match in Progress
                </Text>
                {isCreator ? (
                  <TouchableOpacity
                    onPress={handleCompleteMatch}
                    className="bg-primary rounded-xl py-3 px-4"
                    accessibilityRole="button"
                    accessibilityLabel="Save and complete match"
                  >
                    <Text className="text-primary-foreground font-semibold text-center">
                      Save & Complete
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Scheduled — start live + complete */}
            {match.status === "scheduled" && isCreator ? (
              <View
                className="mt-4 rounded-lg p-4 gap-3"
                style={{ backgroundColor: "rgba(37,99,235,0.08)" }}
              >
                <Text className="text-body text-foreground text-center leading-6">
                  Start the match when play begins, then record scores and finish with Save &
                  Complete.
                </Text>
                <TouchableOpacity
                  onPress={handleStartLive}
                  disabled={isStartingLive}
                  className="bg-primary rounded-xl py-3 px-4"
                  accessibilityRole="button"
                  accessibilityLabel="Start match as live"
                  style={{ opacity: isStartingLive ? 0.6 : 1 }}
                >
                  {isStartingLive ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-primary-foreground font-semibold text-center">
                      Start Live
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCompleteMatch}
                  className="rounded-xl py-3 px-4 border border-border"
                  accessibilityRole="button"
                  accessibilityLabel="Record scores and complete match"
                >
                  <Text className="text-foreground font-semibold text-center">Save & Complete</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {match.status === "scheduled" && match.scheduledDate ? (
              <View className="mt-2 bg-tertiary/10 rounded-lg p-4">
                <Text className="text-h5 font-semibold text-tertiary text-center">
                  Scheduled for {formatMatchDate(match.scheduledDate)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Match Details card ── */}
          <View className="mb-6">
            <Text className="text-h3 font-semibold text-foreground mb-4">Match Details</Text>
            <View
              className="bg-card rounded-2xl p-5 gap-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center">
                <LucideIcon name="Calendar" size={20} className="text-muted-foreground mr-3" />
                <View className="flex-1">
                  <Text className="text-caption text-muted-foreground mb-0.5">Date & Time</Text>
                  <Text className="text-body font-medium text-foreground">
                    {formatMatchDate(match.matchDate)} • {formatMatchTime(match.matchDate)}
                  </Text>
                </View>
              </View>

              {match.location ? (
                <View className="flex-row items-center">
                  <LucideIcon name="MapPin" size={20} className="text-muted-foreground mr-3" />
                  <View className="flex-1">
                    <Text className="text-caption text-muted-foreground mb-0.5">Location</Text>
                    <Text className="text-body font-medium text-foreground">
                      {match.location}
                    </Text>
                  </View>
                </View>
              ) : null}

              {match.status === "completed" && match.finishedAt ? (
                <View className="flex-row items-center">
                  <LucideIcon name="CircleCheck" size={20} className="text-muted-foreground mr-3" />
                  <View className="flex-1">
                    <Text className="text-caption text-muted-foreground mb-0.5">Finished</Text>
                    <Text className="text-body font-medium text-foreground">
                      {formatMatchDate(match.finishedAt)}
                      {isWithinEditWindow ? (
                        <Text className="text-caption text-muted-foreground"> · editable within 48h</Text>
                      ) : null}
                    </Text>
                  </View>
                </View>
              ) : null}

              <MatchVisibilityControl
                match={match}
                variant="row"
                isOwnDashboardMatch={Boolean(ownerOptions?.isOwnDashboardMatch)}
                onVisibilityUpdated={(nextPublic) => {
                  setMatch((current) => {
                    if (!current) return null;
                    const next = { ...current, isPublic: nextPublic };
                    seedMatchVisibilityFromMatch(next, { markExploreStale: true });
                    return next;
                  });
                }}
              />
            </View>
          </View>

          {/* ── Score Breakdown ── */}
          {(match.sets ?? []).length > 0 ? (
            <View className="mb-6">
              <Text className="text-h3 font-semibold text-foreground mb-4">Score Breakdown</Text>
              <View
                className="bg-card rounded-2xl p-5 gap-3"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                {(match.sets ?? []).map((set, index) => {
                  const aWins = set.playerAScore > set.playerBScore;
                  const bWins = set.playerBScore > set.playerAScore;
                  return (
                    <View key={index}>
                      <View className="flex-row items-center justify-between py-4">
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            backgroundColor:
                              aWins || bWins
                                ? "rgba(34,197,94,0.1)"
                                : "rgba(0,0,0,0.03)",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: aWins || bWins ? "#22c55e" : "#6b7280",
                            }}
                          >
                            Set {index + 1}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-3">
                          {/* Player A score */}
                          <View
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 12,
                              backgroundColor: aWins
                                ? "rgba(37,99,235,0.15)"
                                : "rgba(0,0,0,0.03)",
                              borderWidth: 2,
                              borderColor: aWins ? "#22c55e" : "#e5e7eb",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: aWins ? "#22c55e" : "#1f2937",
                              }}
                            >
                              {set.playerAScore}
                            </Text>
                          </View>

                          <Text className="text-body font-medium text-muted-foreground">-</Text>

                          {/* Player B score */}
                          <View
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 12,
                              backgroundColor: bWins
                                ? "rgba(37,99,235,0.15)"
                                : "rgba(0,0,0,0.03)",
                              borderWidth: 2,
                              borderColor: bWins ? "#22c55e" : "#e5e7eb",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: bWins ? "#22c55e" : "#1f2937",
                              }}
                            >
                              {set.playerBScore}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {index < (match.sets ?? []).length - 1 ? (
                        <View
                          style={{
                            height: 2,
                            backgroundColor: "#e5e7eb",
                            marginVertical: 8,
                            borderRadius: 1,
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ── Notes ── */}
          {(match.notes || canEditNotes) ? (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-h3 font-semibold text-foreground">Notes</Text>
                {canEditNotes ? (
                  <TouchableOpacity
                    onPress={handleEditNotes}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
                    accessibilityRole="button"
                    accessibilityLabel={match.notes ? "Edit notes" : "Add notes"}
                  >
                    <LucideIcon name="StickyNote" size={14} color="#f59e0b" />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#f59e0b" }}>
                      {match.notes ? "Edit" : "Add"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {match.notes ? (
                <View
                  className="bg-card rounded-2xl p-5"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  <Text className="text-body text-foreground leading-6">{match.notes}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleEditNotes}
                  className="bg-card rounded-2xl p-5 border border-dashed border-border"
                  accessibilityRole="button"
                  accessibilityLabel="Add match notes"
                >
                  <Text className="text-body text-muted-foreground text-center">
                    No notes yet. Tap to add match notes.
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* ── Delete ── */}
          {isCreator ? (
            <View className="mb-6">
              <TouchableOpacity
                onPress={handleDelete}
                className="bg-card rounded-2xl p-4 border border-destructive/30"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Delete match"
                accessibilityHint="Permanently removes this match"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-center gap-3">
                  <LucideIcon
                    name="Trash2"
                    size={20}
                    color={theme.colors.destructive ?? "#dc2626"}
                  />
                  <Text
                    className="text-body font-semibold"
                    style={{ color: theme.colors.destructive ?? "#dc2626" }}
                    numberOfLines={1}
                  >
                    Delete Match
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}
