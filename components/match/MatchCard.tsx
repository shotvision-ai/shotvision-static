import { View, Pressable, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { StatusBadge } from "./StatusBadge";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { Match } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useAuth } from "../../src/context/AuthContext";
import { useCurrentUserAvatarProps } from "../../src/hooks/useCurrentUserAvatar";
import {
  isMatchParticipantSelf,
  resolveMatchParticipantImageUrl,
} from "../../src/utils/matchParticipantAvatar";
import { useMatchLike } from "../../src/hooks/useMatchLike";
import { MatchVisibilityControl } from "./MatchVisibilityControl";
import { OwnerMatchCardActions } from "./OwnerMatchCardActions";
import { MatchLikeButton } from "./MatchLikeButton";
import { useAppTheming } from "../../src/hooks/useAppTheming";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) { 
  const router = useRouter();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const currentUserAvatar = useCurrentUserAvatarProps(currentUser?.id);

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
    <View className="rounded-2xl mb-4 overflow-hidden" style={cardContainerStyle}>
      <View style={{ height: 4, backgroundColor: accentColor }} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        {/* Top row: visibility is its own control; rest opens details */}
        <View className="flex-row items-start justify-between mb-3">
          <Pressable
            onPress={openMatchDetails}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Open match details"
          >
            {getWinnerText() ? (
              <View className="flex-row items-center">
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#2563eb" }}>🏆 </Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#2563eb" }}>
                  {getWinnerText()}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <View className="flex-row items-center gap-2">
            <MatchVisibilityControl match={match} isOwnDashboardMatch variant="chip" />
            <StatusBadge status={match.status} />
          </View>
        </View>

        <Pressable
          onPress={openMatchDetails}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Open match details"
        >
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
                  size={70}
                  variant="plain"
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
                  size={70}
                  variant="plain"
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
            <Text style={{ fontSize: 13, color: metaMuted }}>
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
        </Pressable>

        <OwnerMatchCardActions
          match={match}
          currentUserId={currentUser?.id}
          isOwnDashboardMatch
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
              <LucideIcon name="Calendar" size={14} color={metaMuted} />
              <Text style={{ fontSize: 13, color: metaMuted, marginLeft: 6, marginRight: 12 }}>
                {formatDate(match.matchDate)}
              </Text>
              {match.location ? (
                <Text style={{ fontSize: 13, color: metaMuted, flex: 1 }} numberOfLines={1}>
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
