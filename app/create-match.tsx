import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Switch } from "~/components/ui/switch";
import LucideIcon from "~/lib/icons/LucideIcon";
import { MatchSet } from "~/types/match";
import { CalendarPicker } from "~/components/ui/CalendarPicker";
import { TimePicker } from "~/components/ui/TimePicker";
import { matchService } from "../src/services/api/matchService";
import { formatMatchSaveError } from "../src/services/api/matchFormErrors";
import { AppError } from "../src/services/api/apiErrors";
import { devLog } from "../src/utils/devLog";
import {
  canCompleteMatchWithScores,
  completeMatchValidationMessage,
} from "../src/utils/matchCompletion";
import { useMatchVisibilityStore } from "../src/stores/matchVisibilityStore";
import { useAuth } from "../src/context/AuthContext";
import {
  invalidateMyMatchesExploreCache,
  seedMyMatchesExploreCacheItem,
  recordMatchOwnership,
} from "../src/utils/matchOwnership";
import { seedMatchVisibilityFromMatch } from "../src/utils/matchVisibility";
import { scheduledSaveBlockedMessage } from "../src/utils/matchScheduledLifecycle";
import {
  DEFAULT_LIVE_MATCH_SETS,
  setsForMatchWrite,
} from "../src/utils/matchSetsPayload";
import { combineMatchDateAndTime } from "../src/utils/matchDateTime";
import { scheduleMatchCalendarSync } from "../src/services/calendar/matchCalendarSync";
import { recordMatchSets } from "../src/stores/matchSetsStore";
import { CreateMatchHeader } from "~/components/createMatch/CreateMatchHeader";
import { CreateMatchPlayersCard } from "~/components/createMatch/CreateMatchPlayersCard";
import { CreateMatchScoreEditor } from "~/components/createMatch/CreateMatchScoreEditor";
import {
  createMatch,
  fieldLabelStyle,
  sectionTitleStyle,
  inputStyle,
} from "~/components/createMatch/createMatchStyles";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

function currentDeviceTimeHHmm(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={sectionTitleStyle}>{children}</Text>;
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={fieldLabelStyle}>{children}</Text>;
}

function PickerField({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: "Calendar" | "Clock";
  onPress: () => void;
}) {
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={STANDARD_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: createMatch.cardBg,
          borderWidth: 1,
          borderColor: createMatch.cardBorder,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            fontFamily: createMatch.fonts.regular,
            fontSize: 15,
            color: createMatch.ink,
          }}
        >
          {value}
        </Text>
        <LucideIcon name={icon} size={18} color={createMatch.muted} />
      </TouchableOpacity>
    </View>
  );
}

export default function CreateMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [matchDate, setMatchDate] = useState(new Date());
  const [matchTime, setMatchTime] = useState(() => currentDeviceTimeHHmm());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [locationFocused, setLocationFocused] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [sets, setSets] = useState<MatchSet[]>(DEFAULT_LIVE_MATCH_SETS);
  const [notes, setNotes] = useState("");
  const [notesFocused, setNotesFocused] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getMaxDate = () => (isScheduled ? undefined : new Date());
  const getMinDate = () => (isScheduled ? new Date() : undefined);

  const canComplete = canCompleteMatchWithScores(playerA, playerB, sets);

  const handleScheduledToggle = (checked: boolean) => {
    setIsScheduled(checked);
    if (checked) {
      setSets([]);
    } else if (sets.length === 0) {
      setSets(DEFAULT_LIVE_MATCH_SETS);
    }
  };

  const handleSubmit = async (status: "live" | "scheduled" | "completed") => {
    if (isSubmitting) return;

    if (playerA.trim() === "" || playerB.trim() === "") {
      Alert.alert("Validation Error", "Please enter both player names.");
      return;
    }

    if (status === "completed") {
      const validationMsg = completeMatchValidationMessage(playerA, playerB, sets);
      if (validationMsg) {
        Alert.alert("Cannot complete match", validationMsg);
        return;
      }
    }

    if (status === "scheduled") {
      const blocked = scheduledSaveBlockedMessage(sets);
      if (blocked) {
        Alert.alert("Can't save as Scheduled", blocked);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const matchDateIso = combineMatchDateAndTime(matchDate, matchTime).toISOString();
      const writeSets = setsForMatchWrite(sets, status);

      const input = {
        playerA,
        playerB,
        matchDate: matchDateIso,
        location,
        isPublic,
        sets: writeSets,
        notes,
        status,
      };

      let created;
      if (status === "completed") {
        const liveInput = {
          ...input,
          status: "live" as const,
          sets: setsForMatchWrite(sets, "live"),
        };
        const initial = await matchService.createMatch(liveInput);
        created = await matchService.completeMatch(initial.id, liveInput);
      } else {
        created = await matchService.createMatch(input);
      }

      const ownerId = user?.id?.trim() || created.creatorId?.trim();
      if (ownerId && created.id) {
        recordMatchOwnership(created.id, ownerId);
      }

      const resolvedPublic = Boolean(created.isPublic || isPublic);
      if (__DEV__) {
        devLog.info("[create-match] visibility", {
          userIntent: isPublic,
          apiIsPublic: created.isPublic,
          resolvedPublic,
          matchId: created.id,
        });
      }
      const createdForCache = {
        ...created,
        isPublic: resolvedPublic,
        ...(ownerId ? { creatorId: ownerId } : {}),
      };
      recordMatchSets(created.id, createdForCache.sets);
      seedMatchVisibilityFromMatch(createdForCache);
      invalidateMyMatchesExploreCache();
      if (resolvedPublic && user?.id) {
        seedMyMatchesExploreCacheItem(user.id, createdForCache);
      }
      useMatchVisibilityStore.getState().markAllListsStale();
      scheduleMatchCalendarSync(createdForCache, ownerId);
      router.replace(resolvedPublic ? "/(tabs)/explore" : "/(tabs)/dashboard");
    } catch (error: unknown) {
      if (__DEV__) {
        const summary =
          error instanceof AppError ? `${error.code} (${error.statusCode})` : String(error);
        devLog.warn("[create-match] save failed:", summary);
      }
      const { title, body } = formatMatchSaveError(error);
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLive = () => handleSubmit(isScheduled ? "scheduled" : "live");
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
        { text: "Save & Complete", onPress: () => void handleSubmit("completed") },
      ]
    );
  };

  const footerPad = Math.max(insets.bottom, 16) + 72;
  const primaryLabel = isScheduled ? "Save as Scheduled" : "Save as Live";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: createMatch.pageBg }}>
        <CreateMatchHeader topInset={insets.top} onBack={() => router.back()} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
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
            <SectionTitle>Players</SectionTitle>
            <View style={{ marginBottom: 24 }}>
              <CreateMatchPlayersCard
                playerA={playerA}
                playerB={playerB}
                onChangeA={setPlayerA}
                onChangeB={setPlayerB}
              />
            </View>

            <SectionTitle>Match Details</SectionTitle>
            <View style={{ gap: 14, marginBottom: 24 }}>
              <PickerField
                label="Match Date"
                value={formatDate(matchDate)}
                icon="Calendar"
                onPress={() => setShowDatePicker(true)}
              />
              <PickerField
                label="Match Time"
                value={matchTime}
                icon="Clock"
                onPress={() => setShowTimePicker(true)}
              />
              <View>
                <FieldLabel>Location (Optional)</FieldLabel>
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
            </View>

            {!isScheduled ? (
              <>
                <SectionTitle>Score</SectionTitle>
                <View style={{ marginBottom: 24 }}>
                  <CreateMatchScoreEditor sets={sets} onChange={setSets} />
                </View>
              </>
            ) : null}

            <SectionTitle>Notes</SectionTitle>
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

            <SectionTitle>Privacy</SectionTitle>
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

            {!isScheduled && canComplete ? (
              <TouchableOpacity
                onPress={handleComplete}
                disabled={isSubmitting}
                hitSlop={STANDARD_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Save and complete match"
                style={{
                  alignItems: "center",
                  paddingVertical: 14,
                  marginBottom: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: createMatch.cardBorder,
                  backgroundColor: createMatch.cardBg,
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: createMatch.fonts.extraBold,
                    fontSize: 15,
                    color: createMatch.ink,
                  }}
                >
                  Save & Complete
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: createMatch.pageBg,
            borderTopWidth: 1,
            borderTopColor: createMatch.cardBorder,
          }}
        >
          <TouchableOpacity
            onPress={handleLive}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            style={{
              height: 52,
              borderRadius: 14,
              backgroundColor: createMatch.coral,
              alignItems: "center",
              justifyContent: "center",
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  fontFamily: createMatch.fonts.extraBold,
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                {primaryLabel}
              </Text>
            )}
          </TouchableOpacity>
        </View>

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
