import { useMemo } from "react";
import { useTheme } from "~/theming/ThemeProvider";

/** Brand accents — stable across light/dark (buttons, score highlights). */
export const BRAND_BLUE = "#2563eb";
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
    const foreground = theme.colors.foreground ?? (isDark ? "hsl(0 0% 98%)" : "#1f2937");
    const muted = theme.colors.mutedForeground ?? (isDark ? "hsl(240 5% 64.9%)" : "#6b7280");
    const card = theme.colors.card ?? theme.colors.background;
    const border = theme.colors.border ?? (isDark ? "hsl(240 3.7% 15.9%)" : "#e5e7eb");
    const mutedSurface = theme.colors.muted ?? (isDark ? "hsl(240 3.7% 15.9%)" : "#f9fafb");
    const primary = theme.colors.primary ?? BRAND_BLUE;
    const destructive = theme.colors.destructive ?? "#dc2626";

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
        onPrimary: "#ffffff",
        emptyAvatar: isDark ? mutedSurface : "#e5e7eb",
        dividerSubtle: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        liveCardTint: isDark ? "rgba(251, 146, 60, 0.12)" : "#FFF4E5",
        scoreText: foreground,
        modalOverlay: "rgba(0, 0, 0, 0.6)",
        playersCardBg: isDark ? "rgba(37, 99, 235, 0.12)" : "rgba(37, 99, 235, 0.04)",
        playersCardBorder: isDark ? "rgba(37, 99, 235, 0.28)" : "rgba(37, 99, 235, 0.15)",
      },
    };
  }, [theme, isDark]);
}
