import { Pressable, View } from "react-native";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useColorScheme } from "~/lib/useColorScheme";
import { useTheme } from "~/theming/ThemeProvider";
import { HEADER_ICON_HIT_SLOP } from "~/src/utils/touchA11y";

export function ThemeToggle() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme();
  const { theme } = useTheme();

  function toggleColorScheme() {
    const newColorScheme = isDarkColorScheme ? "light" : "dark";
    setColorScheme(newColorScheme);
    setAndroidNavigationBar(newColorScheme, theme.colors.background ?? "");
  }

  return (
    <Pressable
      onPress={toggleColorScheme}
      hitSlop={HEADER_ICON_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={isDarkColorScheme ? "Switch to light mode" : "Switch to dark mode"}
      className="active:opacity-70 web:ring-offset-background web:transition-colors web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2"
    >
      <View className="aspect-square flex-1 items-start justify-center pt-0.5 web:px-5">
        {isDarkColorScheme ? (
          <LucideIcon name="MoonStar" className="text-foreground" size={23} strokeWidth={1.25} />
        ) : (
          <LucideIcon name="Sun" className="text-foreground" size={24} strokeWidth={1.25} />
        )}
      </View>
    </Pressable>
  );
}
