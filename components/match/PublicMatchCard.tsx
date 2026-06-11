import React, { memo, useState } from "react";
import { View, Pressable, TouchableOpacity, Modal, Alert, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { StatusBadge } from "./StatusBadge";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useAppTheming } from "~/src/hooks/useAppTheming";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { useMatchReport } from "../../src/hooks/useMatchReport";
import { useMatchListViewer } from "../../src/context/MatchListViewerContext";
import {
  isMatchParticipantSelf,
  resolveMatchParticipantImageUrl,
} from "../../src/utils/matchParticipantAvatar";
import { isMatchOwner } from "../../src/utils/matchEditEligibility";
import { MatchVisibilityControl } from "./MatchVisibilityControl";
import { OwnerMatchCardActions } from "./OwnerMatchCardActions";
import { MatchLikeButton } from "./MatchLikeButton";
import { STANDARD_HIT_SLOP } from "../../src/utils/touchA11y";
import { MATCH_LIST_CARD as L } from "./matchListCardLayout";
import { MatchListCardScore } from "./MatchListCardScore";

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

function PublicMatchCardComponent({ match }: PublicMatchCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser, avatar: currentUserAvatar } = useMatchListViewer();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState("");
  const { isLiked, likesCount, isLiking, canToggle, handleLike } = useMatchLike(match);
  const { isReported, isSubmitting: isReportSubmitting, submitReport, undoReport } =
    useMatchReport(match);

  const handleReport = async () => {
    if (!selectedReason || isReportSubmitting) return;
    const notes = reportNotes.trim();
    const ok = await submitReport(selectedReason, notes || undefined);
    if (!ok) return;
    setShowReportModal(false);
    setSelectedReason(null);
    setReportNotes("");
    Alert.alert(
      "Report Submitted",
      "Thank you for helping keep Shot Vision safe. We'll review this match.",
    );
  };

  const handleUndoReport = () => setShowUndoModal(true);

  const confirmUndo = async () => {
    const ok = await undoReport();
    if (ok) {
      setShowUndoModal(false);
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

  const isOwner = isMatchOwner(match, currentUser?.id);

  const { colors: appColors } = useAppTheming();

  const accentColor =
    match.status === "live"
      ? theme.colors.warning ?? appColors.warning
      : match.status === "scheduled"
        ? theme.colors.tertiary ?? appColors.tertiary
        : match.status === "cancelled"
          ? "#dc2626"
        : appColors.badge.finished.text;

  const openMatchDetails = () => router.push(`/match/${match.id}`);

  const cardContainerStyle = {
    backgroundColor:
      match.status === "live" ? appColors.liveCardTint : theme.colors.card,
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 } as const,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.12)",
    overflow: "hidden" as const,
  };

  return (
    <>
    <View
      className="rounded-xl overflow-hidden"
      style={{ ...cardContainerStyle, marginBottom: L.cardMarginBottom }}
    >
      <View style={{ height: L.accentHeight, backgroundColor: accentColor }} />
      <View
        style={{
          paddingHorizontal: L.padH,
          paddingTop: L.padTop,
          paddingBottom: L.padBottom,
        }}
      >
        <View
          className="flex-row items-start justify-between"
          style={{ marginBottom: L.rowGap }}
        >
          <View className="flex-1 flex-row items-center flex-wrap gap-2">
            {isOwner ? (
              <MatchVisibilityControl match={match} variant="chip" />
            ) : (
              <View className="flex-row items-center mr-1">
                <LucideIcon name="Globe" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500" }}>Public</Text>
              </View>
            )}
            <Pressable
              onPress={openMatchDetails}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={getWinnerText() ? `Open match details, ${getWinnerText()}` : "Open match details"}
            >
              {getWinnerText() ? (
                <View className="flex-row items-center">
                  <LucideIcon name="Trophy" size={14} color="#22C55E" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: L.winner, fontWeight: "600", color: "#2563eb" }}>
                    {getWinnerText()}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <StatusBadge status={match.status} compact />
        </View>

        <Pressable
          onPress={openMatchDetails}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Open match details"
        >
        <View
          className="flex-row items-center justify-between"
          style={{ marginBottom: L.sectionGap }}
        >
          <View className="items-center flex-1">
            <View
              style={{
                width: L.avatarRing,
                height: L.avatarRing,
                borderRadius: L.avatarRing / 2,
                padding: 2,
                borderWidth:
                  match.status === "completed" && match.winner === "playerA" ? L.winnerRing : 0,
                borderColor:
                  match.status === "completed" && match.winner === "playerA"
                    ? "#FFD700"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: L.avatar,
                  height: L.avatar,
                  borderRadius: L.avatar / 2,
                  overflow: "hidden",
                }}
                className="bg-muted"
              >
                <ProfileAvatar
                  imageUrl={resolveMatchParticipantImageUrl(match.playerAImage, {
                    isSelf: isPlayerASelf,
                    selfImage: currentUser?.image,
                  })}
                  preferredAvatarId={
                    isPlayerASelf ? currentUserAvatar.preferredAvatarId : undefined
                  }
                  imageDisplayKey={
                    isPlayerASelf ? currentUserAvatar.imageDisplayKey : undefined
                  }
                  profileImageCacheRevision={
                    isPlayerASelf ? currentUserAvatar.profileImageCacheRevision : undefined
                  }
                  fallbackUserId={
                    isPlayerASelf
                      ? currentUserAvatar.fallbackUserId
                      : match.playerAUserId ?? `${match.id}:playerA`
                  }
                  fallbackGender={isPlayerASelf ? undefined : match.playerAGender}
                  size={L.avatarInner}
                  variant="plain"
                />
              </View>
            </View>
            <Text
              className="text-foreground text-center mt-1.5"
              numberOfLines={1}
              style={{
                fontSize: L.playerName,
                fontWeight:
                  match.status === "completed" && match.winner === "playerA" ? "700" : "600",
              }}
            >
              {match.playerA}
            </Text>
          </View>

          <View style={{ width: 28, alignItems: "center" }}>
            <Text style={{ fontSize: L.vs, fontWeight: "500", color: "#9CA3AF" }}>vs</Text>
          </View>

          <View className="items-center flex-1">
            <View
              style={{
                width: L.avatarRing,
                height: L.avatarRing,
                borderRadius: L.avatarRing / 2,
                padding: 2,
                borderWidth:
                  match.status === "completed" && match.winner === "playerB" ? L.winnerRing : 0,
                borderColor:
                  match.status === "completed" && match.winner === "playerB"
                    ? "#FFD700"
                    : "transparent",
              }}
            >
              <View
                style={{
                  width: L.avatar,
                  height: L.avatar,
                  borderRadius: L.avatar / 2,
                  overflow: "hidden",
                }}
                className="bg-muted"
              >
                <ProfileAvatar
                  imageUrl={resolveMatchParticipantImageUrl(match.playerBImage, {
                    isSelf: isPlayerBSelf,
                    selfImage: currentUser?.image,
                  })}
                  preferredAvatarId={
                    isPlayerBSelf ? currentUserAvatar.preferredAvatarId : undefined
                  }
                  imageDisplayKey={
                    isPlayerBSelf ? currentUserAvatar.imageDisplayKey : undefined
                  }
                  profileImageCacheRevision={
                    isPlayerBSelf ? currentUserAvatar.profileImageCacheRevision : undefined
                  }
                  fallbackUserId={
                    isPlayerBSelf
                      ? currentUserAvatar.fallbackUserId
                      : match.playerBUserId ?? `${match.id}:playerB`
                  }
                  fallbackGender={isPlayerBSelf ? undefined : match.playerBGender}
                  size={L.avatarInner}
                  variant="plain"
                />
              </View>
            </View>
            <Text
              className="text-foreground text-center mt-1.5"
              numberOfLines={1}
              style={{
                fontSize: L.playerName,
                fontWeight:
                  match.status === "completed" && match.winner === "playerB" ? "700" : "600",
              }}
            >
              {match.playerB}
            </Text>
          </View>
        </View>

        <MatchListCardScore match={match} />
        </Pressable>

        <OwnerMatchCardActions match={match} currentUserId={currentUser?.id} compact />

        <View className="h-px bg-border my-2" />

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={openMatchDetails}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Open match details"
          >
            <View className="flex-row items-center flex-1">
              <LucideIcon name="Calendar" size={12} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: L.meta, color: "#6B7280", marginRight: 8, opacity: 0.7 }}>
                {formatDate(match.matchDate)}
              </Text>
              {match.location ? (
                <Text
                  style={{ fontSize: L.meta, color: "#6B7280", flex: 1, opacity: 0.7 }}
                  numberOfLines={1}
                >
                  {match.location}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <View className="flex-row items-center gap-2">
            <MatchLikeButton
              isLiked={isLiked}
              likesCount={likesCount}
              isLiking={isLiking}
              canToggle={canToggle}
              onLike={() => void handleLike()}
              readOnlyWhenDisabled={isOwner}
            />

            <TouchableOpacity
              onPress={() => {
                if (isOwner) {
                  Alert.alert("Unavailable", "You can’t report your own match.");
                  return;
                }
                if (isReported) handleUndoReport();
                else setShowReportModal(true);
              }}
              disabled={isReportSubmitting}
              hitSlop={STANDARD_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={
                isOwner
                  ? "Report unavailable for your own match"
                  : isReported
                    ? "Undo match report"
                    : "Report match"
              }
              accessibilityState={{ disabled: isReportSubmitting }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isOwner
                  ? "rgba(107,114,128,0.08)"
                  : isReported
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(220,38,38,0.06)",
                opacity: isReportSubmitting ? 0.6 : 1,
              }}
            >
              {isReportSubmitting ? (
                <ActivityIndicator size="small" color={isReported ? "#22c55e" : "#dc2626"} />
              ) : (
                <LucideIcon
                  name={isReported ? "CircleCheck" : "Flag"}
                  size={14}
                  color={isOwner ? "#6b7280" : isReported ? "#22c55e" : "#dc2626"}
                />
              )}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isOwner ? "#6b7280" : isReported ? "#22c55e" : "#dc2626",
                }}
              >
                {isOwner ? "Own" : isReported ? "Reported" : "Report"}
              </Text>
            </TouchableOpacity>
          </View>
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
              backgroundColor: theme.colors.card,
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
                borderBottomColor: theme.colors.border,
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
                        : theme.colors.muted,
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
                  backgroundColor: theme.colors.muted,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Submit */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4, gap: 10 }}>
              <TouchableOpacity
                onPress={() => void handleReport()}
                disabled={!selectedReason || isReportSubmitting}
                style={{
                  backgroundColor: selectedReason && !isReportSubmitting ? "#dc2626" : "#e5e7eb",
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {isReportSubmitting ? (
                  <ActivityIndicator color={theme.colors.destructiveForeground} />
                ) : (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: selectedReason
                        ? theme.colors.destructiveForeground
                        : theme.colors.mutedForeground,
                    }}
                  >
                    Submit Report
                  </Text>
                )}
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
              backgroundColor: theme.colors.card,
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
                onPress={() => void confirmUndo()}
                disabled={isReportSubmitting}
                style={{
                  backgroundColor: "#dc2626",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: isReportSubmitting ? 0.6 : 1,
                }}
              >
                {isReportSubmitting ? (
                  <ActivityIndicator color={theme.colors.destructiveForeground} />
                ) : (
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: theme.colors.destructiveForeground,
                    }}
                  >
                    Yes, Withdraw Report
                  </Text>
                )}
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
    </>
  );
}

export const PublicMatchCard = memo(PublicMatchCardComponent);
