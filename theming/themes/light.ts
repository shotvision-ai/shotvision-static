import { Theme } from "../Theme";

/** Cool blue-gray canvas with soft elevated surfaces (no pure white chrome). */
const lightTheme: Theme = {
  name: "light",
  colors: {
    background: "hsl(220 42% 96%)",
    foreground: "hsl(222 47% 11%)",
    card: "hsl(220 35% 99%)",
    cardForeground: "hsl(222 47% 11%)",
    popover: "hsl(220 35% 99%)",
    popoverForeground: "hsl(222 47% 11%)",
    primary: "hsl(221 83% 53%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(220 32% 93%)",
    secondaryForeground: "hsl(222 47% 11%)",
    tertiary: "hsl(217 91% 60%)",
    tertiaryForeground: "hsl(0 0% 100%)",
    muted: "hsl(220 28% 91%)",
    mutedForeground: "hsl(220 12% 42%)",
    accent: "hsl(221 55% 94%)",
    accentForeground: "hsl(222 47% 11%)",
    success: "hsl(221 83% 53%)",
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(25 95% 53%)",
    warningForeground: "hsl(0 0% 100%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(220 24% 88%)",
    notification: "hsl(220 24% 88%)",
    input: "hsl(220 28% 91%)",
    ring: "hsl(221 83% 53%)",
    overlay: "hsl(0 0% 0%)",
    liveCardTint: "hsl(32 100% 96%)",
    scheduledBadgeBackground: "hsl(221 85% 96%)",
    finishedBadgeBackground: "hsl(142 45% 94%)",
  },
  typography: {
    h1: {
      fontSize: "28px",
      fontFamily: "DMSans_700Bold",
    },
    h2: {
      fontSize: "22px",
      fontFamily: "DMSans_700Bold",
    },
    h3: {
      fontSize: "18px",
      fontFamily: "DMSans_600SemiBold",
    },
    h4: {
      fontSize: "16px",
      fontFamily: "DMSans_600SemiBold",
    },
    h5: {
      fontSize: "15px",
      fontFamily: "DMSans_500Medium",
    },
    h6: {
      fontSize: "14px",
      fontFamily: "DMSans_500Medium",
    },
    body: {
      fontSize: "15px",
      fontFamily: "DMSans_400Regular",
    },
    caption: {
      fontSize: "13px",
      fontFamily: "DMSans_400Regular",
    },
    button: {
      fontSize: "15px",
      fontFamily: "DMSans_500Medium",
    },
  },
};

export default lightTheme;
