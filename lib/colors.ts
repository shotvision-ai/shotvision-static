/**
 * Shot Vision — semantic palette (hex for inline RN styles).
 * Prefer theme tokens (`bg-background`, `useTheme`, `useAppTheming`) in new code.
 */
export const Colors = {
  // ── Brand ──────────────────────────────────────────────
  primary: "#2563eb",
  primaryLight: "rgba(37,99,235,0.1)",
  primaryBorder: "rgba(37,99,235,0.25)",

  // ── Semantic ───────────────────────────────────────────
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#dc2626",

  // ── Surfaces (aligned with theming/themes/light.ts) ────
  /** App canvas — cool blue-gray, not pure white. */
  canvas: "#eff4f9",
  /** Elevated cards / sheets. */
  surface: "#fafcfe",
  /** Text/icons on primary buttons and filled chips. */
  onPrimary: "#ffffff",

  // ── Neutrals ───────────────────────────────────────────
  black: "#1f2937",
  gray: {
    50: "#eff4f9",
    100: "#e8eef5",
    200: "#d5dee9",
    300: "#b8c4d4",
    400: "#8b98a8",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
  },

  // ── App-specific ───────────────────────────────────────
  liveCard: "#fff7ed",
  winnerGold: "#FFD700",
} as const;

export type AppColors = typeof Colors;
