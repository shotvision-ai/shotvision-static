import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { useTheme } from "~/theming/ThemeProvider";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import LucideIcon from "~/lib/icons/LucideIcon";
import { MatchSet } from "~/types/match";
import { CalendarPicker } from "~/components/ui/CalendarPicker";
import { TimePicker } from "~/components/ui/TimePicker";
import { matchService, CreateMatchInput } from "../src/services/api/matchService";
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
  recordMatchOwnership,
} from "../src/utils/matchOwnership";
import { seedMatchVisibilityFromMatch } from "../src/utils/matchVisibility";
import { scheduledSaveBlockedMessage } from "../src/utils/matchScheduledLifecycle";
import {
  DEFAULT_LIVE_MATCH_SETS,
  setsForMatchWrite,
} from "../src/utils/matchSetsPayload";
import { combineMatchDateAndTime } from "../src/utils/matchDateTime";

const BLUE = "#2563eb";
const PURPLE = "#7c3aed";

export default function CreateMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme.name === "dark";
  const cardBg = theme.colors.card ?? theme.colors.background;
  const mutedBg = theme.colors.muted ?? (isDark ? "hsl(240 3.7% 15.9%)" : "#f9fafb");
  const borderColor = theme.colors.border ?? (isDark ? "hsl(240 3.7% 20%)" : "rgba(0,0,0,0.07)");
  const iconMuted = theme.colors.mutedForeground ?? "#9ca3af";
  const scoreTextColor = theme.colors.foreground ?? (isDark ? "#f9fafb" : "#1f2937");
  const playersCardBg = isDark ? "rgba(37, 99, 235, 0.12)" : "rgba(37, 99, 235, 0.04)";
  const playersCardBorder = isDark ? "rgba(37, 99, 235, 0.28)" : "rgba(37, 99, 235, 0.15)";
  const dividerLine = isDark ? "rgba(37, 99, 235, 0.28)" : "rgba(37, 99, 235, 0.15)";
  const { user } = useAuth();
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [matchDate, setMatchDate] = useState(new Date());
  const [matchTime, setMatchTime] = useState("14:00");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [sets, setSets] = useState<MatchSet[]>(DEFAULT_LIVE_MATCH_SETS);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMaxDate = () => (isScheduled ? undefined : new Date());
  const getMinDate = () => (isScheduled ? new Date() : undefined);

  const addSet = () => {
    if (sets.length < 5) setSets([...sets, { playerAScore: 0, playerBScore: 0 }]);
  };

  const updateSet = (index: number, field: "playerAScore" | "playerBScore", value: string) => {
    const newSets = [...sets];
    newSets[index][field] = parseInt(value) || 0;
    setSets(newSets);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) setSets(sets.filter((_, i) => i !== index));
  };

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
        // Use the authoritative post-finish details returned by completeMatch so that
        // isPublic and creatorId reflect what the backend actually stored.
        created = await matchService.completeMatch(initial.id, liveInput);
      } else {
        created = await matchService.createMatch(input);
      }

      const ownerId = user?.id?.trim() || created.creatorId?.trim();
      if (ownerId && created.id) {
        recordMatchOwnership(created.id, ownerId);
      }

      // isPublic: prefer the API response; fall back to the user's intent (isPublic state).
      seedMatchVisibilityFromMatch({
        ...created,
        isPublic: Boolean(created.isPublic || isPublic),
      });
      invalidateMyMatchesExploreCache();
      useMatchVisibilityStore.getState().markAllListsStale();
      router.replace("/(tabs)/dashboard");
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Same shell as Edit Match: JS header reserves top inset; KAV gets remaining height */}
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
                Create Match
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 24) + 16,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
        {/* Section 1: Players */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Players</Text>
          {/* Players visual card */}
          <View
            style={{
              backgroundColor: playersCardBg,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: playersCardBorder,
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
                    backgroundColor: playerA ? BLUE : mutedBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {playerA ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                      {playerA.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <LucideIcon name="User" size={16} color={iconMuted} />
                  )}
                </View>
                <Text className="text-body font-semibold text-foreground">Player A</Text>
              </View>
              <Input
                placeholder="Enter player name"
                value={playerA}
                onChangeText={setPlayerA}
                className="rounded-xl"
                style={{
                  borderColor: playerA ? BLUE : undefined,
                  borderWidth: 1.5,
                }}
              />
            </View>

            {/* VS divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View style={{ flex: 1, height: 1, backgroundColor: dividerLine }} />
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: BLUE,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffffff" }}>VS</Text>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: dividerLine }} />
            </View>

            {/* Player B */}
            <View className="mt-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: playerB ? PURPLE : mutedBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {playerB ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                      {playerB.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <LucideIcon name="User" size={16} color={iconMuted} />
                  )}
                </View>
                <Text className="text-body font-semibold text-foreground">Player B</Text>
              </View>
              <Input
                placeholder="Enter player name"
                value={playerB}
                onChangeText={setPlayerB}
                className="rounded-xl"
                style={{
                  borderColor: playerB ? "#7c3aed" : undefined,
                  borderWidth: 1.5,
                }}
              />
            </View>
          </View>
        </View>

        {/* Section 2: Match Details */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Match Details</Text>
          <View className="gap-4">
            <View>
              <Label nativeID="matchDate" className="mb-2">
                Match Date
              </Label>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center justify-between bg-background border border-input rounded-xl px-4 py-3"
              >
                <Text className="text-body text-foreground">{formatDate(matchDate)}</Text>
                <LucideIcon name="Calendar" size={20} color={iconMuted} />
              </TouchableOpacity>
            </View>
            <View>
              <Label nativeID="matchTime" className="mb-2">
                Match Time
              </Label>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="flex-row items-center justify-between bg-background border border-input rounded-xl px-4 py-3"
              >
                <Text className="text-body text-foreground">{matchTime}</Text>
                <LucideIcon name="Clock" size={20} color={iconMuted} />
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
            <View className="flex-row items-center justify-between py-2">
              <View>
                <Text className="text-body font-medium text-foreground">Scheduled</Text>
                <Text className="text-caption text-muted-foreground mt-0.5">
                  Mark as scheduled for later
                </Text>
              </View>
              <Switch checked={isScheduled} onCheckedChange={handleScheduledToggle} />
            </View>
          </View>
        </View>

        {/* Section 3: Score */}
        {!isScheduled && (
          <View className="mb-8">
            <Text className="text-h3 font-semibold text-foreground mb-4">Score</Text>
            {/* Player name headers */}
            {playerA && playerB && (
              <View className="flex-row items-center justify-center gap-3 mb-3">
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isDark
                        ? "rgba(37, 99, 235, 0.2)"
                        : "rgba(37, 99, 235, 0.1)",
                      maxWidth: 120,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: "600", color: BLUE, textAlign: "center" }}
                    >
                      {playerA}
                    </Text>
                  </View>
                </View>
                <View style={{ width: 28 }} />
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: isDark ? "rgba(124, 58, 237, 0.2)" : "rgba(124, 58, 237, 0.1)",
                      maxWidth: 120,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: PURPLE,
                        textAlign: "center",
                      }}
                    >
                      {playerB}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            <View className="gap-2">
              {sets.map((set, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center">
                    {/* Set label */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: "rgba(37, 99, 235, 0.08)",
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: BLUE }}>
                        S{index + 1}
                      </Text>
                    </View>

                    {/* Score inputs */}
                    <View className="flex-row items-center flex-1 justify-center gap-3">
                      {/* Player A score */}
                      <View
                        style={{
                          width: 54,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor:
                            set.playerAScore > set.playerBScore
                              ? isDark
                                ? "rgba(37, 99, 235, 0.2)"
                                : "rgba(37, 99, 235, 0.08)"
                              : mutedBg,
                          borderWidth: 1.5,
                          borderColor:
                            set.playerAScore > set.playerBScore ? BLUE : borderColor,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Input
                          placeholder="0"
                          placeholderTextColor={iconMuted}
                          value={set.playerAScore === 0 ? "" : set.playerAScore.toString()}
                          onChangeText={(value) => updateSet(index, "playerAScore", value)}
                          keyboardType="numeric"
                          className="border-0 bg-transparent p-0 text-center"
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            textAlign: "center",
                            width: 50,
                            color: scoreTextColor,
                          }}
                        />
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: "600", color: iconMuted }}>–</Text>

                      {/* Player B score */}
                      <View
                        style={{
                          width: 54,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor:
                            set.playerBScore > set.playerAScore
                              ? isDark
                                ? "rgba(124, 58, 237, 0.2)"
                                : "rgba(124, 58, 237, 0.08)"
                              : mutedBg,
                          borderWidth: 1.5,
                          borderColor:
                            set.playerBScore > set.playerAScore ? PURPLE : borderColor,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Input
                          placeholder="0"
                          placeholderTextColor={iconMuted}
                          value={set.playerBScore === 0 ? "" : set.playerBScore.toString()}
                          onChangeText={(value) => updateSet(index, "playerBScore", value)}
                          keyboardType="numeric"
                          className="border-0 bg-transparent p-0 text-center"
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            textAlign: "center",
                            width: 50,
                            color: scoreTextColor,
                          }}
                        />
                      </View>
                    </View>

                    {/* Remove button */}
                    {sets.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeSet(index)}
                        style={{
                          marginLeft: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: "rgba(220, 38, 38, 0.08)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <LucideIcon name="X" size={14} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {sets.length < 5 && (
                <TouchableOpacity
                  onPress={addSet}
                  className="border border-dashed border-border/60 rounded-xl p-3 flex-row items-center justify-center mt-1"
                >
                  <LucideIcon name="Plus" size={18} color={BLUE} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: BLUE, marginLeft: 6 }}>
                    Add Set
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Section 4: Notes */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Notes</Text>
          <Textarea
            placeholder="Add match notes"
            value={notes}
            onChangeText={setNotes}
            numberOfLines={4}
            className="min-h-[100px]"
          />
        </View>

        {/* Section 5: Privacy — scrolls with form */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Privacy</Text>
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-body font-medium text-foreground">Public</Text>
                <TouchableOpacity
                  onPress={() => setShowInfoTooltip(!showInfoTooltip)}
                  className="p-1"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Public match info"
                >
                  <LucideIcon name="Info" size={16} color={iconMuted} />
                </TouchableOpacity>
              </View>
              <Text className="text-caption text-muted-foreground mt-0.5">
                Public matches appear in Explore
              </Text>
              {showInfoTooltip ? (
                <Text className="text-caption text-muted-foreground mt-2 leading-5">
                  Other players can find and like your match in Explore. Private matches stay on My
                  Matches only.
                </Text>
              ) : null}
            </View>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </View>
        </View>

        {/* Actions — scroll with form; safe-area padding on ScrollView content */}
        <View className="mt-2 pt-6 border-t border-border">
          {playerA && playerB ? (
            <View className="mb-4 pb-4 border-b border-border/40">
              <Text className="text-caption text-muted-foreground/70 mb-0.5">Match Preview</Text>
              <Text className="text-body font-semibold text-foreground">
                {playerA} vs {playerB}
              </Text>
            </View>
          ) : null}
          <View className="gap-3">
            {isScheduled ? (
              <Button
                onPress={handleLive}
                size="lg"
                style={{ backgroundColor: BLUE }}
                disabled={isSubmitting}
                accessibilityLabel="Save as scheduled match"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-button text-white">Save as Scheduled</Text>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onPress={handleLive}
                  size="lg"
                  style={{ backgroundColor: BLUE }}
                  disabled={isSubmitting}
                  accessibilityLabel="Save as live match"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-button text-white">Save as Live</Text>
                  )}
                </Button>
                <Button
                  onPress={handleComplete}
                  size="lg"
                  variant="outline"
                  disabled={!canComplete || isSubmitting}
                  className={!canComplete || isSubmitting ? "opacity-50" : ""}
                  accessibilityLabel="Save and complete match"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={BLUE} />
                  ) : (
                    <Text className="text-button text-foreground">Save & Complete</Text>
                  )}
                </Button>
              </>
            )}
          </View>
        </View>
          </ScrollView>
        </KeyboardAvoidingView>

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
