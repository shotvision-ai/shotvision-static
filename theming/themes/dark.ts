import { Theme } from "../Theme";

/** Deep blue-charcoal surfaces with brand-aligned accents. */
const darkTheme: Theme = {
  name: "dark",
  colors: {
    background: "hsl(222 18% 7%)",
    foreground: "hsl(220 20% 96%)",
    card: "hsl(222 16% 12%)",
    cardForeground: "hsl(220 20% 96%)",
    popover: "hsl(222 16% 12%)",
    popoverForeground: "hsl(220 20% 96%)",
    primary: "hsl(213 94% 68%)",
    primaryForeground: "hsl(222 47% 8%)",
    secondary: "hsl(222 14% 16%)",
    secondaryForeground: "hsl(220 20% 96%)",
    tertiary: "hsl(217 91% 60%)",
    tertiaryForeground: "hsl(222 47% 8%)",
    muted: "hsl(222 14% 16%)",
    mutedForeground: "hsl(220 12% 62%)",
    accent: "hsl(222 20% 18%)",
    accentForeground: "hsl(220 20% 96%)",
    success: "hsl(213 94% 68%)",
    successForeground: "hsl(222 47% 8%)",
    warning: "hsl(25 95% 53%)",
    warningForeground: "hsl(222 47% 8%)",
    destructive: "hsl(0 72% 51%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(222 14% 20%)",
    notification: "hsl(222 14% 20%)",
    input: "hsl(222 14% 16%)",
    ring: "hsl(213 94% 68%)",
    overlay: "hsl(0 0% 100%)",
    liveCardTint: "hsl(25 45% 14%)",
    scheduledBadgeBackground: "hsl(221 40% 16%)",
    finishedBadgeBackground: "hsl(142 30% 14%)",
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

export default darkTheme;
