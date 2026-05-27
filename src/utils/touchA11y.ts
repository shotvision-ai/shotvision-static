import type { Insets } from "react-native";

/** WCAG-inspired minimum touch target (dp). */
export const MIN_TOUCH_TARGET = 44;

/** Expand small icon-only controls to ~44pt without changing layout. */
export const STANDARD_HIT_SLOP: Insets = { top: 10, bottom: 10, left: 10, right: 10 };

/** Icon buttons in dense headers (back, bell, share). */
export const HEADER_ICON_HIT_SLOP: Insets = { top: 12, bottom: 12, left: 12, right: 12 };
