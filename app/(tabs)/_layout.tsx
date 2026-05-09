import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, View, Platform, StatusBar as RNStatusBar } from "react-native";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";

export default function TabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  const NotificationButton = () => (
    <TouchableOpacity onPress={() => router.push("/notifications")} style={{ paddingRight: 4 }}>
      <View style={{ position: "relative" }}>
        <LucideIcon name="Bell" size={22} color={theme.colors.foreground} />
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#6366f1",
          }}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6366f1", // Indigo/purple for active
        tabBarInactiveTintColor: theme.colors.mutedForeground, // Use theme color
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 12,
          paddingBottom: 12,
          height: 80,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          fontFamily: theme.typography.caption?.fontFamily || "DMSans_500Medium",
          marginTop: 4,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
          marginTop: 0,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerStatusBarHeight: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) : undefined,
        headerTitleStyle: {
          fontFamily: theme.typography.h2?.fontFamily || "DMSans_700Bold",
          fontSize: 24,
          color: theme.colors.foreground,
        },
        headerTitleAlign: "center",
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerRightContainerStyle: {
          paddingRight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore Matches",
          tabBarLabel: "Explore",
          tabBarIcon: ({ color }) => <LucideIcon name="Users" size={24} color={color} />,
          headerRight: () => <NotificationButton />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "My Matches",
          tabBarLabel: "My Matches",
          tabBarIcon: ({ color }) => <LucideIcon name="Trophy" size={24} color={color} />,
          headerRight: () => <NotificationButton />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color }) => <LucideIcon name="User" size={24} color={color} />,
          headerRight: () => <NotificationButton />,
        }}
      />
    </Tabs>
  );
}
