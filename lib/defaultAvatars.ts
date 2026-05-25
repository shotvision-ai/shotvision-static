import type { ImageSourcePropType } from "react-native";

import type { MatchParticipantGender } from "~/types/match";

import female9 from "../assets/images/default-avatars/female/avatar-9.png";
import female10 from "../assets/images/default-avatars/female/avatar-10.png";
import female11 from "../assets/images/default-avatars/female/avatar-11.png";
import female12 from "../assets/images/default-avatars/female/avatar-12.png";
import male13 from "../assets/images/default-avatars/male/avatar-13.png";
import male14 from "../assets/images/default-avatars/male/avatar-14.png";
import male15 from "../assets/images/default-avatars/male/avatar-15.png";
import male16 from "../assets/images/default-avatars/male/avatar-16.png";

/** Built-in default picture slots. 1–8 classic (color); 9–12 female PNGs; 13–16 male PNGs. */
export const DEFAULT_AVATAR_COUNT = 16;
export const CLASSIC_AVATAR_MAX = 8;
export const FEMALE_AVATAR_MIN = 9;
export const FEMALE_AVATAR_MAX = 12;
export const MALE_AVATAR_MIN = 13;
export const MALE_AVATAR_MAX = 16;

/** Solid fills for default avatar circles (no image assets). */
export const defaultAvatarAccents: readonly string[] = [
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#c026d3",
  "#9333ea",
  "#7c3aed",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",
  "#172554",
];

export function defaultAvatarAccent(id: number): string {
  const i = clampAvatarId(id) - 1;
  return defaultAvatarAccents[i] ?? defaultAvatarAccents[0];
}

/** Raster bundle (`female/avatar-9…12.png`, `male/avatar-13…16.png`). */
const BUILT_IN_IMAGES: Partial<Record<number, ImageSourcePropType>> = {
  9: female9,
  10: female10,
  11: female11,
  12: female12,
  13: male13,
  14: male14,
  15: male15,
  16: male16,
};

export function defaultAvatarBuiltInImage(id: number): ImageSourcePropType | undefined {
  return BUILT_IN_IMAGES[clampAvatarId(id)];
}

function hashUserId(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (Math.imul(31, h) + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Stable built-in avatar id when there is no profile photo.
 * Female → 9–12; male → 13–16; unknown → classic 1–8.
 */
export function avatarIndexFromUserId(
  userId: string,
  gender?: MatchParticipantGender | null
): number {
  const h = hashUserId(userId || "x");
  if (gender === "female") {
    return (h % (FEMALE_AVATAR_MAX - FEMALE_AVATAR_MIN + 1)) + FEMALE_AVATAR_MIN;
  }
  if (gender === "male") {
    return (h % (MALE_AVATAR_MAX - MALE_AVATAR_MIN + 1)) + MALE_AVATAR_MIN;
  }
  if (!userId) return 1;
  return (h % CLASSIC_AVATAR_MAX) + 1;
}

export function clampAvatarId(id: number): number {
  if (!Number.isFinite(id)) return 1;
  return Math.min(DEFAULT_AVATAR_COUNT, Math.max(1, Math.floor(id)));
}
