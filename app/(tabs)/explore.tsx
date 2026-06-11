import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ListRenderItem,
} from "react-native";
import { ListErrorState, ListLoadingState } from "~/components/ui/AsyncListState";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { ExploreMatchCard } from "~/components/explore/ExploreMatchCard";
import { MatchesListScreenHeader } from "~/components/match/MatchesListScreenHeader";
import { ExploreFilterTabs } from "~/components/explore/ExploreFilterTabs";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { useMatches } from "../../src/hooks/useMatches";
import { MatchStatusFilter } from "../../src/services/api/matchService";
import { useAuth } from "../../src/context/AuthContext";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";
import { Match } from "~/types/match";

function exploreFilterLabel(filter: MatchStatusFilter): string {
  switch (filter) {
    case "live":
      return "live";
    case "completed":
      return "finished";
    case "scheduled":
      return "scheduled";
    case "cancelled":
      return "cancelled";
    default:
      return "all";
  }
}

const renderExploreItem: ListRenderItem<Match> = ({ item }) => <ExploreMatchCard match={item} />;

const keyExtractor = (item: Match) => item.id;

export default function Explore() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticating } = useAuth();
  const [quickFilter, setQuickFilter] = useState<MatchStatusFilter>("all");

  const { matches, isLoading, isRefreshing, isLoadingMore, error, hasMore, refresh, loadMore } =
    useMatches({
    type: "explore",
    status: quickFilter,
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      const { exploreStale, clearExploreStale, myMatchesStale, clearMyMatchesStale, markAllListsStale } =
        useMatchVisibilityStore.getState();

      if (!exploreStale && !myMatchesStale) return;

      void (async () => {
        const ok = await refresh();
        if (ok) {
          clearExploreStale();
          clearMyMatchesStale();
        } else {
          markAllListsStale();
        }
      })();
    }, [refresh])
  );

  const listHeader = useMemo(
    () => (
      <View style={{ marginHorizontal: -16, paddingBottom: 8 }}>
        <MatchesListScreenHeader title="Explore" />
        <ExploreFilterTabs selected={quickFilter} onChange={setQuickFilter} />
      </View>
    ),
    [quickFilter]
  );

  const emptyContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      minHeight: 320,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
      paddingVertical: 48,
    }),
    []
  );

  const listEmpty = useMemo(() => {
    if (isLoading && !isRefreshing && matches.length === 0) {
      return (
        <ListLoadingState message="Loading public matches…" style={emptyContainerStyle} />
      );
    }

    if (error && !isAuthenticating) {
      const isWakeUp =
        error.toLowerCase().includes("starting") ||
        error.toLowerCase().includes("taking longer") ||
        error.toLowerCase().includes("timed out") ||
        error.toLowerCase().includes("connection");
      return (
        <ListErrorState
          title="Couldn't load explore"
          message={
            isWakeUp
              ? "The server is waking up — this can take up to 30 seconds on first load. Tap Try again."
              : error
          }
          onRetry={() => {
            void refresh();
          }}
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
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: "#FFF0EC",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <LucideIcon name="Globe" size={36} color={exploreColors.coral} />
        </View>
        <Text
          style={{
            fontFamily: exploreFontFamily.bold,
            fontSize: 18,
            color: exploreColors.ink,
            marginTop: 12,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {isFiltered
            ? `No ${filterLabel} public matches`
            : "There are no public matches"}
        </Text>
        <Text
          style={{
            fontFamily: exploreFontFamily.regular,
            fontSize: 14,
            color: exploreColors.muted,
            textAlign: "center",
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {isFiltered
            ? filteredEmptyWithMore
              ? "More matches may be on the next pages. Load more or switch to All."
              : `Nothing ${filterLabel} in the explore feed right now. Try All or pull down to refresh.`
            : "When players share matches publicly, they'll appear here. Pull down to refresh."}
        </Text>
        {filteredEmptyWithMore ? (
          <TouchableOpacity
            onPress={loadMore}
            style={{
              backgroundColor: exploreColors.coral,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 14,
              marginTop: 20,
            }}
          >
            <Text style={{ fontFamily: exploreFontFamily.bold, fontSize: 14, color: "#FFFFFF" }}>
              Load more
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    isLoading,
    isRefreshing,
    matches.length,
    error,
    isAuthenticating,
    refresh,
    quickFilter,
    hasMore,
    loadMore,
    emptyContainerStyle,
  ]);

  const listFooter = useMemo(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator color={exploreColors.coral} />
      </View>
    );
  }, [isLoadingMore]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingBottom: 24 + insets.bottom,
      flexGrow: 1 as const,
    }),
    [insets.bottom]
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: exploreColors.pageBg }}
      edges={["top", "left", "right"]}
    >
      <FlatList
        data={matches}
        extraData={quickFilter}
        renderItem={renderExploreItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={5}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={exploreColors.coral}
          />
        }
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
