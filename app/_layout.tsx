import "~/global.css";
import "~/appearance-polyfill";

import {
  Theme as NavigationTheme,
  ThemeProvider as NavigationThemeProvider,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Platform, TouchableOpacity, View, StatusBar as RNStatusBar, InteractionManager } from "react-native";
import { useColorScheme } from "~/lib/useColorScheme";
import { ThemeToggle } from "~/components/ThemeToggle";
import { ThemeProvider, useTheme } from "~/theming/ThemeProvider";
import darkTheme from "~/theming/themes/dark";
import lightTheme from "~/theming/themes/light";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { PortalHost } from "@rn-primitives/portal";
import { WebPortalContext } from "~/components/WebPortalContext";
import * as SplashScreen from "expo-splash-screen";
import LucideIcon from "~/lib/icons/LucideIcon";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

SplashScreen.preventAutoHideAsync();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

function RootContent() {
  const hasMounted = React.useRef(false);
  const [portalContainer, setPortalContainer] = React.useState<View | null>(null);
  const { isDarkColorScheme } = useColorScheme();
  const { theme, setTheme } = useTheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const isLoadingFonts = !fontsLoaded && !fontError;

  // Global authentication redirect logic (defer until navigator is ready to avoid REPLACE errors)
  React.useEffect(() => {
    if (isAuthLoading || !isColorSchemeLoaded || isLoadingFonts) return;

    const task = InteractionManager.runAfterInteractions(() => {
      const inAuthGroup =
        segments[0] === "login" || segments[0] === "otp" || segments[0] === "splash";

      if (!isAuthenticated && !inAuthGroup) {
        router.replace("/login");
      } else if (isAuthenticated && inAuthGroup) {
        router.replace("/(tabs)/dashboard");
      }
    });

    return () => {
      if (typeof (task as { cancel?: () => void }).cancel === "function") {
        (task as { cancel: () => void }).cancel();
      }
    };
  }, [isAuthenticated, isAuthLoading, segments, isColorSchemeLoaded, isLoadingFonts, router]);

  const navigationTheme: NavigationTheme = React.useMemo(() => {
    const navigationThemeBase = isDarkColorScheme ? NavigationDarkTheme : NavigationDefaultTheme;
    const baseColors = navigationThemeBase.colors;
    return {
      ...navigationThemeBase,
      colors: {
        ...baseColors,
        background: theme.colors.background ?? baseColors.background,
        border: theme.colors.border ?? baseColors.border,
        card: theme.colors.card ?? baseColors.card,
        notification: theme.colors.destructive ?? baseColors.notification,
        primary: theme.colors.primary ?? baseColors.primary,
        text: theme.colors.foreground ?? baseColors.text,
      },
    };
  }, [theme, isDarkColorScheme]);

  React.useEffect(() => {
    if (isDarkColorScheme && theme.name !== "dark") {
      setTheme("dark");
    }
    if (!isDarkColorScheme && theme.name !== "light") {
      setTheme("light");
    }
  }, [isDarkColorScheme]);

  React.useEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      // Adds the background color to the html element to prevent white background on overscroll.
      // eslint-disable-next-line no-undef
      document.documentElement.classList.add("bg-background");
    }
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  React.useEffect(() => {
    if (!isLoadingFonts) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingFonts]);

  if (!isColorSchemeLoaded || isLoadingFonts) {
    return null;
  }

  return (
    <WebPortalContext.Provider
      value={{ container: portalContainer as unknown as HTMLElement | null }}
    >
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
        <Stack
          screenOptions={({ navigation }) => ({
            headerStyle: {
              backgroundColor: theme.colors.background,
              borderBottomColor: theme.colors.border,
              borderBottomWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: theme.colors.foreground,
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontFamily: theme.typography.h2?.fontFamily,
              fontSize: 22,
              ...(Platform.OS === "android" ? { marginTop: 20 } : {}),
            },
            headerBackTitleVisible: false,
            headerBackVisible: true,
            headerStatusBarHeight: Platform.OS === "android" ? 54 : undefined,
            headerLeft: ({ canGoBack }) =>
              canGoBack ? (
                <TouchableOpacity
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                      return;
                    }
                    navigation.navigate("(tabs)" as never);
                  }}
                  style={{ 
                    paddingHorizontal: 4, 
                    paddingVertical: 4,
                    ...(Platform.OS === "android" ? { marginTop: 20 } : {}),
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <LucideIcon name="ChevronLeft" size={22} color={theme.colors.foreground} />
                </TouchableOpacity>
              ) : null,
            headerRight: () => (
              <View style={{ paddingRight: 16, ...(Platform.OS === "android" ? { marginTop: 20 } : {}) }}>
                {/* Placeholder for right actions if needed */}
              </View>
            ),
          })}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create-match"
            options={{
              title: "Create Match",
              presentation: "modal",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="match/[id]"
            options={{
              title: "Match Details",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: "Settings",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              title: "Edit Profile",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="edit-match/[id]"
            options={{
              title: "Edit Match",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="faq"
            options={{
              title: "FAQs",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="feedback"
            options={{
              title: "Send Feedback",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="help"
            options={{
              title: "Get Help",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="terms"
            options={{
              title: "Terms of Service",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="privacy"
            options={{
              title: "Privacy Policy",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="notifications"
            options={{
              title: "Notifications",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="splash"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="otp"
            options={{
              title: "Verify OTP",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="data-deletion"
            options={{
              title: "Data Deletion",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="report-process"
            options={{
              title: "Report a Match",
              headerBackVisible: true,
            }}
          />
        </Stack>
        {
          // View used as a portal container on web
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
            }}
            ref={setPortalContainer}
          />
        }
        {
          // PortalHost used as a portal container on native
          <PortalHost />
        }
      </NavigationThemeProvider>
    </WebPortalContext.Provider>
  );
}

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider
        initialThemeName={isDarkColorScheme ? "dark" : "light"}
        themes={[lightTheme, darkTheme]}
      >
        <RootContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
