import { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useColorScheme } from "~/lib/useColorScheme";
import { useAuth } from "../src/context/AuthContext";
import { profileService } from "../src/services/api/profileService";
import { getUserFriendlyErrorMessage } from "../src/services/api/userFriendlyErrors";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_POLICY_URL } from "../src/constants/legalUrls";
import { devLog } from "../src/utils/devLog";
import { Switch } from "~/components/ui/switch";
import { useMatchCalendarStore } from "../src/stores/matchCalendarStore";

type ThemeMode = "light" | "dark" | "system";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccountAndSignOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setColorScheme } = useColorScheme();
  const rowIconColor = theme.colors.mutedForeground ?? "#6b7280";
  const rowChevronColor = theme.colors.mutedForeground ?? "#9ca3af";
  const sectionAccent = theme.colors.primary ?? "hsl(221 83% 53%)";
  const onPrimary = theme.colors.primaryForeground ?? "hsl(0 0% 100%)";

  const calendarSyncEnabled = useMatchCalendarStore((s) => s.enabled);
  const calendarSyncing = useMatchCalendarStore((s) => s.isSyncing);
  const hydrateCalendarPrefs = useMatchCalendarStore((s) => s.hydrateForUser);
  const setCalendarSyncEnabled = useMatchCalendarStore((s) => s.setEnabled);
  const syncAllCalendar = useMatchCalendarStore((s) => s.syncAll);

  // Theme preference
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("system");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateCalendarPrefs(user.id);
  }, [user?.id, hydrateCalendarPrefs]);

  const handleCalendarSyncToggle = async (enabled: boolean) => {
    if (!user?.id) return;
    const result = await setCalendarSyncEnabled(user.id, enabled);
    if (result === "denied") {
      Alert.alert(
        "Calendar permission required",
        Platform.select({
          ios: "Allow Shot Vision to access your calendar in Settings to sync scheduled matches.",
          android:
            "Allow calendar access so scheduled matches can appear in Google Calendar via your device.",
          default: "Calendar access is required to sync scheduled matches.",
        }) ?? "Calendar access is required to sync scheduled matches."
      );
    }
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    if (mode === selectedTheme) return;

    const previousTheme = selectedTheme;
    setSelectedTheme(mode);

    if (mode === "light") {
      setTheme("light");
      setColorScheme("light");
    } else if (mode === "dark") {
      setTheme("dark");
      setColorScheme("dark");
    } else {
      setColorScheme(null);
    }

    try {
      const darkMode = mode === "dark" ? true : mode === "light" ? false : null;
      await profileService.updateSettings({ darkMode });
    } catch (error) {
      devLog.error("[settings] theme update failed:", error);
      setSelectedTheme(previousTheme);
      Alert.alert("Error", getUserFriendlyErrorMessage(error, "Failed to save theme preference."));
    }
  };

  const handleQueries = () => {
    router.push("/faq");
  };

  const handleGetHelp = () => {
    router.push("/help");
  };

  const handleSendFeedback = () => {
    router.push("/feedback");
  };

  const handleTermsOfService = () => {
    router.push("/terms");
  };

  const handlePrivacyPolicy = async () => {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  const handleDataDeletion = () => {
    router.push("/data-deletion");
  };

  const handleReportProcess = () => {
    router.push("/report-process");
  };

  const handleShareProfile = async () => {
    if (!user) return;
    const { Share } = await import("react-native");
    const profileUrl = `https://shotvision.app/profile/${user.id}`;
    Share.share({
      message: `Check out ${user.name}'s tennis profile on Shot Vision! ${profileUrl}`,
      url: profileUrl,
      title: `${user.name} on Shot Vision`,
    });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "default",
        onPress: async () => {
          try {
            await logout();
          } finally {
            router.replace("/login");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Your account will be scheduled for deletion. You can sign in again during the grace period if you change your mind.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsUpdating(true);
              await deleteAccountAndSignOut();
              router.replace("/login");
            } catch (error) {
              Alert.alert(
                "Error",
                getUserFriendlyErrorMessage(error, "Could not delete your account. Please try again.")
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* JS header: sits below the status bar using insets.top directly (FAQ pattern) */}
        <View
          style={{
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            backgroundColor: theme.colors.background,
          }}
        >
          <View
            style={{
              height: 56,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                padding: 8,
                marginLeft: 4,
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
              }}
            >
              <LucideIcon name="ChevronLeft" size={26} color={theme.colors.foreground} />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  fontFamily: theme.typography.h2?.fontFamily,
                  color: theme.colors.foreground,
                }}
                numberOfLines={1}
              >
                Settings
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 40 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
        {/* Appearance Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: sectionAccent,
              letterSpacing: 0.8,
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            APPEARANCE
          </Text>

          <View
            className="bg-card rounded-2xl overflow-hidden"
            style={{
              shadowColor: sectionAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Dark Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange("dark")}
              accessibilityRole="button"
              accessibilityLabel="Dark mode"
              accessibilityState={{ selected: selectedTheme === "dark" }}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Moon" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">Dark Mode</Text>
              </View>
              {selectedTheme === "dark" && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <LucideIcon name="Check" size={14} color={onPrimary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Light Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange("light")}
              accessibilityRole="button"
              accessibilityLabel="Light mode"
              accessibilityState={{ selected: selectedTheme === "light" }}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Sun" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">Light Mode</Text>
              </View>
              {selectedTheme === "light" && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <LucideIcon name="Check" size={14} color={onPrimary} />
                </View>
              )}
            </TouchableOpacity>

            {/* System Default */}
            <TouchableOpacity
              onPress={() => handleThemeChange("system")}
              accessibilityRole="button"
              accessibilityLabel="System default theme"
              accessibilityState={{ selected: selectedTheme === "system" }}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Laptop" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">System Default</Text>
              </View>
              {selectedTheme === "system" && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <LucideIcon name="Check" size={14} color={onPrimary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: sectionAccent,
              letterSpacing: 0.8,
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            CALENDAR
          </Text>

          <View
            className="bg-card rounded-2xl overflow-hidden"
            style={{
              shadowColor: sectionAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-border/10">
              <View className="flex-row items-center gap-3 flex-1 pr-3">
                <LucideIcon name="CalendarDays" size={20} color={rowIconColor} />
                <View className="flex-1">
                  <Text className="text-body font-medium text-foreground">Sync to calendar</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Scheduled matches appear in your device calendar (Google Calendar when linked)
                  </Text>
                </View>
              </View>
              <Switch
                checked={calendarSyncEnabled}
                onCheckedChange={(value) => {
                  void handleCalendarSyncToggle(value);
                }}
                disabled={calendarSyncing || isUpdating}
                accessibilityLabel="Sync scheduled matches to calendar"
              />
            </View>

            {calendarSyncEnabled ? (
              <TouchableOpacity
                onPress={() => {
                  if (!user?.id) return;
                  void syncAllCalendar(user.id);
                }}
                disabled={calendarSyncing}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <LucideIcon name="RefreshCw" size={20} color={rowIconColor} />
                  <Text className="text-body font-medium text-foreground">
                    {calendarSyncing ? "Syncing…" : "Sync now"}
                  </Text>
                </View>
                <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Support Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: sectionAccent,
              letterSpacing: 0.8,
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            SUPPORT
          </Text>

          <View
            className="bg-card rounded-2xl overflow-hidden"
            style={{
              shadowColor: sectionAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* FAQ / Queries */}
            <TouchableOpacity
              onPress={handleQueries}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <LucideIcon name="BookOpen" size={20} color={rowIconColor} />
                <View className="flex-1">
                  <Text className="text-body font-medium text-foreground">FAQs</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Frequently asked questions
                  </Text>
                </View>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>

            {/* Get Help */}
            <TouchableOpacity
              onPress={handleGetHelp}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <LucideIcon name="LifeBuoy" size={20} color={rowIconColor} />
                <View className="flex-1">
                  <Text className="text-body font-medium text-foreground">Get Help</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Contact support for issues or questions
                  </Text>
                </View>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>

            {/* Send Feedback */}
            <TouchableOpacity
              onPress={handleSendFeedback}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <LucideIcon name="MessageCircle" size={20} color={rowIconColor} />
                <View className="flex-1">
                  <Text className="text-body font-medium text-foreground">Send Feedback</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Help us improve Shot Vision
                  </Text>
                </View>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: sectionAccent,
              letterSpacing: 0.8,
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            LEGAL
          </Text>

          <View
            className="bg-card rounded-2xl overflow-hidden"
            style={{
              shadowColor: sectionAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Terms of Service */}
            <TouchableOpacity
              onPress={handleTermsOfService}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="FileText" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">Terms of Service</Text>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>

            {/* Privacy Policy — opens hosted Notion policy in system browser */}
            <TouchableOpacity
              onPress={handlePrivacyPolicy}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Shield" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">Privacy Policy</Text>
              </View>
              <LucideIcon name="ExternalLink" size={20} color={rowChevronColor} />
            </TouchableOpacity>

            {/* Data deletion policy (distinct from permanent account delete in ACCOUNT) */}
            <TouchableOpacity
              onPress={handleDataDeletion}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <LucideIcon name="Trash2" size={20} color={rowIconColor} />
                <View className="flex-1">
                  <Text className="text-body font-medium text-foreground">Data deletion</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Policy and removal requests
                  </Text>
                </View>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>

            {/* Report a Match Process */}
            <TouchableOpacity
              onPress={handleReportProcess}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Flag" size={20} color={rowIconColor} />
                <View>
                  <Text className="text-body font-medium text-foreground">Report a Match</Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    What happens when you report
                  </Text>
                </View>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: sectionAccent,
              letterSpacing: 0.8,
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            ACCOUNT
          </Text>

          <View
            className="bg-card rounded-2xl overflow-hidden"
            style={{
              shadowColor: sectionAccent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Share Profile */}
            <TouchableOpacity
              onPress={handleShareProfile}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Share2" size={20} color={sectionAccent} />
                <Text className="text-body font-medium text-foreground">Share My Profile</Text>
              </View>
              <LucideIcon name="ChevronRight" size={20} color={rowChevronColor} />
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center gap-3 px-4 py-4 border-b border-border/10"
            >
              <LucideIcon name="LogOut" size={20} color={rowIconColor} />
              <Text className="text-body font-medium text-foreground">Logout</Text>
            </TouchableOpacity>

            {/* Permanent account deletion */}
            <TouchableOpacity
              onPress={handleDeleteAccount}
              className="flex-row items-center gap-3 px-4 py-4 min-h-[52px]"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Delete Account"
            >
              <LucideIcon name="Trash2" size={20} color="#dc2626" />
              <Text
                className="text-body font-semibold"
                style={{ color: "#dc2626" }}
                numberOfLines={1}
              >
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>
    </>
  );
}
