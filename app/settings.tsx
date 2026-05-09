import { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useColorScheme } from "~/lib/useColorScheme";
import { useAuth } from "../src/context/AuthContext";
import { profileService, UserSettings } from "../src/services/api/profileService";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_POLICY_URL } from "../src/constants/legalUrls";

type ThemeMode = "light" | "dark" | "system";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, restoreSession } = useAuth();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
  const { theme, setTheme } = useTheme();
  const { setColorScheme } = useColorScheme();
  const rowIconColor = theme.colors.mutedForeground ?? "#6b7280";
  const rowChevronColor = theme.colors.mutedForeground ?? "#9ca3af";

  // Theme preference
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("system");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.settings?.theme) {
      setSelectedTheme(user.settings.theme as ThemeMode);
    }
  }, [user]);

  const handleThemeChange = async (mode: ThemeMode) => {
    if (mode === selectedTheme) return;
    
    const previousTheme = selectedTheme;
    setSelectedTheme(mode);

    // Apply theme locally first for instant feedback
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
      await profileService.updateSettings({ theme: mode });
      await restoreSession();
    } catch (error) {
      console.error("Failed to update theme setting:", error);
      // Rollback on failure
      setSelectedTheme(previousTheme);
      Alert.alert("Error", "Failed to save theme preference.");
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
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => alert("Delete account functionality coming soon"),
        },
      ],
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#2563eb",
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
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Dark Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange("dark")}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Moon" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">Dark Mode</Text>
              </View>
              {selectedTheme === "dark" && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <LucideIcon name="Check" size={14} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {/* Light Mode */}
            <TouchableOpacity
              onPress={() => handleThemeChange("light")}
              className="flex-row items-center justify-between px-4 py-4 border-b border-border/10"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Sun" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">Light Mode</Text>
              </View>
              {selectedTheme === "light" && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <LucideIcon name="Check" size={14} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {/* System Default */}
            <TouchableOpacity
              onPress={() => handleThemeChange("system")}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Laptop" size={20} color={rowIconColor} />
                <Text className="text-body font-medium text-foreground">System Default</Text>
              </View>
              {selectedTheme === "system" && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <LucideIcon name="Check" size={14} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View className="mb-5">
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#2563eb",
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
              shadowColor: "#2563eb",
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
              color: "#2563eb",
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
              shadowColor: "#2563eb",
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
              color: "#2563eb",
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
              shadowColor: "#2563eb",
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
                <LucideIcon name="Share2" size={20} color="#2563eb" />
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
              className="flex-row items-center px-4 py-4 min-h-[52px]"
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Delete Account"
            >
              <LucideIcon name="Trash2" size={20} color="#dc2626" />
              <Text className="text-body font-semibold text-red-600 ml-3 flex-1 shrink" numberOfLines={2}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
