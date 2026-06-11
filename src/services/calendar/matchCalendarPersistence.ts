import * as SecureStore from "expo-secure-store";
import { devLog } from "../../utils/devLog";

export type PersistedMatchCalendarEvent = {
  eventId: string;
  calendarId: string;
  fingerprint: string;
  updatedAt: string;
};

type PersistedMap = Record<string, PersistedMatchCalendarEvent>;

const eventsKey = (userId: string) => `sv_match_cal_events_${userId.trim()}`;
const enabledKey = (userId: string) => `sv_calendar_sync_enabled_${userId.trim()}`;

function parseMap(raw: string | null): PersistedMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: PersistedMap = {};
    for (const [matchId, value] of Object.entries(parsed as Record<string, unknown>)) {
      const id = matchId.trim();
      if (!id || value == null || typeof value !== "object" || Array.isArray(value)) continue;
      const row = value as Record<string, unknown>;
      const eventId = typeof row.eventId === "string" ? row.eventId.trim() : "";
      const calendarId = typeof row.calendarId === "string" ? row.calendarId.trim() : "";
      const fingerprint = typeof row.fingerprint === "string" ? row.fingerprint : "";
      const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : "";
      if (!eventId || !calendarId) continue;
      out[id] = { eventId, calendarId, fingerprint, updatedAt };
    }
    return out;
  } catch (err) {
    devLog.warn("[matchCalendarPersistence] parse failed:", err);
    return {};
  }
}

export async function loadMatchCalendarEvents(userId: string): Promise<PersistedMap> {
  const key = eventsKey(userId);
  if (!key || key === "sv_match_cal_events_") return {};
  try {
    const raw = await SecureStore.getItemAsync(key);
    return parseMap(raw);
  } catch (err) {
    devLog.warn("[matchCalendarPersistence] load failed:", err);
    return {};
  }
}

export async function saveMatchCalendarEvents(
  userId: string,
  map: PersistedMap
): Promise<void> {
  const key = eventsKey(userId);
  if (!key || key === "sv_match_cal_events_") return;
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(map));
  } catch (err) {
    devLog.warn("[matchCalendarPersistence] save failed:", err);
  }
}

export async function loadCalendarSyncEnabled(userId: string): Promise<boolean> {
  const key = enabledKey(userId);
  if (!key || key === "sv_calendar_sync_enabled_") return false;
  try {
    const raw = await SecureStore.getItemAsync(key);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function saveCalendarSyncEnabled(userId: string, enabled: boolean): Promise<void> {
  const key = enabledKey(userId);
  if (!key || key === "sv_calendar_sync_enabled_") return;
  try {
    if (enabled) {
      await SecureStore.setItemAsync(key, "1");
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (err) {
    devLog.warn("[matchCalendarPersistence] save enabled failed:", err);
  }
}

export async function clearMatchCalendarPersistence(userId: string): Promise<void> {
  const uid = userId.trim();
  if (!uid) return;
  try {
    await SecureStore.deleteItemAsync(eventsKey(uid));
    await SecureStore.deleteItemAsync(enabledKey(uid));
  } catch (err) {
    devLog.warn("[matchCalendarPersistence] clear failed:", err);
  }
}
