import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { View, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { MatchCard } from "~/components/match/MatchCard";
import { FloatingActionButton } from "~/components/ui/FloatingActionButton";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { MatchStatus } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { useTheme } from "~/theming/ThemeProvider";
import { useCurrentUserAvatarProps } from "../../src/hooks/useCurrentUserAvatar";
import { useMatches } from "../../src/hooks/useMatches";
import { MatchStatusFilter } from "../../src/services/api/matchService";
import { useAuth } from "../../src/context/AuthContext";
import { useMatchLikeStore } from "../../src/stores/matchLikeStore";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";
import { ListErrorState, ListLoadingState } from "~/components/ui/AsyncListState";

export default function Dashboard() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticating } = useAuth();
  const currentUserAvatar = useCurrentUserAvatarProps(user?.id);
  const [quickFilter, setQuickFilter] = useState<MatchStatusFilter>("all");

  const { matches, isLoading, isRefreshing, error, hasMore, refresh, loadMore } = useMatches({
    status: quickFilter,
    enabled: !!user,
  });
  const likeRevision = useMatchLikeStore((s) => s.revision);

  useFocusEffect(
    useCallback(() => {
      const { myMatchesStale, clearMyMatchesStale } = useMatchVisibilityStore.getState();
      if (myMatchesStale) {
        clearMyMatchesStale();
        refresh();
      }
    }, [refresh])
  );

  const renderHeader = () => (
    <View className="pt-1 pb-5">
      <SegmentedControl
        options={[
          { label: "All", value: "all" },
          { label: "Live", value: "live" },
          { label: "Finished", value: "completed" },
          { label: "Scheduled", value: "scheduled" },
        ]}
        selectedValue={quickFilter}
        onChange={(value) => setQuickFilter(value as MatchStatusFilter)}
      />
    </View>
  );

  const renderEmptyState = () => {
    if (isLoading && !isRefreshing && matches.length === 0) {
      return <ListLoadingState message="Loading your matches…" />;
    }

    if (error && !isAuthenticating) {
      return (
        <ListErrorState
          title="Couldn't load your matches"
          message={error}
          onRetry={refresh}
        />
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-8 py-20">
        <ProfileAvatar
          preferredAvatarId={currentUserAvatar.preferredAvatarId}
          fallbackUserId={currentUserAvatar.fallbackUserId}
          imageDisplayKey={currentUserAvatar.imageDisplayKey}
          profileImageCacheRevision={currentUserAvatar.profileImageCacheRevision}
          size={88}
        />
        <Text className="text-h3 font-semibold text-foreground mt-6 mb-2 text-center">
          No matches yet
        </Text>
        <Text className="text-body text-muted-foreground text-center">
          {quickFilter === "all"
            ? "Tap the + button below to create your first match"
            : `No ${quickFilter} matches found`}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View className="py-6">
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <FlatList
        data={matches}
        extraData={`${quickFilter}-${isRefreshing}-${matches.length}-${likeRevision}`}
        renderItem={({ item }) => <MatchCard match={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120 + insets.bottom,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      />
      <FloatingActionButton />
    </SafeAreaView>
  );
}
