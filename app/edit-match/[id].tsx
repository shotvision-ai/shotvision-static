import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type ScrollView as ScrollViewType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTheme } from "~/theming/ThemeProvider";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import LucideIcon from "~/lib/icons/LucideIcon";
import { Match, MatchSet } from "~/types/match";
import { CalendarPicker } from "~/components/ui/CalendarPicker";
import { matchService, UpdateMatchInput } from "../../src/services/api/matchService";
import { formatMatchSaveError } from "../../src/services/api/matchFormErrors";
import { AppError } from "../../src/services/api/apiErrors";
import { getUserFriendlyErrorMessage } from "../../src/services/api/userFriendlyErrors";
import { devLog } from "../../src/utils/devLog";
import { useAuth } from "../../src/context/AuthContext";
import {
  isFinishedMatchWithinEditWindow,
  isMatchEditableByCreator,
  matchEditBlockedMessage,
  resolveMatchEditOwnerOptions,
} from "../../src/utils/matchEditEligibility";
import { buildFinishedMatchPatchInput } from "../../src/utils/matchEditPatch";
import {
  enrichMatchForViewer,
  recordMatchOwnership,
  syncMatchOwnershipFromMatches,
} from "../../src/utils/matchOwnership";
import { MATCH_NOTES_FOCUS } from "../../src/utils/matchNotes";
import { seedMatchVisibilityFromMatch } from "../../src/utils/matchVisibility";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";
import {
  canCompleteMatchWithScores,
  completeMatchValidationMessage,
} from "../../src/utils/matchCompletion";
import { MATCH_COMPLETE_FOCUS } from "../../src/utils/matchLifecycle";
import {
  hasEnterableMatchScores,
  scheduledMatchSaveLabel,
  scheduledSaveBlockedMessage,
} from "../../src/utils/matchScheduledLifecycle";
import {
  DEFAULT_LIVE_MATCH_SETS,
  setsForMatchWrite,
} from "../../src/utils/matchSetsPayload";
import { useAppTheming } from "../../src/hooks/useAppTheming";
import { ScreenErrorState, ScreenLoadingState } from "~/components/ui/AsyncListState";

export default function EditMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors, brand } = useAppTheming();
  const { user: currentUser } = useAuth();
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const isNotesFocus = focus === MATCH_NOTES_FOCUS;
  const isCompleteFocus = focus === MATCH_COMPLETE_FOCUS;
  const scrollRef = useRef<ScrollViewType>(null);
  const notesSectionY = useRef(0);
  const scoresSectionY = useRef(0);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Form state
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [matchDate, setMatchDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [sets, setSets] = useState<MatchSet[]>(DEFAULT_LIVE_MATCH_SETS);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const retryFetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Fetch match details — cancelled flag avoids setState after unmount / id change.
  useEffect(() => {
    let cancelled = false;

    const fetchMatch = async () => {
      if (!currentUser?.id) {
        return;
      }

      try {
        setFetchError(null);
        setBlockedMessage(null);
        setIsLoading(true);
        const raw = await matchService.getMatchDetails(id as string);
        if (cancelled) return;
        const data = enrichMatchForViewer(raw, currentUser.id);
        syncMatchOwnershipFromMatches([data]);
        if (data.creatorId) {
          recordMatchOwnership(data.id, data.creatorId, data.finishedAt);
        }
        setMatch(data);
        setPlayerA(data.playerA);
        setPlayerB(data.playerB);
        setMatchDate(new Date(data.matchDate));
        setLocation(data.location || "");
        setIsScheduled(data.status === "scheduled");
        setSets(
          data.sets.length > 0
            ? data.sets
            : data.status === "completed"
              ? []
              : DEFAULT_LIVE_MATCH_SETS
        );
        setNotes(data.notes || "");
        setIsPublic(data.isPublic);

        const ownerOptions = resolveMatchEditOwnerOptions(data, currentUser.id);
        const editable = isMatchEditableByCreator(data, currentUser.id, ownerOptions);
        if (!editable) {
          setBlockedMessage(matchEditBlockedMessage(data, currentUser.id, ownerOptions));
        }
      } catch (err: unknown) {
        if (cancelled) return;
        devLog.error("[edit-match] fetch failed:", err);
        setFetchError(getUserFriendlyErrorMessage(err, "Failed to load match details"));
        setMatch(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (!currentUser?.id) {
      setIsLoading(true);
      return () => {
        cancelled = true;
      };
    }

    void fetchMatch();
    return () => {
      cancelled = true;
    };
  }, [id, currentUser?.id, reloadKey]);

  useEffect(() => {
    if (isLoading || !match) return;
    if (!isNotesFocus && !isCompleteFocus) return;
    const timer = setTimeout(() => {
      const y = isCompleteFocus ? scoresSectionY.current : notesSectionY.current;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [isNotesFocus, isCompleteFocus, isLoading, match?.id]);

  const handleDatePickerOpen = () => {
    setShowDatePicker(true);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const handleDateConfirm = (date: Date) => {
    setMatchDate(date);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleScheduledToggle = (checked: boolean) => {
    setIsScheduled(checked);
    if (checked) {
      setSets([]);
    } else if (sets.length === 0) {
      setSets(DEFAULT_LIVE_MATCH_SETS);
    }
  };

  const getMaxDate = () => {
    if (isScheduled) {
      return undefined;
    }
    return new Date();
  };

  const getMinDate = () => {
    if (isScheduled) {
      return new Date();
    }
    return undefined;
  };

  const addSet = () => {
    if (sets.length < 5) {
      setSets([...sets, { playerAScore: 0, playerBScore: 0 }]);
    }
  };

  const updateSet = (index: number, field: "playerAScore" | "playerBScore", value: string) => {
    const newSets = [...sets];
    newSets[index][field] = parseInt(value) || 0;
    setSets(newSets);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  const canComplete = canCompleteMatchWithScores(playerA, playerB, sets);
  const hasScores = hasEnterableMatchScores(sets);
  const isScheduledMatch = match?.status === "scheduled";
  const canShowCompleteActions =
    match?.status === "live" || match?.status === "scheduled";
  // Show the score section for live/scheduled matches and for completed matches
  // that are still within the 48-hour edit window, so owners can correct scores.
  const canShowScoreSection =
    !match ||
    match.status !== "completed" ||
    isFinishedMatchWithinEditWindow(match);

  const buildMatchInput = (writeStatus: "live" | "scheduled"): UpdateMatchInput => ({
    playerA,
    playerB,
    matchDate: matchDate.toISOString(),
    location,
    isPublic,
    sets: setsForMatchWrite(sets, writeStatus),
    notes,
  });

  /** Finished matches: PATCH fields only — never send `status: LIVE` (backend rejects). */
  const handleSaveNotesOnly = async () => {
    const ownerOptions = match
      ? resolveMatchEditOwnerOptions(match, currentUser?.id)
      : undefined;
    if (match && !isMatchEditableByCreator(match, currentUser?.id, ownerOptions)) {
      Alert.alert("Cannot save", matchEditBlockedMessage(match, currentUser?.id, ownerOptions));
      return;
    }

    setIsSubmitting(true);
    try {
      if (match?.status === "completed") {
        await matchService.updateMatch(id as string, { notes }, { omitStatus: true });
      } else {
        const status = match?.status === "scheduled" ? "scheduled" : "live";
        await matchService.updateMatch(id as string, { notes, status });
      }
      router.replace(`/match/${id}`);
    } catch (error: unknown) {
      if (__DEV__) {
        const summary =
          error instanceof AppError ? `${error.code} (${error.statusCode})` : String(error);
        devLog.warn("[edit-match] save notes failed:", summary);
      }
      const { title, body } = formatMatchSaveError(error);
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFinishedMatch = async () => {
    if (playerA.trim() === "" || playerB.trim() === "") {
      Alert.alert("Validation Error", "Please enter both player names.");
      return;
    }

    const ownerOptions = match
      ? resolveMatchEditOwnerOptions(match, currentUser?.id)
      : undefined;
    if (match && !isMatchEditableByCreator(match, currentUser?.id, ownerOptions)) {
      Alert.alert("Cannot save", matchEditBlockedMessage(match, currentUser?.id, ownerOptions));
      return;
    }

    setIsSubmitting(true);
    try {
      const patch = buildFinishedMatchPatchInput(match!, {
        playerA,
        playerB,
        matchDate,
        location,
        notes,
        sets: setsForMatchWrite(sets, "completed"),
        isPublic,
      });
      const saved = await matchService.updateMatch(id as string, patch, {
        omitStatus: true,
      });
      seedMatchVisibilityFromMatch(saved, { markExploreStale: true });
      router.replace("/(tabs)/dashboard");
    } catch (error: unknown) {
      if (__DEV__) {
        const summary =
          error instanceof AppError ? `${error.code} (${error.statusCode})` : String(error);
        devLog.warn("[edit-match] save finished match failed:", summary);
      }
      const { title, body } = formatMatchSaveError(error);
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (status: "live" | "scheduled") => {
    if (playerA.trim() === "" || playerB.trim() === "") {
      Alert.alert("Validation Error", "Please enter both player names.");
      return;
    }

    if (status === "scheduled") {
      const blocked = scheduledSaveBlockedMessage(sets);
      if (blocked) {
        Alert.alert("Can't save as Scheduled", blocked);
        return;
      }
    }

    const ownerOptions = match
      ? resolveMatchEditOwnerOptions(match, currentUser?.id)
      : undefined;
    if (match && !isMatchEditableByCreator(match, currentUser?.id, ownerOptions)) {
      Alert.alert("Cannot save", matchEditBlockedMessage(match, currentUser?.id, ownerOptions));
      return;
    }

    setIsSubmitting(true);
    try {
      const input = { ...buildMatchInput(status), status };
      const saved = await matchService.updateMatch(id as string, input);
      seedMatchVisibilityFromMatch(saved, { markExploreStale: true });
      useMatchVisibilityStore.getState().markAllListsStale();
      router.replace("/(tabs)/dashboard");
    } catch (error: unknown) {
      if (__DEV__) {
        const summary =
          error instanceof AppError ? `${error.code} (${error.statusCode})` : String(error);
        devLog.warn("[edit-match] save failed:", summary);
      }
      const { title, body } = formatMatchSaveError(error);
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runCompleteMatch = async () => {
    setIsSubmitting(true);
    try {
      const completed = await matchService.completeMatch(id as string, buildMatchInput("live"));
      seedMatchVisibilityFromMatch(completed, { markExploreStale: true });
      useMatchVisibilityStore.getState().markAllListsStale();
      router.replace(`/match/${id}`);
    } catch (error: unknown) {
      if (__DEV__) {
        const summary =
          error instanceof AppError ? `${error.code} (${error.statusCode})` : String(error);
        devLog.warn("[edit-match] complete failed:", summary);
      }
      const { title, body } = formatMatchSaveError(error);
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    const validationMsg = completeMatchValidationMessage(playerA, playerB, sets);
    if (validationMsg) {
      Alert.alert("Cannot complete match", validationMsg);
      return;
    }

    Alert.alert(
      "Complete match?",
      "Final scores will be saved and this match will be marked as finished.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save & Complete", onPress: () => void runCompleteMatch() },
      ]
    );
  };

  const handleStartLive = () => {
    if (playerA.trim() === "" || playerB.trim() === "") {
      Alert.alert("Validation Error", "Please enter both player names.");
      return;
    }

    Alert.alert(
      "Start match live?",
      hasScores
        ? "Scores will be saved and this match will move to Live. You can finish it with Save & Complete when done."
        : "This scheduled match will move to Live so you can record scores as play progresses.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start Live", onPress: () => void handleSubmit("live") },
      ]
    );
  };

  const handleSave = () => {
    // Notes-only path: only valid when the match is completed (notesOnlyUi).
    // For live/scheduled the full form is shown; go through the full save so score
    // and other field changes entered on that form are not silently discarded.
    if (isNotesFocus && match?.status === "completed") {
      void handleSaveNotesOnly();
      return;
    }
    if (match?.status === "completed") {
      void handleSaveFinishedMatch();
      return;
    }
    if (match?.status === "scheduled") {
      const blocked = scheduledSaveBlockedMessage(sets);
      if (blocked) {
        Alert.alert("Can't save as Scheduled", blocked);
        return;
      }
      void handleSubmit("scheduled");
      return;
    }
    void handleSubmit(isScheduled ? "scheduled" : "live");
  };

  const notesOnlyUi = isNotesFocus && match?.status === "completed";

  const screenHeader = (
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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            padding: 8,
            marginLeft: 4,
            minWidth: 44,
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <LucideIcon name="ChevronLeft" size={26} color={theme.colors.foreground} />
        </TouchableOpacity>

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
            {isNotesFocus ? "Match Notes" : "Edit Match"}
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {screenHeader}
          <ScreenLoadingState message="Loading match details…" />
        </View>
      </>
    );
  }

  if (!match) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {screenHeader}
          <ScreenErrorState
            title={fetchError ? "Couldn't load match" : "Match not found"}
            message={fetchError ?? "This match may have been removed or is no longer available."}
            onRetry={fetchError ? retryFetch : undefined}
            onBack={() => router.back()}
          />
        </View>
      </>
    );
  }

  if (blockedMessage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {screenHeader}
          <ScreenErrorState
            title="Can't edit this match"
            message={blockedMessage}
            onBack={() => router.back()}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {screenHeader}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 16,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets
            >
        {notesOnlyUi ? (
          <View className="mb-6">
            <Text className="text-body text-muted-foreground mb-6 leading-6">
              Add or update notes for this match. Changes are saved to your match and visible in
              match details.
            </Text>
            <Text className="text-h3 font-semibold text-foreground mb-4">Notes</Text>
            <Textarea
              placeholder="Add match notes"
              value={notes}
              onChangeText={setNotes}
              numberOfLines={6}
              className="min-h-[160px]"
              autoFocus
            />
          </View>
        ) : (
          <>
        {/* Section 1: Players */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Players</Text>
          <View
            style={{
              backgroundColor: "rgba(37,99,235,0.04)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(37,99,235,0.15)",
              padding: 16,
            }}
          >
            {/* Player A */}
            <View className="mb-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: playerA ? brand.blue : colors.emptyAvatar,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {playerA ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                      {playerA.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <LucideIcon name="User" size={16} color={colors.muted} />
                  )}
                </View>
                <Text className="text-body font-semibold text-foreground">Player A</Text>
              </View>
              <Input
                placeholder="Enter player name"
                value={playerA}
                onChangeText={setPlayerA}
                className="rounded-xl"
                style={{ borderColor: playerA ? "#2563eb" : undefined, borderWidth: 1.5 }}
              />
            </View>

            {/* VS divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(37,99,235,0.15)" }} />
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#2563eb",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffffff" }}>VS</Text>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(37,99,235,0.15)" }} />
            </View>

            {/* Player B */}
            <View className="mt-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: playerB ? brand.purple : colors.emptyAvatar,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {playerB ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                      {playerB.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <LucideIcon name="User" size={16} color={colors.muted} />
                  )}
                </View>
                <Text className="text-body font-semibold text-foreground">Player B</Text>
              </View>
              <Input
                placeholder="Enter player name"
                value={playerB}
                onChangeText={setPlayerB}
                className="rounded-xl"
                style={{ borderColor: playerB ? "#7c3aed" : undefined, borderWidth: 1.5 }}
              />
            </View>
          </View>
        </View>

        {/* Section 2: Match Details */}
        <View className="mb-10">
          <Text className="text-h3 font-semibold text-foreground mb-4">Match Details</Text>
          <View className="gap-4">
            <View>
              <Label nativeID="matchDate" className="mb-2">
                Match Date
              </Label>
              <TouchableOpacity
                onPress={handleDatePickerOpen}
                className="flex-row items-center justify-between bg-background border border-input rounded-lg px-4 py-3"
              >
                <Text className="text-body text-foreground">{formatDate(matchDate)}</Text>
                <LucideIcon name="Calendar" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View>
              <Label nativeID="location" className="mb-2">
                Location (Optional)
              </Label>
              <Input
                placeholder="e.g., Golden Gate Park Courts"
                value={location}
                onChangeText={setLocation}
                aria-labelledby="location"
              />
            </View>
            {match.status === "live" ? (
              <View className="flex-row items-center justify-between py-2">
                <View>
                  <Text className="text-body font-medium text-foreground">Scheduled</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Mark as scheduled for later
                  </Text>
                </View>
                <Switch checked={isScheduled} onCheckedChange={handleScheduledToggle} />
              </View>
            ) : null}
            {match.status === "scheduled" ? (
              <View
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: "rgba(37,99,235,0.08)" }}
              >
                <Text className="text-body text-foreground leading-6">
                  {hasScores
                    ? "Scores can't stay on a Scheduled match. Tap Start Live to save scores, or clear scores to keep it scheduled."
                    : "When play starts, tap Start Live. Enter scores below, then Save & Complete when the match is done."}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Section 3: Score — live/scheduled always; completed only within 48h edit window */}
        {canShowScoreSection ? (
          <View
            className="mb-10"
            onLayout={(e) => {
              scoresSectionY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text className="text-h3 font-semibold text-foreground mb-4">Score</Text>
            <View className="gap-3">
              {sets.map((set, index) => (
                <View key={index}>
                  <View
                    className="bg-card rounded-xl p-4 border border-border"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-body font-medium text-foreground">Set {index + 1}</Text>
                      {sets.length > 1 && (
                        <TouchableOpacity onPress={() => removeSet(index)} className="p-1">
                          <LucideIcon name="X" size={18} className="text-muted-foreground" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <Input
                          placeholder="0"
                          value={set.playerAScore.toString()}
                          onChangeText={(value) => updateSet(index, "playerAScore", value)}
                          keyboardType="numeric"
                        />
                      </View>
                      <Text className="text-body text-muted-foreground">-</Text>
                      <View className="flex-1">
                        <Input
                          placeholder="0"
                          value={set.playerBScore.toString()}
                          onChangeText={(value) => updateSet(index, "playerBScore", value)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                  {index < sets.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border,
                        marginVertical: 12,
                        marginHorizontal: 20,
                      }}
                    />
                  )}
                </View>
              ))}

              {sets.length < 5 && (
                <TouchableOpacity
                  onPress={addSet}
                  className="border border-dashed border-border/60 rounded-xl p-4 flex-row items-center justify-center mt-2"
                >
                  <LucideIcon name="Plus" size={20} className="text-muted-foreground mr-2" />
                  <Text className="text-body font-medium text-muted-foreground">Add Set</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}

        {/* Section 4: Notes */}
        <View
          className="mb-10"
          onLayout={(e) => {
            notesSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text className="text-h3 font-semibold text-foreground mb-4">Notes</Text>
          <Textarea
            placeholder="Add match notes"
            value={notes}
            onChangeText={setNotes}
            numberOfLines={4}
            className="min-h-[100px]"
          />
        </View>

        {/* Section 5: Privacy — last scroll block; action bar sits below viewport */}
        <View className="mb-4">
          <Text className="text-h3 font-semibold text-foreground mb-4">Privacy</Text>
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-body font-medium text-foreground">Public</Text>
                <TouchableOpacity className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <LucideIcon name="Info" size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text className="text-caption text-muted-foreground mt-0.5">
                Public matches appear in Explore
              </Text>
            </View>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </View>
        </View>
          </>
        )}
            </ScrollView>

            <View
              className="bg-background border-t border-border px-5 pt-4"
              style={{
                flexShrink: 0,
                paddingBottom: Math.max(insets.bottom, 12),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {!notesOnlyUi && playerA && playerB && (
                <View className="mb-4 pb-4 border-b border-border/40">
                  <Text className="text-caption text-muted-foreground/70 mb-1">Match Preview</Text>
                  <Text className="text-body font-medium text-foreground">
                    {playerA} vs {playerB}
                  </Text>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text className="text-caption text-muted-foreground">
                      Date: {formatDate(matchDate)}
                    </Text>
                    {location && (
                      <>
                        <Text className="text-caption text-muted-foreground">•</Text>
                        <Text className="text-caption text-muted-foreground">{location}</Text>
                      </>
                    )}
                  </View>
                </View>
              )}

              <View className="gap-3">
                {notesOnlyUi || isNotesFocus ? (
                  <Button onPress={handleSave} size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-button text-primary-foreground">Save Notes</Text>
                    )}
                  </Button>
                ) : canShowCompleteActions ? (
                  <>
                    {isScheduledMatch ? (
                      <>
                        <Button
                          onPress={handleStartLive}
                          size="lg"
                          style={{ backgroundColor: brand.blue }}
                          disabled={isSubmitting}
                          accessibilityLabel="Start match as live"
                        >
                          {isSubmitting ? (
                            <ActivityIndicator color="white" />
                          ) : (
                            <Text className="text-button text-white">Start Live</Text>
                          )}
                        </Button>
                        <Button
                          onPress={handleSave}
                          size="lg"
                          variant="outline"
                          disabled={isSubmitting || hasScores}
                          className={isSubmitting || hasScores ? "opacity-50" : ""}
                          accessibilityLabel="Save scheduled match without scores"
                        >
                          {isSubmitting ? (
                            <ActivityIndicator color={brand.blue} />
                          ) : (
                            <Text className="text-button text-foreground">
                              {scheduledMatchSaveLabel(hasScores)}
                            </Text>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button onPress={handleSave} size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text className="text-button text-primary-foreground">Save Changes</Text>
                        )}
                      </Button>
                    )}
                    <Button
                      onPress={handleComplete}
                      size="lg"
                      variant="outline"
                      disabled={!canComplete || isSubmitting}
                      className={!canComplete || isSubmitting ? "opacity-50" : ""}
                      accessibilityLabel="Save and complete match"
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#2563eb" />
                      ) : (
                        <Text className="text-button text-foreground">Save & Complete</Text>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button onPress={handleSave} size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-button text-primary-foreground">Save Changes</Text>
                    )}
                  </Button>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        <CalendarPicker
          visible={showDatePicker}
          selectedDate={matchDate}
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
          minimumDate={getMinDate()}
          maximumDate={getMaxDate()}
        />
      </View>
    </>
  );
}
