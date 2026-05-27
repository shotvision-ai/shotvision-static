import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useAuth } from "../../src/context/AuthContext";
import { useCurrentUserAvatarProps } from "../../src/hooks/useCurrentUserAvatar";
import { useAppTheming } from "../../src/hooks/useAppTheming";
import { useUserStats } from "../../src/hooks/useUserStats";
import { winRateFractionToPercent } from "../../src/utils/userStats";
import { TRY_AGAIN_LABEL } from "~/components/ui/AsyncListState";
import { HEADER_ICON_HIT_SLOP } from "../../src/utils/touchA11y";

const BLUE = "#2563eb";

function ProgressBar({ value, max, color = BLUE }: { value: number; max: number; color?: string }) {
  const pct = Math.min(max > 0 ? (value / max) * 100 : 0, 100);
  return (
    <View
      style={{
        height: 8,
        backgroundColor: "rgba(0,0,0,0.06)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: 4,
        }}
      />
    </View>
  );
}

function MatchCalendar({ year, month }: { year: number; month: number }) {
  const { colors } = useAppTheming();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      <View className="flex-row mb-2">
        {dayLabels.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted }}>{d}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row mb-1">
          {row.map((day, ci) => {
            return (
              <View key={ci} style={{ flex: 1, alignItems: "center", paddingVertical: 2 }}>
                {day !== null ? (
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.foreground,
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                ) : (
                  <View style={{ width: 32, height: 32 }} />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheming();
  const { user, isLoading, isHydrated, logout } = useAuth();
  const currentUserAvatar = useCurrentUserAvatarProps(user?.id);
  const { stats, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useUserStats(!!user);

  const matches = stats?.totalMatches ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = stats?.losses ?? 0;
  const winRate = stats ? winRateFractionToPercent(stats.winRate) : 0;
  const currentStreak = stats?.streak ?? 0;

  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleShare = async () => {
    if (!user) return;
    try {
      const profileUrl = `https://shotvision.app/profile/${user.id}`;
      await Share.share({
        message: `Check out ${user.name}'s tennis profile on Shot Vision!\n${profileUrl}`,
        title: `${user.name} on Shot Vision`,
        url: profileUrl,
      });
    } catch {
      Alert.alert("Error", "Unable to share at this time");
    }
  };

  if (!isHydrated || isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BLUE} />
          <Text className="text-body text-muted-foreground mt-4">Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-h3 font-semibold text-foreground mb-2">Profile not found</Text>
          <TouchableOpacity
            onPress={() => {
              void (async () => {
                try {
                  await logout();
                } finally {
                  router.replace("/login");
                }
              })();
            }}
            className="bg-primary px-8 py-4 rounded-xl mt-4"
          >
            <Text className="text-primary-foreground font-semibold">Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const winsMax = Math.max(matches, 1);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Summary */}
        <View className="items-center mb-8">
          <ProfileAvatar
            imageUrl={user.image}
            preferredAvatarId={currentUserAvatar.preferredAvatarId}
            fallbackUserId={currentUserAvatar.fallbackUserId}
            imageDisplayKey={currentUserAvatar.imageDisplayKey}
            profileImageCacheRevision={currentUserAvatar.profileImageCacheRevision}
            size={100}
            withBorder={true}
          />
          <View className="items-center mt-4 mb-2">
            <Text className="text-h3 font-bold text-foreground">{user.name}</Text>
            {user.location && (
              <Text className="text-body text-muted-foreground mt-1.5">{user.location}</Text>
            )}
            <Text className="text-caption text-muted-foreground/70 mt-1">Tennis Player</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/edit-profile")}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={{
              marginTop: 16,
              borderWidth: 2,
              borderColor: BLUE,
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              minHeight: 44,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: BLUE }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Streak and Share Row */}
        <View className="flex-row gap-3 mb-4">
          <View
            className="flex-1 rounded-2xl overflow-hidden"
            style={{
              shadowColor: "#fb923c",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <View style={{ backgroundColor: "#fb923c", padding: 16 }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>
                  DAILY STREAK
                </Text>
                <LucideIcon name="Flame" size={20} color="#ffffff" />
              </View>
              <View className="flex-row items-end gap-2 mb-3">
                <Text style={{ fontSize: 42, fontWeight: "800", color: "#ffffff", lineHeight: 48 }}>
                  {currentStreak}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.8)",
                    marginBottom: 6,
                  }}
                >
                  {currentStreak === 1 ? "day" : "days"}
                </Text>
              </View>
              <View className="flex-row gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 28,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i < currentStreak % 7 ? "#ffffff" : "rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="Share profile"
            className="bg-card rounded-2xl border border-border items-center justify-center"
            style={{
              shadowColor: BLUE,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 2,
              paddingVertical: 10,
              paddingHorizontal: 14,
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <LucideIcon name="Share2" size={16} color={BLUE} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: BLUE }}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Player Stats Card */}
        <View
          className="bg-card rounded-2xl mb-4 px-5 py-6"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-caption font-semibold text-muted-foreground mb-4">MATCH STATS</Text>
          {statsError ? (
            <View className="mb-4">
              <Text className="text-body text-muted-foreground mb-3">{statsError}</Text>
              <TouchableOpacity onPress={() => void refreshStats()} className="self-start">
                <Text style={{ fontSize: 14, fontWeight: "600", color: BLUE }}>{TRY_AGAIN_LABEL}</Text>
              </TouchableOpacity>
            </View>
          ) : statsLoading ? (
            <ActivityIndicator size="small" color={BLUE} className="mb-4" />
          ) : null}
          <View className="flex-row justify-between">
            <View className="flex-1 items-center">
              <Text className="text-h2 font-bold text-foreground mb-1">{matches}</Text>
              <Text className="text-caption text-muted-foreground">Matches</Text>
            </View>
            <View className="flex-1 items-center">
              <Text style={{ fontSize: 22, fontWeight: "800", color: BLUE, marginBottom: 4 }}>
                {wins}
              </Text>
              <Text className="text-caption text-muted-foreground">Wins</Text>
            </View>
            <View className="flex-1 items-center">
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#ef4444", marginBottom: 4 }}>
                {losses}
              </Text>
              <Text className="text-caption text-muted-foreground">Losses</Text>
            </View>
            <View className="flex-1 items-center">
              <Text style={{ fontSize: 22, fontWeight: "800", color: BLUE, marginBottom: 4 }}>
                {winRate}%
              </Text>
              <Text className="text-caption text-muted-foreground">Win Rate</Text>
            </View>
          </View>
        </View>

        {/* Progress Stats Container */}
        <View
          className="bg-card rounded-2xl mb-4 p-5"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-caption font-semibold text-muted-foreground mb-4">
            PERFORMANCE PROGRESS
          </Text>
          <View className="gap-4">
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-body font-medium text-foreground">Win Rate</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: BLUE }}>{winRate}%</Text>
              </View>
              <ProgressBar value={winRate} max={100} color={BLUE} />
            </View>
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-body font-medium text-foreground">Wins This Season</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: BLUE }}>
                  {wins}/{matches}
                </Text>
              </View>
              <ProgressBar value={wins} max={winsMax} color={BLUE} />
            </View>
          </View>
        </View>

        {/* Monthly Performance — charts when API is wired */}
        <View
          className="bg-card rounded-2xl mb-4 p-5"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-caption font-semibold text-muted-foreground mb-3">
            MONTHLY PERFORMANCE
          </Text>
          {statsLoading ? (
            <ActivityIndicator size="small" color={BLUE} />
          ) : stats?.monthlyPerformance?.length ? (
            <View className="gap-3">
              {stats.monthlyPerformance.slice(0, 6).map((point) => (
                <View key={point.month}>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-body font-medium text-foreground">{point.month}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: BLUE }}>
                      {winRateFractionToPercent(point.winRate)}%
                    </Text>
                  </View>
                  <ProgressBar value={point.wins} max={Math.max(point.totalMatches, 1)} color={BLUE} />
                  <Text className="text-caption text-muted-foreground mt-1">
                    {point.wins}W · {point.losses}L · {point.totalMatches} matches
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-body text-muted-foreground">
              Play and finish matches to see monthly trends here.
            </Text>
          )}
        </View>

        {/* Match Calendar */}
        <View
          className="bg-card rounded-2xl mb-6 p-5"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-caption font-semibold text-muted-foreground">MATCH CALENDAR</Text>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={prevMonth}
                hitSlop={HEADER_ICON_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LucideIcon name="ChevronLeft" size={16} color={colors.muted} />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.foreground,
                  minWidth: 110,
                  textAlign: "center",
                }}
              >
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <TouchableOpacity
                onPress={nextMonth}
                hitSlop={HEADER_ICON_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LucideIcon name="ChevronRight" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
          <MatchCalendar year={calendarYear} month={calendarMonth} />
          <Text className="text-caption text-muted-foreground mt-3 pt-3 border-t border-border/30">
            Match days will highlight here when your schedule is available.
          </Text>
        </View>

        {/* Actions Section */}
        <View
          className="bg-card rounded-2xl overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            className="flex-row items-center justify-between py-4 px-4 min-h-[52px]"
          >
            <View className="flex-row items-center gap-3">
              <LucideIcon name="Settings" size={20} color={colors.muted} />
              <Text className="text-body font-medium text-foreground">Settings</Text>
            </View>
            <LucideIcon name="ChevronRight" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
