import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  type ScrollView as ScrollViewType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { Switch } from "~/components/ui/switch";
import LucideIcon from "~/lib/icons/LucideIcon";
import { Match, MatchSet } from "~/types/match";
import { CalendarPicker } from "~/components/ui/CalendarPicker";
import { TimePicker } from "~/components/ui/TimePicker";
import { matchService, UpdateMatchInput } from "../../src/services/api/matchService";
import { formatMatchSaveError } from "../../src/services/api/matchFormErrors";
import { AppError } from "../../src/services/api/apiErrors";
import { getUserFriendlyErrorMessage } from "../../src/services/api/userFriendlyErrors";
import { devLog } from "../../src/utils/devLog";
import { useAuth } from "../../src/context/AuthContext";
import {
  canEditMatchNotes,
  isMatchEditableByCreator,
  matchEditBlockedMessage,
  resolveMatchEditOwnerOptions,
  resolveMatchLifecycleFields,
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
import {
  MATCH_COMPLETE_FOCUS,
  MATCH_NAV_SOURCE_DETAIL,
} from "../../src/utils/matchLifecycle";
import {
  hasEnterableMatchScores,
  scheduledMatchSaveLabel,
  scheduledSaveBlockedMessage,
} from "../../src/utils/matchScheduledLifecycle";
import { scheduleMatchCalendarSync } from "../../src/services/calendar/matchCalendarSync";
import { notifyParticipantsOfMatchUpdate } from "../../src/services/notifications/matchUpdateNotifier";
import {
  DEFAULT_LIVE_MATCH_SETS,
  setsForMatchWrite,
} from "../../src/utils/matchSetsPayload";
import { combineMatchDateAndTime } from "../../src/utils/matchDateTime";
import { ScreenErrorState, ScreenLoadingState } from "~/components/ui/AsyncListState";
import { recordMatchSets } from "../../src/stores/matchSetsStore";
import { CreateMatchHeader } from "~/components/createMatch/CreateMatchHeader";
import { CreateMatchPlayersCard } from "~/components/createMatch/CreateMatchPlayersCard";
import { CreateMatchScoreEditor } from "~/components/createMatch/CreateMatchScoreEditor";
import { createMatch, inputStyle } from "~/components/createMatch/createMatchStyles";
import {
  MatchFormSectionTitle,
  MatchFormFieldLabel,
  MatchFormPickerField,
  MatchFormFooter,
  formatMatchFormDate,
  timeFromDate,
  matchFormFooterPadding,
} from "~/components/createMatch/matchFormFields";

export default function EditMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const { id, focus, source } = useLocalSearchParams<{
    id: string;
    focus?: string;
    source?: string;
  }>();
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

  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [matchDate, setMatchDate] = useState(new Date());
  const [matchTime, setMatchTime] = useState("12:00");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [locationFocused, setLocationFocused] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [sets, setSets] = useState<MatchSet[]>(DEFAULT_LIVE_MATCH_SETS);
  const [notes, setNotes] = useState("");
  const [notesFocused, setNotesFocused] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const retryFetch = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchMatch = async () => {
      if (!currentUser?.id) return;

      try {
        setFetchError(null);
        setBlockedMessage(null);
        setIsLoading(true);
        const raw = await matchService.getMatchDetails(id as string);
        if (cancelled) return;
        const enriched = enrichMatchForViewer(raw, currentUser.id);
        const data = resolveMatchLifecycleFields(enriched);
        syncMatchOwnershipFromMatches([data]);
        if (data.creatorId) {
          recordMatchOwnership(data.id, data.creatorId, data.finishedAt);
        }
        setMatch(data);
        recordMatchSets(data.id, data.sets);
        setPlayerA(data.playerA);
        setPlayerB(data.playerB);
        const parsedDate = new Date(data.matchDate);
        setMatchDate(parsedDate);
        setMatchTime(timeFromDate(parsedDate));
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
        const notesEditable = canEditMatchNotes(data, currentUser.id, ownerOptions);
        if (!editable && !(isNotesFocus && notesEditable)) {
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
  }, [id, currentUser?.id, reloadKey, isNotesFocus]);

  useEffect(() => {
    if (isLoading || !match) return;
    if (!isNotesFocus && !isCompleteFocus) return;
    const timer = setTimeout(() => {
      const y = isCompleteFocus ? scoresSectionY.current : notesSectionY.current;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [isNotesFocus, isCompleteFocus, isLoading, match?.id]);

  const handleScheduledToggle = (checked: boolean) => {
    setIsScheduled(checked);
    if (checked) {
      setSets([]);
    } else if (sets.length === 0) {
      setSets(DEFAULT_LIVE_MATCH_SETS);
    }
  };

  const getMaxDate = () => (isScheduled ? undefined : new Date());
  const getMinDate = () => (isScheduled ? new Date() : undefined);

  const notesOnlyUi = isNotesFocus && match?.status === "completed";

  const canComplete = canCompleteMatchWithScores(playerA, playerB, sets);
  const hasScores = hasEnterableMatchScores(sets);
  const isScheduledMatch = match?.status === "scheduled";
  const canShowCompleteActions =
    match?.status === "live" || match?.status === "scheduled";
  const lifecycleMatch = match ? resolveMatchLifecycleFields(match) : null;
  const hideScoreForScheduledToggle = isScheduled && match?.status === "live";
  const canShowScoreSection =
    !notesOnlyUi &&
    !hideScoreForScheduledToggle &&
    (!lifecycleMatch || lifecycleMatch.status !== "completed");
  const showScheduledToggle = match?.status === "live";
  const matchDateIso = () => combineMatchDateAndTime(matchDate, matchTime).toISOString();

  const buildMatchInput = (writeStatus: "live" | "scheduled"): UpdateMatchInput => ({
    playerA,
    playerB,
    matchDate: matchDateIso(),
    location,
    isPublic,
    sets: setsForMatchWrite(sets, writeStatus),
    notes,
  });

  const handleSaveNotesOnly = async () => {
    const ownerOptions = match
      ? resolveMatchEditOwnerOptions(match, currentUser?.id)
      : undefined;
    if (match && !canEditMatchNotes(match, currentUser?.id, ownerOptions)) {
      Alert.alert("Cannot save", matchEditBlockedMessage(match, currentUser?.id, ownerOptions));
      return;
    }

    setIsSubmitting(true);
    try {
      let updatedMatch: Match | null = null;
      if (match?.status === "completed") {
        updatedMatch = await matchService.updateMatch(id as string, { notes }, { omitStatus: true });
      } else {
        const status = match?.status === "scheduled" ? "scheduled" : "live";
        updatedMatch = await matchService.updateMatch(id as string, { notes, status });
      }
      if (updatedMatch) {
        await notifyParticipantsOfMatchUpdate({
          previousMatch: match,
          nextMatch: updatedMatch,
          actorUserId: currentUser?.id,
          reason: "match_updated",
        });
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
        matchDate: combineMatchDateAndTime(matchDate, matchTime),
        location,
        notes,
        sets: setsForMatchWrite(sets, "completed"),
        isPublic,
      });
      const saved = await matchService.updateMatch(id as string, patch, { omitStatus: true });
      seedMatchVisibilityFromMatch(saved, { markExploreStale: true });
      scheduleMatchCalendarSync(saved, currentUser?.id);
      await notifyParticipantsOfMatchUpdate({
        previousMatch: match,
        nextMatch: saved,
        actorUserId: currentUser?.id,
        reason: "match_updated",
      });
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
      scheduleMatchCalendarSync(saved, currentUser?.id);
      await notifyParticipantsOfMatchUpdate({
        previousMatch: match,
        nextMatch: saved,
        actorUserId: currentUser?.id,
        reason: "match_updated",
      });
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
      scheduleMatchCalendarSync(completed, currentUser?.id);
      await notifyParticipantsOfMatchUpdate({
        previousMatch: match,
        nextMatch: completed,
        actorUserId: currentUser?.id,
        reason: "match_completed",
      });
      if (source === MATCH_NAV_SOURCE_DETAIL && router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/match/${id}`);
      }
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

  const headerTitle = isNotesFocus ? "Match Notes" : "Edit Match";

  const showCompleteGhost =
    !notesOnlyUi &&
    canShowCompleteActions &&
    !isScheduledMatch &&
    match?.status === "live";

  const footerPrimaryLabel = notesOnlyUi
    ? "Save Notes"
    : isScheduledMatch
      ? "Start Live"
      : "Save Changes";

  const footerOnPrimary = notesOnlyUi
    ? handleSave
    : isScheduledMatch
      ? handleStartLive
      : handleSave;

  const footerSecondaryLabel =
    showCompleteGhost && canComplete ? "Save & Complete" : isScheduledMatch
      ? scheduledMatchSaveLabel(hasScores)
      : undefined;

  const footerOnSecondary = isScheduledMatch
    ? hasScores
      ? undefined
      : handleSave
    : showCompleteGhost
      ? handleComplete
      : undefined;

  const footerSecondaryDisabled = isScheduledMatch ? isSubmitting || hasScores : !canComplete;

  const footerPad = matchFormFooterPadding(
    insets.bottom,
    Boolean(footerSecondaryLabel && footerOnSecondary)
  );

  const shell = (children: ReactNode) => (
  <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={{ flex: 1, backgroundColor: createMatch.pageBg }}>
      <CreateMatchHeader
        topInset={insets.top}
        title={headerTitle}
        onBack={() => router.back()}
      />
      {children}
    </View>
  </>
  );

  if (isLoading) {
    return shell(<ScreenLoadingState message="Loading match details…" />);
  }

  if (!match) {
    return shell(
      <ScreenErrorState
        title={fetchError ? "Couldn't load match" : "Match not found"}
        message={fetchError ?? "This match may have been removed or is no longer available."}
        onRetry={fetchError ? retryFetch : undefined}
        onBack={() => router.back()}
      />
    );
  }

  if (blockedMessage) {
    return shell(
      <ScreenErrorState
        title="Can't edit this match"
        message={blockedMessage}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: createMatch.pageBg }}>
        <CreateMatchHeader
          topInset={insets.top}
          title={headerTitle}
          onBack={() => router.back()}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: footerPad,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            {notesOnlyUi ? (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: createMatch.fonts.regular,
                    fontSize: 14,
                    color: createMatch.muted,
                    marginBottom: 20,
                    lineHeight: 20,
                  }}
                >
                  Add or update notes for this match. Changes are saved to your match and visible in
                  match details.
                </Text>
                <MatchFormSectionTitle>Notes</MatchFormSectionTitle>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add match notes"
                  placeholderTextColor={createMatch.placeholder}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  onFocus={() => setNotesFocused(true)}
                  onBlur={() => setNotesFocused(false)}
                  style={{
                    ...inputStyle(notesFocused),
                    minHeight: 160,
                    paddingTop: 14,
                  }}
                  accessibilityLabel="Match notes"
                />
              </View>
            ) : (
              <>
                <MatchFormSectionTitle>Players</MatchFormSectionTitle>
                <View style={{ marginBottom: 24 }}>
                  <CreateMatchPlayersCard
                    playerA={playerA}
                    playerB={playerB}
                    onChangeA={setPlayerA}
                    onChangeB={setPlayerB}
                    initialFocusSide="A"
                  />
                </View>

                <MatchFormSectionTitle>Match Details</MatchFormSectionTitle>
                <View style={{ gap: 14, marginBottom: 24 }}>
                  <MatchFormPickerField
                    label="Match Date"
                    value={formatMatchFormDate(matchDate)}
                    icon="Calendar"
                    onPress={() => setShowDatePicker(true)}
                  />
                  <MatchFormPickerField
                    label="Match Time"
                    value={matchTime}
                    icon="Clock"
                    onPress={() => setShowTimePicker(true)}
                  />
                  <View>
                    <MatchFormFieldLabel>Location (Optional)</MatchFormFieldLabel>
                    <TextInput
                      value={location}
                      onChangeText={setLocation}
                      placeholder="e.g., Golden Gate Park Courts"
                      placeholderTextColor={createMatch.placeholder}
                      onFocus={() => setLocationFocused(true)}
                      onBlur={() => setLocationFocused(false)}
                      style={inputStyle(locationFocused)}
                      accessibilityLabel="Match location"
                    />
                  </View>

                  {showScheduledToggle ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 4,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={{
                            fontFamily: createMatch.fonts.bold,
                            fontSize: 15,
                            color: createMatch.ink,
                          }}
                        >
                          Scheduled
                        </Text>
                        <Text
                          style={{
                            fontFamily: createMatch.fonts.regular,
                            fontSize: 13,
                            color: createMatch.muted,
                            marginTop: 2,
                          }}
                        >
                          Mark as scheduled for later
                        </Text>
                      </View>
                      <Switch checked={isScheduled} onCheckedChange={handleScheduledToggle} />
                    </View>
                  ) : null}

                  {match.status === "scheduled" ? (
                    <View
                      style={{
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: createMatch.notesBtnBg,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: createMatch.fonts.regular,
                          fontSize: 14,
                          color: createMatch.ink,
                          lineHeight: 20,
                        }}
                      >
                        {hasScores
                          ? "Scores can't stay on a Scheduled match. Tap Start Live to save scores, or clear scores to keep it scheduled."
                          : "When play starts, tap Start Live. Enter scores below, then Save & Complete when the match is done."}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {canShowScoreSection ? (
                  <View
                    onLayout={(e) => {
                      scoresSectionY.current = e.nativeEvent.layout.y;
                    }}
                  >
                    <MatchFormSectionTitle>Score</MatchFormSectionTitle>
                    <View style={{ marginBottom: 24 }}>
                      <CreateMatchScoreEditor sets={sets} onChange={setSets} />
                    </View>
                  </View>
                ) : null}

                <View
                  onLayout={(e) => {
                    notesSectionY.current = e.nativeEvent.layout.y;
                  }}
                >
                  <MatchFormSectionTitle>Notes</MatchFormSectionTitle>
                  <View style={{ marginBottom: 24 }}>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add match notes"
                      placeholderTextColor={createMatch.placeholder}
                      multiline
                      textAlignVertical="top"
                      onFocus={() => setNotesFocused(true)}
                      onBlur={() => setNotesFocused(false)}
                      style={{
                        ...inputStyle(notesFocused),
                        minHeight: 80,
                        paddingTop: 14,
                      }}
                      accessibilityLabel="Match notes"
                    />
                  </View>
                </View>

                <MatchFormSectionTitle>Privacy</MatchFormSectionTitle>
                <View
                  style={{
                    backgroundColor: createMatch.cardBg,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: createMatch.cardBorder,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text
                          style={{
                            fontFamily: createMatch.fonts.bold,
                            fontSize: 15,
                            color: createMatch.ink,
                          }}
                        >
                          Public
                        </Text>
                        <LucideIcon name="Info" size={15} color={createMatch.muted} />
                      </View>
                      <Text
                        style={{
                          fontFamily: createMatch.fonts.regular,
                          fontSize: 13,
                          color: createMatch.muted,
                          marginTop: 2,
                        }}
                      >
                        Public matches appear in Explore
                      </Text>
                    </View>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <MatchFormFooter
          bottomInset={insets.bottom}
          primaryLabel={footerPrimaryLabel}
          onPrimary={footerOnPrimary}
          isSubmitting={isSubmitting}
          secondaryLabel={footerSecondaryLabel}
          onSecondary={footerOnSecondary}
          secondaryDisabled={footerSecondaryDisabled}
        />

        <CalendarPicker
          visible={showDatePicker}
          selectedDate={matchDate}
          onConfirm={(date) => {
            setMatchDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
          minimumDate={getMinDate()}
          maximumDate={getMaxDate()}
        />
        <TimePicker
          visible={showTimePicker}
          selectedTime={matchTime}
          onConfirm={(time) => {
            setMatchTime(time);
            setShowTimePicker(false);
          }}
          onCancel={() => setShowTimePicker(false)}
        />
      </View>
    </>
  );
}
