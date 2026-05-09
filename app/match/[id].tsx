import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, Alert, Platform, StatusBar as RNStatusBar, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Text } from "~/components/ui/text";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { StatusBadge } from "~/components/match/StatusBadge";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { matchService } from "../../src/services/api/matchService";
import { useAuth } from "../../src/context/AuthContext";

export default function MatchDetail() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;

  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  const fetchMatchDetails = useCallback(async (refresh: boolean = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await matchService.getMatchDetails(id as string);
      setMatch(data);
      setIsLiked(data.isLiked || false);
      setLikesCount(data.likesCount || 0);
    } catch (err: any) {
      console.error("Failed to fetch match details:", err);
      setError(err.message || "Failed to load match details");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatchDetails();
  }, [fetchMatchDetails]);

  const onRefresh = () => {
    fetchMatchDetails(true);
  };

  const handleLike = async () => {
    if (!match || isLiking) return;

    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    // Optimistic update
    setIsLiked(!previousIsLiked);
    setLikesCount(previousIsLiked ? previousLikesCount - 1 : previousLikesCount + 1);
    setIsLiking(true);

    try {
      if (previousIsLiked) {
        await matchService.unlikeMatch(match.id);
      } else {
        await matchService.likeMatch(match.id);
      }
    } catch (error) {
      console.error("Failed to like/unlike match:", error);
      // Rollback on failure
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      Alert.alert("Error", "Failed to update like. Please try again.");
    } finally {
      setIsLiking(false);
    }
  };

  // Check if current user is the creator
  const isCreator = () => {
    if (!match || !currentUser) return false;
    return match.creatorId === currentUser.id;
  };

  // Check if match is editable
  const isEditable = () => {
    if (!match || !isCreator()) return false;

    // Live and scheduled matches are always editable
    if (match.status === "live" || match.status === "scheduled") {
      return true;
    }

    // Finished matches: editable only within 48 hours
    if (match.status === "completed") {
      const matchDate = new Date(match.matchDate);
      const now = new Date();
      const hoursSinceMatch = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
      return hoursSinceMatch <= 48;
    }

    return false;
  };

  const handleEdit = () => {
    router.push(`/edit-match/${id}`);
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
              console.error("Failed to delete match:", err);
              Alert.alert("Error", err.message || "Failed to delete match. Please try again.");
            }
          },
        },
      ],
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="text-body text-muted-foreground mt-4">Loading match details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !match) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <LucideIcon name="CircleAlert" size={64} color={theme.colors.destructive} />
          <Text className="text-h3 font-semibold text-foreground mt-6 mb-2 text-center">
            {error || "Match not found"}
          </Text>
          <Text className="text-body text-muted-foreground text-center mb-8">
            {error ? "We couldn't load the match details. Please try again." : "This match may have been removed or is no longer available."}
          </Text>
          <TouchableOpacity
            onPress={() => fetchMatchDetails()}
            className="bg-primary px-8 py-4 rounded-xl"
          >
            <Text className="text-primary-foreground font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{
          headerRight: () =>
            isEditable() ? (
              <TouchableOpacity
                onPress={handleEdit}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: "rgba(37,99,235,0.1)",
                  borderWidth: 1.5,
                  borderColor: "rgba(37,99,235,0.25)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <LucideIcon name="SquarePen" size={20} color="#2563eb" />
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
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
            <ProfileAvatar imageUrl={match.creatorImage} size={48} />
            <View className="ml-3 flex-1">
              <Text className="text-body font-medium text-muted-foreground">Organized by</Text>
              <Text className="text-h4 font-semibold text-foreground">{match.creatorName}</Text>
            </View>
            <View className="items-end gap-2">
              <StatusBadge status={match.status} />
              <TouchableOpacity
                onPress={handleLike}
                disabled={isLiking}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor: isLiked ? "rgba(37,99,235,0.1)" : "rgba(107,114,128,0.06)",
                  borderWidth: 1,
                  borderColor: isLiked ? "rgba(37,99,235,0.2)" : "transparent",
                }}
              >
                <LucideIcon
                  name="Heart"
                  size={16}
                  color={isLiked ? "#2563eb" : "#6B7280"}
                  fill={isLiked ? "#2563eb" : "transparent"}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isLiked ? "#2563eb" : "#6B7280",
                  }}
                >
                  {likesCount}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Players */}
          <View className="py-6 border-t border-b border-border">
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

          {/* Live Indicator */}
          {match.status === "live" && (
            <View className="mt-4 bg-warning/10 rounded-lg p-4">
              <Text className="text-h5 font-semibold text-warning text-center">
                Match in Progress
              </Text>
            </View>
          )}

          {/* Scheduled */}
          {match.status === "scheduled" && match.scheduledDate && (
            <View className="mt-4 bg-tertiary/10 rounded-lg p-4">
              <Text className="text-h5 font-semibold text-tertiary text-center">
                Scheduled for {formatDate(match.scheduledDate)}
              </Text>
            </View>
          )}
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

            <View className="flex-row items-center">
              <LucideIcon
                name={match.isPublic ? "Globe" : "Lock"}
                size={20}
                className="text-muted-foreground mr-3"
              />
              <View className="flex-1">
                <Text className="text-caption text-muted-foreground mb-0.5">Visibility</Text>
                <Text className="text-body font-medium text-foreground">
                  {match.isPublic ? "Public" : "Private"}
                </Text>
              </View>
            </View>
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

        {/* Notes */}
        {match.notes && (
          <View className="mb-6">
            <Text className="text-h3 font-semibold text-foreground mb-4">Notes</Text>
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
          </View>
        )}

        {/* Delete Button - Only for creator */}
        {isCreator() && (
          <View className="mb-6">
            <TouchableOpacity
              onPress={handleDelete}
              className="bg-card rounded-2xl p-4 border border-red-600/30"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center justify-center gap-3">
                <LucideIcon name="Trash2" size={20} color="#dc2626" />
                <Text className="text-body font-semibold text-red-600">Delete Match</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
