import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { MyMatchCard } from "~/components/myMatches/MyMatchCard";
import { FloatingActionButton } from "~/components/ui/FloatingActionButton";
import { MatchesListScreenHeader } from "~/components/match/MatchesListScreenHeader";
import { ExploreFilterTabs } from "~/components/explore/ExploreFilterTabs";
import { Match } from "~/types/match";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { useCurrentUserAvatarProps } from "../../src/hooks/useCurrentUserAvatar";
import { useMatches } from "../../src/hooks/useMatches";
import { MatchStatusFilter } from "../../src/services/api/matchService";
import { useAuth } from "../../src/context/AuthContext";
import { useMatchVisibilityStore } from "../../src/stores/matchVisibilityStore";
import { ListErrorState, ListLoadingState } from "~/components/ui/AsyncListState";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import LucideIcon from "~/lib/icons/LucideIcon";

const renderMatchItem: ListRenderItem<Match> = ({ item }) => <MyMatchCard match={item} />;

const keyExtractor = (item: Match) => item.id;

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticating } = useAuth();
  const currentUserAvatar = useCurrentUserAvatarProps(user?.id);
  const [quickFilter, setQuickFilter] = useState<MatchStatusFilter>("all");

  const { matches, isLoading, isRefreshing, isLoadingMore, error, hasMore, refresh, loadMore } =
    useMatches({
    status: quickFilter,
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      const { myMatchesStale, clearMyMatchesStale } = useMatchVisibilityStore.getState();
      if (myMatchesStale) {
        clearMyMatchesStale();
        refresh();
      }
    }, [refresh])
  );

  const listHeader = useMemo(
    () => (
      <View style={{ marginHorizontal: -16, paddingBottom: 8 }}>
        <MatchesListScreenHeader title="My Matches" />
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
      return <ListLoadingState message="Loading your matches…" style={emptyContainerStyle} />;
    }

    if (error && !isAuthenticating) {
      return (
        <ListErrorState
          title="Couldn't load your matches"
          message={error}
          onRetry={refresh}
          style={emptyContainerStyle}
        />
      );
    }

    return (
      <View style={emptyContainerStyle}>
        <ProfileAvatar
          preferredAvatarId={currentUserAvatar.preferredAvatarId}
          fallbackUserId={currentUserAvatar.fallbackUserId}
          imageDisplayKey={currentUserAvatar.imageDisplayKey}
          profileImageCacheRevision={currentUserAvatar.profileImageCacheRevision}
          size={72}
        />
        <Text
          style={{
            fontFamily: exploreFontFamily.bold,
            fontSize: 18,
            color: exploreColors.ink,
            marginTop: 16,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          No matches yet
        </Text>
        <Text
          style={{
            fontFamily: exploreFontFamily.regular,
            fontSize: 14,
            color: exploreColors.muted,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {quickFilter === "all"
            ? "Tap + to create your first match"
            : `No ${quickFilter} matches found`}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6 }}>
          <LucideIcon name="Plus" size={14} color={exploreColors.coral} />
          <Text style={{ fontFamily: exploreFontFamily.regular, fontSize: 12, color: exploreColors.muted }}>
            Use the button below
          </Text>
        </View>
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
    currentUserAvatar,
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
      paddingBottom: 100 + insets.bottom,
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
        renderItem={renderMatchItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={exploreColors.coral}
          />
        }
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
      />
      <FloatingActionButton bottomInset={insets.bottom} />
    </SafeAreaView>
  );
}
