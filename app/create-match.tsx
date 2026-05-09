import { useState } from "react";
import { View, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
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

const BLUE = "#2563eb";

export default function CreateMatch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;

  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [matchDate, setMatchDate] = useState(new Date());
  const [matchTime, setMatchTime] = useState("14:00");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [sets, setSets] = useState<MatchSet[]>([{ playerAScore: 0, playerBScore: 0 }]);
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

  const calculateWinner = (): "playerA" | "playerB" | undefined => {
    let a = 0,
      b = 0;
    sets.forEach((set) => {
      if (set.playerAScore > set.playerBScore) a++;
      else if (set.playerBScore > set.playerAScore) b++;
    });
    if (a > b) return "playerA";
    if (b > a) return "playerB";
    return undefined;
  };

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
      const input: CreateMatchInput = {
        playerA,
        playerB,
        matchDate: matchDate.toISOString(),
        location,
        isPublic,
        status,
        sets,
        notes,
      };

      if (status === "scheduled") {
        input.scheduledDate = matchDate.toISOString();
      }

      await matchService.createMatch(input);
      router.replace("/(tabs)/dashboard");
    } catch (error: unknown) {
      if (__DEV__) {
        const summary =
          error instanceof AppError ? `${error.code} (${error.statusCode})` : String(error);
        console.warn("[create-match] save failed:", summary);
      }
      const { title, body } = formatMatchSaveError(error);
      Alert.alert(title, body);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLive = () => handleSubmit(isScheduled ? "scheduled" : "live");
  const handleComplete = () => handleSubmit("completed");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
          paddingBottom: 140 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Players */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Players</Text>
          {/* Players visual card */}
          <View
            style={{
              backgroundColor: "rgba(37, 99, 235, 0.04)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(37, 99, 235, 0.15)",
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
                    backgroundColor: playerA ? BLUE : "#e5e7eb",
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
                style={{
                  borderColor: playerA ? BLUE : undefined,
                  borderWidth: 1.5,
                }}
              />
            </View>

            {/* VS divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(37, 99, 235, 0.15)" }} />
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
              <View style={{ flex: 1, height: 1, backgroundColor: "rgba(37, 99, 235, 0.15)" }} />
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
                <LucideIcon name="Calendar" size={20} color="#666" />
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
                <LucideIcon name="Clock" size={20} color="#666" />
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
                      backgroundColor: "rgba(37, 99, 235, 0.1)",
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
                      backgroundColor: "rgba(124, 58, 237, 0.1)",
                      maxWidth: 120,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#7c3aed",
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
                    backgroundColor: "#ffffff",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: "rgba(0,0,0,0.07)",
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
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
                              ? "rgba(37, 99, 235, 0.08)"
                              : "#f9fafb",
                          borderWidth: 1.5,
                          borderColor: set.playerAScore > set.playerBScore ? BLUE : "#e5e7eb",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Input
                          placeholder="0"
                          value={set.playerAScore === 0 ? "" : set.playerAScore.toString()}
                          onChangeText={(value) => updateSet(index, "playerAScore", value)}
                          keyboardType="numeric"
                          className="border-0 bg-transparent p-0 text-center"
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            textAlign: "center",
                            width: 50,
                          }}
                        />
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#9ca3af" }}>–</Text>

                      {/* Player B score */}
                      <View
                        style={{
                          width: 54,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor:
                            set.playerBScore > set.playerAScore
                              ? "rgba(124, 58, 237, 0.08)"
                              : "#f9fafb",
                          borderWidth: 1.5,
                          borderColor: set.playerBScore > set.playerAScore ? "#7c3aed" : "#e5e7eb",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Input
                          placeholder="0"
                          value={set.playerBScore === 0 ? "" : set.playerBScore.toString()}
                          onChangeText={(value) => updateSet(index, "playerBScore", value)}
                          keyboardType="numeric"
                          className="border-0 bg-transparent p-0 text-center"
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            textAlign: "center",
                            width: 50,
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

        {/* Section 5: Privacy */}
        <View className="mb-8">
          <Text className="text-h3 font-semibold text-foreground mb-4">Privacy</Text>
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-body font-medium text-foreground">Public</Text>
                <TouchableOpacity
                  onPress={() => setShowInfoTooltip(!showInfoTooltip)}
                  className="p-1"
                >
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
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
          paddingBottom: 16 + insets.bottom,
        }}
      >
        {playerA && playerB && (
          <View className="mb-3 pb-3 border-b border-border/40">
            <Text className="text-caption text-muted-foreground/70 mb-0.5">Match Preview</Text>
            <Text className="text-body font-semibold text-foreground">
              {playerA} vs {playerB}
            </Text>
          </View>
        )}
        <View className="gap-3">
          {isScheduled ? (
            <Button 
              onPress={handleLive} 
              size="lg" 
              style={{ backgroundColor: BLUE }}
              disabled={isSubmitting}
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
    </SafeAreaView>
  );
}
