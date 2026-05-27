import * as SecureStore from "expo-secure-store";
import { devLog } from "../../utils/devLog";

const keyForUser = (userId: string) => `sv_reported_matches_${userId.trim()}`;

/** Confirmed report IDs (successful API) — survives list refresh when API omits `reportedByMe`. */
export async function loadPersistedReportedMatchIds(userId: string): Promise<string[]> {
  const key = keyForUser(userId);
  if (!key || key === "sv_reported_matches_") return [];
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id).trim()).filter(Boolean);
  } catch (err) {
    devLog.warn("[matchReportPersistence] load failed:", err);
    return [];
  }
}

export async function savePersistedReportedMatchIds(
  userId: string,
  matchIds: string[]
): Promise<void> {
  const key = keyForUser(userId);
  if (!key || key === "sv_reported_matches_") return;
  try {
    const unique = [...new Set(matchIds.map((id) => id.trim()).filter(Boolean))];
    await SecureStore.setItemAsync(key, JSON.stringify(unique));
  } catch (err) {
    devLog.warn("[matchReportPersistence] save failed:", err);
  }
}

export async function clearPersistedReportedMatchIds(userId: string): Promise<void> {
  const key = keyForUser(userId);
  if (!key || key === "sv_reported_matches_") return;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
