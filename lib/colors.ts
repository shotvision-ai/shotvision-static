/**
 * Shot Vision — Central Color Palette
 *
 * Change these values to update the color theme app-wide.
 * Every screen and component should import colors from here
 * instead of using hardcoded hex strings.
 */
export const Colors = {
  // ── Brand ──────────────────────────────────────────────
  primary: "#2563eb", // Main blue (buttons, links, highlights)
  primaryLight: "rgba(37,99,235,0.1)", // Tinted background for primary elements
  primaryBorder: "rgba(37,99,235,0.25)", // Border using primary color

  // ── Semantic ───────────────────────────────────────────
  success: "#22c55e", // Green (winner badges, completed actions)
  warning: "#f59e0b", // Amber (live badges, notes)
  danger: "#dc2626", // Red (delete actions, errors, reports)

  // ── Neutrals ───────────────────────────────────────────
  white: "#ffffff",
  black: "#1f2937",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
  },

  // ── App-specific ───────────────────────────────────────
  liveCard: "#FFF4E5", // Background for live match cards (light)
  winnerGold: "#FFD700", // Trophy / winner highlight
} as const;

export type AppColors = typeof Colors;
