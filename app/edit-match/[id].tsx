import { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
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

export default function EditMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [matchDate, setMatchDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [sets, setSets] = useState<MatchSet[]>([{ playerAScore: 0, playerBScore: 0 }]);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // Fetch match details — cancelled flag avoids setState after unmount / id change.
  useEffect(() => {
    let cancelled = false;

    const fetchMatch = async () => {
      try {
        const data = await matchService.getMatchDetails(id as string);
        if (cancelled) return;
        setMatch(data);
        setPlayerA(data.playerA);
        setPlayerB(data.playerB);
        setMatchDate(new Date(data.matchDate));
        setLocation(data.location || "");
        setIsScheduled(data.status === "scheduled");
        setSets(data.sets.length > 0 ? data.sets : [{ playerAScore: 0, playerBScore: 0 }]);
        setNotes(data.notes || "");
        setIsPublic(data.isPublic);
      } catch (err: unknown) {
        if (cancelled) return;
        devLog.error("[edit-match] fetch failed:", err);
        setError(getUserFriendlyErrorMessage(err, "Failed to load match details"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchMatch();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  // Calculate winner
  const calculateWinner = (): "playerA" | "playerB" | undefined => {
    let playerAWins = 0;
    let playerBWins = 0;

    sets.forEach((set) => {
      if (set.playerAScore > set.playerBScore) playerAWins++;
      else if (set.playerBScore > set.playerAScore) playerBWins++;
    });

    if (playerAWins > playerBWins) return "playerA";
    if (playerBWins > playerAWins) return "playerB";
    return undefined;
  };

  // Validation
  const canComplete =
    playerA.trim() !== "" &&
    playerB.trim() !== "" &&
    sets.length > 0 &&
    sets.every((set) => set.playerAScore > 0 || set.playerBScore > 0) &&
    calculateWinner() !== undefined;

  const handleSubmit = async (status: "live" | "scheduled" | "completed") => {
    if (playerA.trim() === "" || playerB.trim() === "") {
      Alert.alert("Validation Error", "Please enter both player names.");
      return;
    }

    setIsSubmitting(true);
    try {
      const input: UpdateMatchInput = {
        playerA,
        playerB,
        matchDate: matchDate.toISOString(),
        location,
        isPublic,
        sets,
        notes,
      };

      if (status === "completed") {
        // Save scores first, then use contract finish endpoint to determine winner.
        await matchService.updateMatch(id as string, { ...input, status: "live" });
        await matchService.finishMatch(id as string);
      } else {
        input.status = status;
        await matchService.updateMatch(id as string, input);
      }

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

  const handleSave = () => handleSubmit(isScheduled ? "scheduled" : "live");
  const handleComplete = () => handleSubmit("completed");

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-body text-muted-foreground mt-4">Loading match details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !match) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <LucideIcon name="CircleAlert" size={64} color="#ef4444" />
          <Text className="text-h3 font-semibold text-foreground mt-6 mb-2 text-center">
            {error || "Match not found"}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-primary px-8 py-4 rounded-xl mt-4"
          >
            <Text className="text-primary-foreground font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
          paddingBottom: 120 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
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
                    backgroundColor: playerA ? "#2563eb" : "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {playerA ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                      {playerA.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <LucideIcon name="User" size={16} color="#9ca3af" />
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
                    backgroundColor: playerB ? "#7c3aed" : "#e5e7eb",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {playerB ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                      {playerB.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <LucideIcon name="User" size={16} color="#9ca3af" />
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
                <LucideIcon name="Calendar" size={20} color="#666" />
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
              <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
            </View>
          </View>
        </View>

        {/* Section 3: Score (conditional) */}
        {!isScheduled && (
          <View className="mb-10">
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
                        backgroundColor: "#e5e7eb",
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
        )}

        {/* Section 4: Notes */}
        <View className="mb-10">
          <Text className="text-h3 font-semibold text-foreground mb-4">Notes</Text>
          <Textarea
            placeholder="Add match notes"
            value={notes}
            onChangeText={setNotes}
            numberOfLines={4}
            className="min-h-[100px]"
          />
        </View>

        {/* Section 5: Privacy */}
        <View className="mb-10">
          <Text className="text-h3 font-semibold text-foreground mb-4">Privacy</Text>
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-body font-medium text-foreground">Public</Text>
                <TouchableOpacity className="p-1">
                  <LucideIcon name="Info" size={16} color="#999" />
                </TouchableOpacity>
              </View>
              <Text className="text-caption text-muted-foreground mt-0.5">
                Public matches appear in Explore
              </Text>
            </View>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-background border-t border-border px-5 py-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
          paddingBottom: 16 + insets.bottom,
        }}
      >
        {/* Match Preview Summary */}
        {playerA && playerB && (
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
          {isScheduled ? (
            <Button 
              onPress={handleSave} 
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-button text-primary-foreground">Save as Scheduled</Text>
              )}
            </Button>
          ) : (
            <>
              <Button 
                onPress={handleSave} 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-button text-primary-foreground">Save Changes</Text>
                )}
              </Button>
              {match?.status !== "completed" && (
                <Button
                  onPress={handleComplete}
                  size="lg"
                  variant="outline"
                  disabled={!canComplete || isSubmitting}
                  className={!canComplete || isSubmitting ? "opacity-50" : ""}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#2563eb" />
                  ) : (
                    <Text className="text-button text-foreground">Save & Complete</Text>
                  )}
                </Button>
              )}
            </>
          )}
        </View>
      </View>

      {/* Calendar Picker */}
      <CalendarPicker
        visible={showDatePicker}
        selectedDate={matchDate}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        minimumDate={getMinDate()}
        maximumDate={getMaxDate()}
      />
    </SafeAreaView>
  );
}
