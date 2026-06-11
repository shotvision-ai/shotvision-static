import React, { memo } from "react";
import { View, Pressable, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { StatusBadge } from "./StatusBadge";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useMatchListViewer } from "../../src/context/MatchListViewerContext";
import {
  isMatchParticipantSelf,
  resolveMatchParticipantImageUrl,
} from "../../src/utils/matchParticipantAvatar";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { MatchVisibilityControl } from "./MatchVisibilityControl";
import { OwnerMatchCardActions } from "./OwnerMatchCardActions";
import { MatchLikeButton } from "./MatchLikeButton";
import { useAppTheming } from "../../src/hooks/useAppTheming";
import { MATCH_LIST_CARD as L } from "./matchListCardLayout";
import { MatchListCardScore } from "./MatchListCardScore";

interface MatchCardProps {
  match: Match;
}

function MatchCardComponent({ match }: MatchCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser, avatar: currentUserAvatar } = useMatchListViewer();

  const { isLiked, likesCount, isLiking, canToggle, handleLike } = useMatchLike(match, {
    isOwnDashboardMatch: true,
  });

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

  const openMatchDetails = () => {
    if (!match.id?.trim()) return;
    router.push(`/match/${match.id}`);
  };

  const { colors: ui } = useAppTheming();
  const metaMuted = ui.muted;

  const accentColor =
    match.status === "live"
      ? "#f59e0b"
      : match.status === "scheduled"
        ? "#2563eb"
        : match.status === "completed"
          ? "#22c55e"
          : match.status === "cancelled"
            ? "#dc2626"
          : "#2563eb";

  const cardContainerStyle = {
    backgroundColor:
      match.status === "live"
        ? ui.liveCardTint
        : theme.colors.card,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 } as const,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.12)",
    overflow: "hidden" as const,
  };

  return (
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
          <Pressable
            onPress={openMatchDetails}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Open match details"
          >
            {getWinnerText() ? (
              <View className="flex-row items-center">
                <Text style={{ fontSize: L.winner, fontWeight: "600", color: "#2563eb" }}>
                  🏆 {getWinnerText()}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <View className="flex-row items-center gap-2">
            <MatchVisibilityControl match={match} isOwnDashboardMatch variant="chip" />
            <StatusBadge status={match.status} compact />
          </View>
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
            <View className="flex-row items-center mt-1.5">
              {match.status === "completed" && match.winner === "playerA" && (
                <LucideIcon name="Trophy" size={12} color="#FFD700" style={{ marginRight: 3 }} />
              )}
              <Text
                className="text-foreground text-center"
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
            <View className="flex-row items-center mt-1.5">
              {match.status === "completed" && match.winner === "playerB" && (
                <LucideIcon name="Trophy" size={12} color="#FFD700" style={{ marginRight: 3 }} />
              )}
              <Text
                className="text-foreground text-center"
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
        </View>

        <MatchListCardScore match={match} />
        </Pressable>

        <OwnerMatchCardActions
          match={match}
          currentUserId={currentUser?.id}
          isOwnDashboardMatch
          compact
        />

        {/* Opt-out API not shipped — avoid fake success (beta). */}

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={openMatchDetails}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Open match details"
          >
            <View className="flex-row items-center flex-1">
              <LucideIcon name="Calendar" size={12} color={metaMuted} />
              <Text
                style={{ fontSize: L.meta, color: metaMuted, marginLeft: 4, marginRight: 8 }}
              >
                {formatDate(match.matchDate)}
              </Text>
              {match.location ? (
                <Text style={{ fontSize: L.meta, color: metaMuted, flex: 1 }} numberOfLines={1}>
                  {match.location}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <MatchLikeButton
            isLiked={isLiked}
            likesCount={likesCount}
            isLiking={isLiking}
            canToggle={canToggle}
            onLike={() => void handleLike()}
            readOnlyWhenDisabled
          />
        </View>
      </View>
    </View>
  );
}

export const MatchCard = memo(MatchCardComponent);
