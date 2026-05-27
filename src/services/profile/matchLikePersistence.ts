import * as SecureStore from "expo-secure-store";
import type { MatchLikeSnapshot } from "../../stores/matchLikeStore";
import { devLog } from "../../utils/devLog";

const keyForUser = (userId: string) => `sv_match_likes_${userId.trim()}`;

type PersistedLikeMap = Record<string, MatchLikeSnapshot>;

function parsePersisted(raw: string | null): PersistedLikeMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: PersistedLikeMap = {};
    for (const [matchId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const id = matchId.trim();
      if (!id || value == null || typeof value !== "object" || Array.isArray(value)) continue;
      const row = value as Record<string, unknown>;
      const likesCount = row.likesCount;
      const isLiked = row.isLiked;
      if (typeof likesCount !== "number" || Number.isNaN(likesCount)) continue;
      out[id] = {
        likesCount: Math.max(0, likesCount),
        isLiked: Boolean(isLiked),
      };
    }
    return out;
  } catch (err) {
    devLog.warn("[matchLikePersistence] parse failed:", err);
    return {};
  }
}

/** Viewer like snapshots — survives refresh when explore omits `likedByMe`. */
export async function loadPersistedMatchLikes(userId: string): Promise<PersistedLikeMap> {
  const key = keyForUser(userId);
  if (!key || key === "sv_match_likes_") return {};
  try {
    const raw = await SecureStore.getItemAsync(key);
    return parsePersisted(raw);
  } catch (err) {
    devLog.warn("[matchLikePersistence] load failed:", err);
    return {};
  }
}

export async function savePersistedMatchLikes(
  userId: string,
  snapshots: PersistedLikeMap
): Promise<void> {
  const key = keyForUser(userId);
  if (!key || key === "sv_match_likes_") return;
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(snapshots));
  } catch (err) {
    devLog.warn("[matchLikePersistence] save failed:", err);
  }
}

export async function clearPersistedMatchLikes(userId: string): Promise<void> {
  const key = keyForUser(userId);
  if (!key || key === "sv_match_likes_") return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
