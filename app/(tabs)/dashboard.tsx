import { useState, useCallback } from "react";
import { View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { MatchCard } from "~/components/match/MatchCard";
import { FloatingActionButton } from "~/components/ui/FloatingActionButton";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { MatchStatus } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import { useTheme } from "~/theming/ThemeProvider";
import { useDefaultAvatar } from "../../src/context/DefaultAvatarContext";
import { useMatches } from "../../src/hooks/useMatches";
import { MatchStatusFilter } from "../../src/services/api/matchService";

export default function Dashboard() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { preferredAvatarId } = useDefaultAvatar();
  const [quickFilter, setQuickFilter] = useState<MatchStatusFilter>("all");

  const { matches, isLoading, isRefreshing, error, hasMore, refresh, loadMore } = useMatches({
    status: quickFilter,
  });

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
    if (isLoading && !isRefreshing) return null;

    if (error) {
      return (
        <View className="flex-1 items-center justify-center px-8 py-20">
          <LucideIcon name="CircleAlert" size={64} color={theme.colors.destructive} />
          <Text className="text-h3 font-semibold text-foreground mt-6 mb-2 text-center">
            Failed to load matches
          </Text>
          <Text className="text-body text-muted-foreground text-center mb-6">{error}</Text>
          <TouchableOpacity
            onPress={refresh}
            className="bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-primary-foreground font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-8 py-20">
        <ProfileAvatar preferredAvatarId={preferredAvatarId} size={88} />
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
