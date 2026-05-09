import { Theme } from "../Theme";

const lightTheme: Theme = {
  name: "light",
  colors: {
    background: "hsl(220 60% 98%)",
    foreground: "hsl(222 47% 11%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(240 10% 3.9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(240 10% 3.9%)",
    primary: "hsl(221 83% 53%)", // Blue-600
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(240 4.8% 95.9%)",
    secondaryForeground: "hsl(240 5.9% 10%)",
    tertiary: "hsl(217 91% 60%)", // Scheduled Blue
    tertiaryForeground: "hsl(0 0% 100%)",
    muted: "hsl(240 4.8% 95.9%)",
    mutedForeground: "hsl(240 3.8% 46.1%)",
    accent: "hsl(240 4.8% 95.9%)",
    accentForeground: "hsl(240 5.9% 10%)",
    success: "hsl(221 83% 53%)", // Blue - Completed
    successForeground: "hsl(0 0% 100%)",
    warning: "hsl(25 95% 53%)", // Live - Orange
    warningForeground: "hsl(0 0% 100%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(240 5.9% 90%)",
    notification: "hsl(240 5.9% 90%)",
    input: "hsl(240 5.9% 90%)",
    ring: "hsl(221 83% 53%)",
    overlay: "hsl(0 0% 0%)",
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
