import { Theme } from "../Theme";

const darkTheme: Theme = {
  name: "dark",
  colors: {
    background: "hsl(240 10% 3.9%)",
    foreground: "hsl(0 0% 98%)",
    card: "hsl(240 6% 10%)",
    cardForeground: "hsl(0 0% 98%)",
    popover: "hsl(240 10% 3.9%)",
    popoverForeground: "hsl(0 0% 98%)",
    primary: "hsl(213 94% 68%)", // Blue-400 for dark mode
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(240 3.7% 15.9%)",
    secondaryForeground: "hsl(0 0% 98%)",
    tertiary: "hsl(217 91% 60%)", // Scheduled Blue
    tertiaryForeground: "hsl(0 0% 100%)",
    muted: "hsl(240 3.7% 15.9%)",
    mutedForeground: "hsl(240 5% 64.9%)",
    accent: "hsl(240 3.7% 15.9%)",
    accentForeground: "hsl(0 0% 98%)",
    success: "hsl(213 94% 68%)", // Blue for dark
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(25 95% 53%)", // Live - Orange
    warningForeground: "hsl(0 0% 100%)",
    destructive: "hsl(0 72% 51%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(240 3.7% 15.9%)",
    notification: "hsl(240 3.7% 15.9%)",
    input: "hsl(240 3.7% 15.9%)",
    ring: "hsl(213 94% 68%)",
    overlay: "hsl(0 0% 100%)",
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
