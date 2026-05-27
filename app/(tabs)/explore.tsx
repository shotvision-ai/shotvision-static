import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { ListErrorState, ListLoadingState } from "~/components/ui/AsyncListState";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { PublicMatchCard } from "~/components/match/PublicMatchCard";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useMatches } from "../../src/hooks/useMatches";
import { MatchStatusFilter } from "../../src/services/api/matchService";
import { useAuth } from "../../src/context/AuthContext";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";

function exploreFilterLabel(filter: MatchStatusFilter): string {
  switch (filter) {
    case "live":
      return "live";
    case "completed":
      return "finished";
    case "scheduled":
      return "scheduled";
    default:
      return "all";
  }
}

export default function Explore() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticating } = useAuth();
  const [quickFilter, setQuickFilter] = useState<MatchStatusFilter>("all");

  const { matches, isLoading, isRefreshing, error, hasMore, refresh, loadMore } = useMatches({
    type: "explore",
    status: quickFilter,
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      const { exploreStale, clearExploreStale, myMatchesStale, clearMyMatchesStale } =
        useMatchVisibilityStore.getState();

      if (!exploreStale && !myMatchesStale) return;

      if (exploreStale) {
        clearExploreStale();
        // Refresh re-syncs GET /api/matches/my (force) and supplements Explore on page 1.
        refresh();
      }
      if (myMatchesStale) {
        clearMyMatchesStale();
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
    const emptyContainerStyle = {
      flexGrow: 1,
      minHeight: 360,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
      paddingVertical: 48,
    };

    if (isLoading && !isRefreshing && matches.length === 0) {
      return (
        <ListLoadingState message="Loading public matches…" style={emptyContainerStyle} />
      );
    }

    if (error && !isAuthenticating) {
      return (
        <ListErrorState
          title="Couldn't load explore matches"
          message={error}
          onRetry={refresh}
          style={emptyContainerStyle}
        />
      );
    }

    const isFiltered = quickFilter !== "all";
    const filterLabel = exploreFilterLabel(quickFilter);
    const filteredEmptyWithMore = isFiltered && hasMore && !isLoading && !isRefreshing;

    return (
      <View style={emptyContainerStyle}>
        <View
          className="items-center justify-center rounded-full bg-primary/10 mb-2"
          style={{ width: 80, height: 80 }}
        >
          <LucideIcon name="Globe" size={40} color={theme.colors.primary} />
        </View>
        <Text className="text-h3 font-semibold text-foreground mt-4 mb-2 text-center">
          {isFiltered
            ? `No ${filterLabel} public matches`
            : "There are no public matches"}
        </Text>
        <Text className="text-body text-muted-foreground text-center leading-6 max-w-[300px]">
          {isFiltered
            ? filteredEmptyWithMore
              ? "More matches may be on the next pages. Load more or switch to All."
              : `Nothing ${filterLabel} in the explore feed right now. Try All or pull down to refresh.`
            : "When players share matches publicly, they'll appear here. Pull down to refresh."}
        </Text>
        {filteredEmptyWithMore ? (
          <TouchableOpacity onPress={loadMore} className="bg-primary px-6 py-3 rounded-xl mt-6">
            <Text className="text-primary-foreground font-semibold">Load more</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-caption text-muted-foreground/80 mt-5 text-center">
            Pull down to refresh
          </Text>
        )}
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
        extraData={`${quickFilter}-${isRefreshing}-${matches.length}`}
        renderItem={({ item }) => <PublicMatchCard match={item} />}
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
    </SafeAreaView>
  );
}
