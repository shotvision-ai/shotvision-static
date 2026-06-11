import { useMemo } from "react";
import { useTheme } from "~/theming/ThemeProvider";
import { Colors } from "~/lib/colors";

/** Brand accents — stable across light/dark (buttons, score highlights). */
export const BRAND_BLUE = Colors.primary;
export const BRAND_PURPLE = "#7c3aed";

/**
 * Central semantic colors for inline styles where NativeWind tokens are unreliable.
 * Prefer `className="text-foreground"` etc. when possible; use this hook for modals,
 * score cells, and legacy hardcoded screens.
 */
export function useAppTheming() {
  const { theme } = useTheme();
  const isDark = theme.name === "dark";

  return useMemo(() => {
    const foreground = theme.colors.foreground ?? (isDark ? "hsl(220 20% 96%)" : Colors.black);
    const muted = theme.colors.mutedForeground ?? Colors.gray[500];
    const card = theme.colors.card ?? theme.colors.background;
    const border = theme.colors.border ?? (isDark ? "hsl(222 14% 20%)" : Colors.gray[200]);
    const mutedSurface = theme.colors.muted ?? (isDark ? "hsl(222 14% 16%)" : Colors.gray[100]);
    const primary = theme.colors.primary ?? BRAND_BLUE;
    const destructive = theme.colors.destructive ?? Colors.danger;
    const onPrimary = theme.colors.primaryForeground ?? Colors.onPrimary;
    const liveCardTint =
      theme.colors.liveCardTint ?? (isDark ? "hsl(25 45% 14%)" : Colors.liveCard);
    const warning = theme.colors.warning ?? Colors.warning;
    const tertiary = theme.colors.tertiary ?? BRAND_BLUE;
    const success = theme.colors.success ?? BRAND_BLUE;

    return {
      isDark,
      theme,
      brand: { blue: BRAND_BLUE, purple: BRAND_PURPLE },
      colors: {
        foreground,
        muted,
        card,
        border,
        mutedSurface,
        primary,
        destructive,
        onPrimary,
        warning,
        tertiary,
        success,
        emptyAvatar: isDark ? mutedSurface : Colors.gray[200],
        dividerSubtle: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        liveCardTint,
        primaryMuted: isDark ? "rgba(96, 165, 250, 0.14)" : Colors.primaryLight,
        scoreText: foreground,
        modalOverlay: "rgba(0, 0, 0, 0.6)",
        playersCardBg: isDark ? "rgba(37, 99, 235, 0.12)" : "rgba(37, 99, 235, 0.04)",
        playersCardBorder: isDark ? "rgba(37, 99, 235, 0.28)" : "rgba(37, 99, 235, 0.15)",
        badge: {
          live: {
            bg: liveCardTint,
            text: warning,
            border: warning,
          },
          scheduled: {
            bg:
              theme.colors.scheduledBadgeBackground ??
              (isDark ? "hsl(221 40% 16%)" : "hsl(221 85% 96%)"),
            text: tertiary,
          },
          finished: {
            bg:
              theme.colors.finishedBadgeBackground ??
              (isDark ? "hsl(142 30% 14%)" : "hsl(142 45% 94%)"),
            text: isDark ? "#4ade80" : "#16a34a",
          },
        },
      },
    };
  }, [theme, isDark]);
}
