/** Explore screen design tokens (light mode). */
export const exploreColors = {
  pageBg: "#F2F3F7",
  cardBg: "#FFFFFF",
  cardBorder: "#E6E8EF",
  cardBorderHairline: "rgba(15, 15, 26, 0.06)",
  cardShadow: "#0f0f1a",
  ink: "#0f0f1a",
  muted: "#9094A8",
  scoreMuted: "#C0C3D4",
  divider: "#F2F3F7",
  coral: "#FF5C35",
  heart: "#FF3B30",
  playerA: "#FF5C35",
  playerB: "#1a1a2e",
  accent: {
    live: "#FF5C35",
    finished: "#00B27A",
    scheduled: "#5B6AF5",
    cancelled: "#9094A8",
  },
  badge: {
    publicBg: "#F2F3F7",
    publicText: "#9094A8",
    liveBg: "#FFF0EC",
    liveText: "#FF5C35",
    finishedBg: "#E6FAF4",
    finishedText: "#007A56",
    scheduledBg: "#EEEFFE",
    scheduledText: "#3A47D5",
    cancelledBg: "#F2F3F7",
    cancelledText: "#9094A8",
  },
  tabActive: "#FF5C35",
  tabInactive: "#9094A8",
  trophyGold: "#FFB800",
  completeBtnBg: "#E8FAF0",
  completeBtnText: "#00B27A",
  editBtnBg: "#F2F3F7",
  editBtnText: "#1a1a2e",
  notesBtnBg: "#FFF0EC",
} as const;

export const exploreFontFamily = {
  regular: "Inter_400Regular",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  black: "Inter_900Black",
} as const;

export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatExploreFooterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatScheduledLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (sameDay) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${time}`;
}
