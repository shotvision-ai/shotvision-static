import { useState } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Image } from "expo-image";
import { StatusBadge } from "./StatusBadge";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useAuth } from "../../src/context/AuthContext";
import { matchService } from "../../src/services/api/matchService";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) { 
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();

  // Like state
  const [isLiked, setIsLiked] = useState(match.isLiked || false);
  const [likesCount, setLikesCount] = useState(match.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getWinnerText = () => {
    if (match.status === "completed" && match.winner) {
      const winnerName = match.winner === "playerA" ? match.playerA : match.playerB;
      return `${winnerName} won`;
    }
    return null;
  };

  const isEditableWithin48h = () => {
    if (match.status !== "completed") return false;
    const matchDate = new Date(match.matchDate);
    const now = new Date();
    const hoursSince = (now.getTime() - matchDate.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 48;
  };

  const editWindow = isEditableWithin48h();

  // Player 2 (player B) can opt out if the match is live or scheduled
  const isPlayerB = currentUser && match.playerB === currentUser.name;
  const canOptOut = isPlayerB && (match.status === "live" || match.status === "scheduled");

  const handleOptOut = () => {
    Alert.alert(
      "Opt Out of Match",
      `Are you sure you want to opt out of this match against ${match.playerA}? The match organiser will be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Opt Out",
          style: "destructive",
          onPress: () => Alert.alert("Opted Out", "You have been removed from this match."),
        },
      ],
    );
  };

  const accentColor =
    match.status === "live"
      ? "#f59e0b"
      : match.status === "scheduled"
        ? "#2563eb"
        : match.status === "completed"
          ? "#22c55e"
          : "#2563eb";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/match/${match.id}`)}
      className="rounded-2xl mb-4 overflow-hidden"
      style={{
        backgroundColor:
          match.status === "live"
            ? theme.name === "dark"
              ? "rgba(251, 146, 60, 0.1)"
              : "#FFF4E5"
            : theme.colors.card,
        shadowColor: "#2563eb",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(37,99,235,0.12)",
        overflow: "hidden",
      }}
      activeOpacity={0.7}
    >
      {/* Status accent stripe */}
      <View style={{ height: 4, backgroundColor: accentColor }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        {/* Top Row with Status */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            {/* Winner Announcement */}
            {getWinnerText() && (
              <View className="flex-row items-center">
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#2563eb" }}>🏆 </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#2563eb" }}>
                  {getWinnerText()}
                </Text>
              </View>
            )}
          </View>
          <StatusBadge status={match.status} />
        </View>

        {/* Players Row */}
        <View className="flex-row items-center justify-between mb-4">
          {/* Player A */}
          <View className="items-center flex-1">
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                padding: 3,
                borderWidth: match.status === "completed" && match.winner === "playerA" ? 2.5 : 0,
                borderColor:
                  match.status === "completed" && match.winner === "playerA"
                    ? "#FFD700"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  overflow: "hidden",
                }}
                className="bg-muted"
              >
                <Image
                  source={{ uri: match.playerAImage }}
                  style={{ width: 70, height: 70 }}
                  contentFit="cover"
                />
              </View>
            </View>
            <View className="flex-row items-center mt-3">
              {match.status === "completed" && match.winner === "playerA" && (
                <LucideIcon name="Trophy" size={14} color="#FFD700" style={{ marginRight: 4 }} />
              )}
              <Text
                className="text-foreground text-center"
                numberOfLines={2}
                style={{
                  fontSize: 18,
                  fontWeight:
                    match.status === "completed" && match.winner === "playerA" ? "700" : "600",
                }}
              >
                {match.playerA}
              </Text>
            </View>
          </View>

          {/* VS */}
          <View style={{ width: 36, alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#9CA3AF" }}>vs</Text>
          </View>

          {/* Player B */}
          <View className="items-center flex-1">
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                padding: 3,
                borderWidth: match.status === "completed" && match.winner === "playerB" ? 2.5 : 0,
                borderColor:
                  match.status === "completed" && match.winner === "playerB"
                    ? "#FFD700"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  overflow: "hidden",
                }}
                className="bg-muted"
              >
                <Image
                  source={{ uri: match.playerBImage }}
                  style={{ width: 70, height: 70 }}
                  contentFit="cover"
                />
              </View>
            </View>
            <View className="flex-row items-center mt-3">
              {match.status === "completed" && match.winner === "playerB" && (
                <LucideIcon name="Trophy" size={14} color="#FFD700" style={{ marginRight: 4 }} />
              )}
              <Text
                className="text-foreground text-center"
                numberOfLines={2}
                style={{
                  fontSize: 18,
                  fontWeight:
                    match.status === "completed" && match.winner === "playerB" ? "700" : "600",
                }}
              >
                {match.playerB}
              </Text>
            </View>
          </View>
        </View>

        {/* Scheduled Info */}
        {match.status === "scheduled" && (
          <View className="mb-4">
            <Text style={{ fontSize: 13, color: "#6B7280" }}>
              Scheduled for {formatDate(match.matchDate)}
            </Text>
          </View>
        )}

        {/* Score Section */}
        {(match.sets ?? []).length > 0 && match.status !== "scheduled" && (
          <View className="mb-4">
            <Text className="text-caption font-medium text-muted-foreground mb-3">Score</Text>
            <View className="flex-row gap-2">
              {(match.sets ?? []).map((set, index) => (
                <View
                  key={index}
                  className="bg-muted/40 border border-border rounded-xl"
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}
                >
                  <Text className="text-base text-foreground font-semibold">
                    {set.playerAScore}-{set.playerBScore}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 48h Edit/Notes Row for finished matches */}
        {editWindow && (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "rgba(0,0,0,0.06)",
            }}
          >
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/edit-match/${match.id}`);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: "rgba(37,99,235,0.08)",
                borderWidth: 1,
                borderColor: "rgba(37,99,235,0.2)",
              }}
            >
              <LucideIcon name="PenLine" size={14} color="#2563eb" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563eb" }}>Edit Score</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/match/${match.id}`);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: "rgba(245,158,11,0.08)",
                borderWidth: 1,
                borderColor: "rgba(245,158,11,0.2)",
              }}
            >
              <LucideIcon name="StickyNote" size={14} color="#f59e0b" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#f59e0b" }}>Notes</Text>
            </TouchableOpacity>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: "rgba(0,0,0,0.04)",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 10, color: "#9ca3af", fontWeight: "500" }}>48h limit</Text>
            </View>
          </View>
        )}

        {/* Player 2 opt-out */}
        {canOptOut && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              handleOptOut();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: "rgba(220,38,38,0.07)",
              borderWidth: 1,
              borderColor: "rgba(220,38,38,0.18)",
              marginBottom: 12,
            }}
          >
            <LucideIcon name="LogOut" size={14} color="#dc2626" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#dc2626" }}>
              Opt Out of Match
            </Text>
          </TouchableOpacity>
        )}

        {/* Bottom Row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <LucideIcon name="Calendar" size={14} color="#6B7280" />
            <Text style={{ fontSize: 13, color: "#6B7280", marginLeft: 6, marginRight: 12 }}>
              {formatDate(match.matchDate)}
            </Text>
            {match.location && (
              <Text style={{ fontSize: 13, color: "#6B7280", flex: 1 }} numberOfLines={1}>
                {match.location}
              </Text>
            )}
          </View>

          {/* Like Button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              handleLike();
            }}
            disabled={isLiking}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
              backgroundColor: isLiked ? "rgba(37,99,235,0.08)" : "rgba(107,114,128,0.06)",
            }}
          >
            <LucideIcon
              name="Heart"
              size={14}
              color={isLiked ? "#2563eb" : "#6B7280"}
              fill={isLiked ? "#2563eb" : "transparent"}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: isLiked ? "#2563eb" : "#6B7280",
              }}
            >
              {likesCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
