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
import { Platform, TouchableOpacity, View, InteractionManager } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenLoadingState } from "~/components/ui/AsyncListState";
import { useColorScheme } from "~/lib/useColorScheme";
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
import { DefaultAvatarProvider } from "../src/context/DefaultAvatarContext";

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
  const { isAuthenticated, isLoading: isAuthLoading, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const isLoadingFonts = !fontsLoaded && !fontError;

  React.useEffect(() => {
    if (fontError && typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[fonts] DM Sans failed to load; using system fonts.", fontError);
    }
  }, [fontError]);

  // Global auth redirects — single navigation path after sign-in (no duplicate replace from login.tsx).
  React.useEffect(() => {
    if (!isHydrated || isAuthLoading || !isColorSchemeLoaded) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "otp" ||
      segments[0] === "splash" ||
      segments[0] === "auth";

    if (isAuthenticated && inAuthGroup) {
      // Navigate immediately after sign-in so tabs don't mount with stale unauthenticated fetches.
      router.replace("/(tabs)/dashboard");
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      const task = InteractionManager.runAfterInteractions(() => {
        router.replace("/login");
      });
      return () => {
        if (typeof (task as { cancel?: () => void }).cancel === "function") {
          (task as { cancel: () => void }).cancel();
        }
      };
    }
  }, [
    isAuthenticated,
    isAuthLoading,
    isHydrated,
    segments,
    isColorSchemeLoaded,
    router,
  ]);

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
    if (!isHydrated) return;

    if (!isLoadingFonts) {
      void SplashScreen.hideAsync();
      return;
    }

    // Avoid an indefinite native splash if font loading stalls on device/emulator.
    const timeout = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isHydrated, isLoadingFonts]);

  if (!isColorSchemeLoaded || !isHydrated) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        style={{ backgroundColor: theme.colors.background }}
      >
        <ScreenLoadingState
          message={!isHydrated ? "Starting Shot Vision…" : "Loading Shot Vision…"}
        />
      </SafeAreaView>
    );
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
            },
            headerBackTitleVisible: false,
            headerBackVisible: true,
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
                  style={{ paddingHorizontal: 8, paddingVertical: 8, marginLeft: -4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <LucideIcon name="ChevronLeft" size={24} color={theme.colors.foreground} />
                </TouchableOpacity>
              ) : null,
            headerRight: () => null,
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
              headerShown: false,
              presentation: "modal",
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
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="edit-profile"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="edit-match/[id]"
            options={{
              headerShown: false,
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
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="help"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="terms"
            options={{
              headerShown: false,
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
              headerShown: false,
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
            name="auth"
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
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="report-process"
            options={{
              headerShown: false,
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
      <DefaultAvatarProvider>
        <ThemeProvider
          initialThemeName={isDarkColorScheme ? "dark" : "light"}
          themes={[lightTheme, darkTheme]}
        >
          <RootContent />
        </ThemeProvider>
      </DefaultAvatarProvider>
    </AuthProvider>
  );
}
