import { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
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
  resolveMatchEditOwnerOptions,
} from "../../src/utils/matchEditEligibility";
import { getEditMatchHref } from "../../src/utils/matchLifecycle";
import { getEditMatchNotesHref } from "../../src/utils/matchNotes";
import { getEditMatchCompleteHref } from "../../src/utils/matchLifecycle";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { applyMatchLikeOverrides, seedMatchLikeFromMatch } from "../../src/utils/matchLike";
import {
  applyMatchVisibilityOverrides,
  seedMatchVisibilityFromMatch,
} from "../../src/utils/matchVisibility";
import { MatchVisibilityControl } from "~/components/match/MatchVisibilityControl";
import { MatchLikeButton } from "~/components/match/MatchLikeButton";
import {
  enrichMatchForViewer,
  ensureMatchOwnershipSynced,
  recordMatchOwnership,
  syncMatchOwnershipFromMatches,
} from "../../src/utils/matchOwnership";

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

export default function MatchDetail() {
  const { id } = useLocalSearchParams();
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

  /** Ignores stale responses after fast navigation or unmount (prevents setState on unmounted screen). */
  const fetchSeqRef = useRef(0);

  const fetchMatchDetails = useCallback(async (refresh: boolean = false) => {
    const requestId = ++fetchSeqRef.current;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      await ensureMatchOwnershipSynced(currentUser?.id);
      const raw = await matchService.getMatchDetails(id as string);
      if (requestId !== fetchSeqRef.current) return;
      const owned = enrichMatchForViewer(raw, currentUser?.id);
      const data = applyMatchVisibilityOverrides(applyMatchLikeOverrides(owned));
      syncMatchOwnershipFromMatches([data]);
      if (data.creatorId) {
        recordMatchOwnership(data.id, data.creatorId, data.finishedAt);
      }
      seedMatchLikeFromMatch(data);
      seedMatchVisibilityFromMatch(data);
      setMatch(data);
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
  }, [id, currentUser?.id]);

  useEffect(() => {
    void fetchMatchDetails();
    return () => {
      fetchSeqRef.current += 1;
    };
  }, [fetchMatchDetails]);

  const onRefresh = () => {
    fetchMatchDetails(true);
  };

  const ownerOptions = match ? resolveMatchEditOwnerOptions(match, currentUser?.id) : undefined;

  const isCreator = () => {
    if (!match) return false;
    return isMatchOwner(match, currentUser?.id, ownerOptions);
  };

  const isEditable = () => isMatchEditableByCreator(match, currentUser?.id, ownerOptions);

  const canEditNotes = () => isEditable();

  const handleEdit = () => {
    if (!match?.id) return;
    router.push(getEditMatchHref(match.id));
  };

  const handleEditNotes = () => {
    if (!match) return;
    router.push(getEditMatchNotesHref(match.id));
  };

  const handleCompleteMatch = () => {
    if (!match) return;
    router.push(getEditMatchCompleteHref(match.id));
  };

  const handleStartLive = () => {
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
                setMatch(applyMatchVisibilityOverrides(applyMatchLikeOverrides(updated)));
              } catch (err: unknown) {
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
  };

  const handleShare = async () => {
    if (!match) return;
    try {
      await shareMatchById(match.id);
    } catch {
      // shareMatchById shows Alert on failure
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Match",
      "Are you sure you want to delete this match? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await matchService.deleteMatch(id as string);
              router.replace("/(tabs)/dashboard");
            } catch (err: any) {
              devLog.error("[match-detail] delete failed:", err);
              Alert.alert(
                "Error",
                getUserFriendlyErrorMessage(err, "Failed to delete match. Please try again.")
              );
            }
          },
        },
      ],
    );
  };

  // Shared JS header used across loading, error, and success states
  const ScreenHeader = () => (
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
        {/* Back button */}
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

        {/* Right actions: share + optional edit */}
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

          {match && isEditable() ? (
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

  if (isLoading && !isRefreshing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ScreenHeader />
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
          <ScreenHeader />
          <ScreenErrorState
            title={error ? "Couldn't load match" : "Match not found"}
            message={
              error ??
              "This match may have been removed or is no longer available."
            }
            onRetry={error ? () => void fetchMatchDetails() : undefined}
            onBack={() => router.back()}
          />
        </View>
      </>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

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
        <ScreenHeader />
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
        {/* Header Card */}
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
          {/* Creator Info */}
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
            <Text className="text-h2 font-bold text-foreground text-center">{match.playerB}</Text>
          </View>

          {/* Winner */}
          {match.status === "completed" && match.winner && (
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
          )}

          {/* Live / scheduled — owner can complete */}
          {match.status === "live" && (
            <View className="mt-4 bg-warning/10 rounded-lg p-4 gap-3">
              <Text className="text-h5 font-semibold text-warning text-center">
                Match in Progress
              </Text>
              {isMatchOwner(match, currentUser?.id) ? (
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
          )}

          {match.status === "scheduled" && isMatchOwner(match, currentUser?.id) && (
            <View className="mt-4 rounded-lg p-4 gap-3" style={{ backgroundColor: "rgba(37,99,235,0.08)" }}>
              <Text className="text-body text-foreground text-center leading-6">
                Start the match when play begins, then record scores and finish with Save & Complete.
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
                  <Text className="text-primary-foreground font-semibold text-center">Start Live</Text>
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
          )}

          {match.status === "scheduled" && match.scheduledDate ? (
            <View className="mt-2 bg-tertiary/10 rounded-lg p-4">
              <Text className="text-h5 font-semibold text-tertiary text-center">
                Scheduled for {formatDate(match.scheduledDate)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Match Details */}
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
                  {formatDate(match.matchDate)} • 14:00
                </Text>
              </View>
            </View>

            {match.location && (
              <View className="flex-row items-center">
                <LucideIcon name="MapPin" size={20} className="text-muted-foreground mr-3" />
                <View className="flex-1">
                  <Text className="text-caption text-muted-foreground mb-0.5">Location</Text>
                  <Text className="text-body font-medium text-foreground">{match.location}</Text>
                </View>
              </View>
            )}

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

        {/* Score Breakdown */}
        {(match.sets ?? []).length > 0 && (
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
              {(match.sets ?? []).map((set, index) => (
                <View key={index}>
                  <View className="flex-row items-center justify-between py-4">
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor:
                          set.playerAScore > set.playerBScore
                            ? "rgba(37, 99, 235, 0.12)"
                            : set.playerBScore > set.playerAScore
                              ? "rgba(37, 99, 235, 0.12)"
                              : "rgba(0, 0, 0, 0.03)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color:
                            set.playerAScore > set.playerBScore ||
                            set.playerBScore > set.playerAScore
                              ? "#22c55e"
                              : "#6b7280",
                        }}
                      >
                        Set {index + 1}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor:
                            set.playerAScore > set.playerBScore
                              ? "rgba(37, 99, 235, 0.15)"
                              : "#f9fafb",
                          borderWidth: 2,
                          borderColor: set.playerAScore > set.playerBScore ? "#22c55e" : "#e5e7eb",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: set.playerAScore > set.playerBScore ? "#22c55e" : "#1f2937",
                          }}
                        >
                          {set.playerAScore}
                        </Text>
                      </View>

                      <Text className="text-body font-medium text-muted-foreground">-</Text>

                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor:
                            set.playerBScore > set.playerAScore
                              ? "rgba(37, 99, 235, 0.15)"
                              : "#f9fafb",
                          borderWidth: 2,
                          borderColor: set.playerBScore > set.playerAScore ? "#22c55e" : "#e5e7eb",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: set.playerBScore > set.playerAScore ? "#22c55e" : "#1f2937",
                          }}
                        >
                          {set.playerBScore}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {index < (match.sets ?? []).length - 1 && (
                    <View
                      style={{
                        height: 2,
                        backgroundColor: "#e5e7eb",
                        marginVertical: 8,
                        borderRadius: 1,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes — show for owners within edit window; read-only when notes exist */}
        {(match.notes || canEditNotes()) && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-h3 font-semibold text-foreground">Notes</Text>
              {canEditNotes() ? (
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
        )}

        {/* Delete Button - Only for creator */}
        {isCreator() && (
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
        )}
        </ScrollView>
      </View>
    </>
  );
}
