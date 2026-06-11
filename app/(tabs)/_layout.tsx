import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import LucideIcon from "~/lib/icons/LucideIcon";
import { MatchListViewerProvider } from "~/src/context/MatchListViewerContext";
import { ShotVisionTabBar } from "~/components/navigation/ShotVisionTabBar";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { HEADER_ICON_HIT_SLOP } from "~/src/utils/touchA11y";
import { useTheme } from "~/theming/ThemeProvider";

function NotificationHeaderButton() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      hitSlop={HEADER_ICON_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      style={{
        marginRight: 12,
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: exploreColors.cardBg,
        borderWidth: 1,
        borderColor: exploreColors.cardBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LucideIcon name="Bell" size={20} color={theme.colors.foreground ?? exploreColors.ink} />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <MatchListViewerProvider>
      <Tabs
        tabBar={(props) => <ShotVisionTabBar {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontFamily: exploreFontFamily.black,
            fontSize: 24,
            color: theme.colors.foreground,
          },
          headerTitleAlign: "left",
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="explore"
          options={{
            headerShown: false,
            title: "Explore",
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            headerShown: false,
            title: "My Matches",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerRight: () => <NotificationHeaderButton />,
          }}
        />
      </Tabs>
    </MatchListViewerProvider>
  );
}
