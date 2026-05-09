import { useState } from "react";
import { View, TouchableOpacity, Modal, Alert, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Image } from "expo-image";
import { StatusBadge } from "./StatusBadge";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { matchService } from "../../src/services/api/matchService";

interface PublicMatchCardProps {
  match: Match;
}

const REPORT_REASONS = [
  "Incorrect or fabricated match score",
  "Wrong or fake player name",
  "Inappropriate or offensive match notes",
  "Misleading match details",
  "Fake or duplicate match entry",
  "Wrong profile picture",
];

export function PublicMatchCard({ match }: PublicMatchCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const [reported, setReported] = useState(false);

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

  const handleReport = () => {
    if (!selectedReason) return;
    setShowReportModal(false);
    setReported(true);
    setSelectedReason(null);
    setReportNotes("");
    Alert.alert(
      "Report Submitted",
      "Thank you for helping keep Shot Vision safe. We'll review this match.",
    );
  };

  const handleUndoReport = () => setShowUndoModal(true);

  const confirmUndo = () => {
    setReported(false);
    setShowUndoModal(false);
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

  const accentColor =
    match.status === "live" ? "#f59e0b" : match.status === "scheduled" ? "#2563eb" : "#22c55e";

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
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(37,99,235,0.12)",
        overflow: "hidden",
      }}
      activeOpacity={0.7}
    >
      {/* Status accent stripe */}
      <View style={{ height: 4, backgroundColor: accentColor }} />
      <View style={{ padding: 20 }}>
        {/* Top Row with Public Indicator and Status */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 flex-row items-center">
            {/* Public Indicator */}
            <View className="flex-row items-center mr-3">
              <LucideIcon name="Globe" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500" }}>Public</Text>
            </View>
            {/* Winner Announcement */}
            {getWinnerText() && (
              <View className="flex-row items-center">
                <LucideIcon name="Trophy" size={14} color="#22C55E" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#2563eb" }}>
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
                width: 80,
                height: 80,
                borderRadius: 40,
                padding: 3,
                borderWidth: match.status === "completed" && match.winner === "playerA" ? 3 : 0,
                borderColor:
                  match.status === "completed" && match.winner === "playerA"
                    ? "#FFD700"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 37,
                  overflow: "hidden",
                }}
                className="bg-muted"
              >
                <Image
                  source={{ uri: match.playerAImage }}
                  style={{ width: 74, height: 74 }}
                  contentFit="cover"
                />
              </View>
            </View>
            <View className="flex-row items-center mt-3">
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
                width: 80,
                height: 80,
                borderRadius: 40,
                padding: 3,
                borderWidth: match.status === "completed" && match.winner === "playerB" ? 3 : 0,
                borderColor:
                  match.status === "completed" && match.winner === "playerB"
                    ? "#FFD700"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 37,
                  overflow: "hidden",
                }}
                className="bg-muted"
              >
                <Image
                  source={{ uri: match.playerBImage }}
                  style={{ width: 74, height: 74 }}
                  contentFit="cover"
                />
              </View>
            </View>
            <View className="flex-row items-center mt-3">
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
            <Text style={{ fontSize: 14, color: "#6B7280", opacity: 0.7 }}>
              Scheduled for {formatDate(match.matchDate)}
            </Text>
          </View>
        )}

        {/* Score Section */}
        {(match.sets ?? []).length > 0 && match.status !== "scheduled" && (
          <View className="mb-4">
            <Text className="text-caption font-medium text-muted-foreground mb-3">Score</Text>
            <View className="flex-row gap-2.5">
              {(match.sets ?? []).map((set, index) => (
                <View
                  key={index}
                  className="bg-muted/40 border border-border rounded-xl"
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text className="text-foreground font-semibold" style={{ fontSize: 16 }}>
                    {set.playerAScore}-{set.playerBScore}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Divider */}
        <View className="h-px bg-border my-3" />

        {/* Bottom Row with Date/Location and Social Actions */}
        <View className="flex-row items-center justify-between">
          {/* Date and Location */}
          <View className="flex-row items-center flex-1">
            <LucideIcon name="Calendar" size={14} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, color: "#6B7280", marginRight: 12, opacity: 0.7 }}>
              {formatDate(match.matchDate)}
            </Text>
            {match.location && (
              <Text
                style={{ fontSize: 13, color: "#6B7280", flex: 1, opacity: 0.7 }}
                numberOfLines={1}
              >
                {match.location}
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            {/* Like Button */}
            <TouchableOpacity
              onPress={handleLike}
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

            {/* Report / Undo Button */}
            <TouchableOpacity
              onPress={() => (reported ? handleUndoReport() : setShowReportModal(true))}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
                backgroundColor: reported ? "rgba(34,197,94,0.08)" : "rgba(220,38,38,0.06)",
              }}
            >
              <LucideIcon
                name={reported ? "CircleCheck" : "Flag"}
                size={14}
                color={reported ? "#22c55e" : "#dc2626"}
              />
              <Text
                style={{ fontSize: 12, fontWeight: "600", color: reported ? "#22c55e" : "#dc2626" }}
              >
                {reported ? "Reported" : "Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowReportModal(false)}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: theme.colors.card || "#fff",
              borderRadius: 24,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border || "#e5e7eb",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(220,38,38,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LucideIcon name="Flag" size={18} color="#dc2626" />
                </View>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: theme.colors.foreground || "#1f2937",
                  }}
                >
                  Report Match
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={{ padding: 4 }}>
                <LucideIcon name="X" size={22} color={theme.colors.foreground || "#6b7280"} />
              </TouchableOpacity>
            </View>

            {/* Reason list */}
            <View style={{ padding: 16, gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colors.mutedForeground || "#6b7280",
                  marginBottom: 4,
                }}
              >
                WHY ARE YOU REPORTING THIS?
              </Text>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor:
                      selectedReason === reason ? "#dc2626" : theme.colors.border || "#e5e7eb",
                    backgroundColor:
                      selectedReason === reason
                        ? "rgba(220,38,38,0.06)"
                        : theme.colors.background || "#f9fafb",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      color:
                        selectedReason === reason
                          ? "#dc2626"
                          : theme.colors.foreground || "#1f2937",
                    }}
                  >
                    {reason}
                  </Text>
                  {selectedReason === reason && (
                    <LucideIcon name="CircleCheck" size={20} color="#dc2626" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colors.mutedForeground || "#6b7280",
                  marginBottom: 8,
                }}
              >
                TELL US MORE (OPTIONAL)
              </Text>
              <TextInput
                value={reportNotes}
                onChangeText={setReportNotes}
                placeholder="Share additional details about the issue..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1.5,
                  borderColor: theme.colors.border || "#e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  color: theme.colors.foreground || "#1f2937",
                  backgroundColor: theme.colors.background || "#f9fafb",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Submit */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4, gap: 10 }}>
              <TouchableOpacity
                onPress={handleReport}
                disabled={!selectedReason}
                style={{
                  backgroundColor: selectedReason ? "#dc2626" : "#e5e7eb",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: selectedReason ? "#ffffff" : "#9ca3af",
                  }}
                >
                  Submit Report
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={{ paddingVertical: 10, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, color: theme.colors.mutedForeground || "#6b7280" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Undo Report Modal */}
      <Modal
        visible={showUndoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUndoModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            paddingHorizontal: 32,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUndoModal(false)}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              width: "100%",
              backgroundColor: theme.colors.card || "#fff",
              borderRadius: 20,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(220,38,38,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <LucideIcon name="Flag" size={24} color="#dc2626" />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: theme.colors.foreground || "#1f2937",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                Withdraw Report?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.mutedForeground || "#6b7280",
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Your report for this match will be cancelled.
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={confirmUndo}
                style={{
                  backgroundColor: "#dc2626",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                  Yes, Withdraw Report
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowUndoModal(false)}
                style={{ borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, color: theme.colors.mutedForeground || "#6b7280" }}>
                  Keep Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}
