import type { Match } from "../../../types/match";
import { MATCH_API_MAX_PAGE_SIZE } from "../../utils/exploreApiDebug";
import { devLog } from "../../utils/devLog";
import {
  buildMatchCalendarEvent,
  isScheduledMatchForCalendar,
  matchCalendarFingerprint,
} from "../../utils/matchCalendarEvent";
import { matchService } from "../api/matchService";
import {
  loadCalendarSyncEnabled,
  loadMatchCalendarEvents,
  saveCalendarSyncEnabled,
  saveMatchCalendarEvents,
  type PersistedMatchCalendarEvent,
} from "./matchCalendarPersistence";
import * as deviceCalendar from "./deviceCalendar";

export type MatchCalendarSyncResult =
  | { ok: true }
  | { ok: false; reason: "disabled" | "permission_denied" | "unavailable" | "invalid_match" };

async function isSyncEnabledForUser(userId: string): Promise<boolean> {
  return loadCalendarSyncEnabled(userId.trim());
}

async function ensureCalendarReady(): Promise<string | null> {
  const access = await deviceCalendar.requestCalendarAccess();
  if (access !== "granted") return null;
  return deviceCalendar.getShotVisionCalendarId();
}

/**
 * Upsert or remove a single match in the device calendar (Google Calendar via OS sync).
 */
export async function syncMatchToDeviceCalendar(
  match: Match,
  userId: string
): Promise<MatchCalendarSyncResult> {
  const uid = userId.trim();
  if (!uid) return { ok: false, reason: "unavailable" };

  const enabled = await isSyncEnabledForUser(uid);
  if (!enabled) return { ok: false, reason: "disabled" };

  const matchId = match.id?.trim();
  if (!matchId) return { ok: false, reason: "invalid_match" };

  if (!isScheduledMatchForCalendar(match)) {
    await removeMatchFromDeviceCalendar(matchId, uid);
    return { ok: true };
  }

  const payload = buildMatchCalendarEvent(match);
  if (!payload) return { ok: false, reason: "invalid_match" };

  const calendarId = await ensureCalendarReady();
  if (!calendarId) {
    return { ok: false, reason: "permission_denied" };
  }

  const fingerprint = matchCalendarFingerprint(payload);
  const map = await loadMatchCalendarEvents(uid);
  const existing = map[matchId];

  try {
    if (existing?.eventId && existing.fingerprint === fingerprint) {
      return { ok: true };
    }

    let eventId: string | undefined = existing?.eventId;

    if (eventId) {
      const updated = await deviceCalendar.updateCalendarEvent(eventId, payload);
      if (!updated) {
        await deviceCalendar.deleteCalendarEvent(eventId);
        eventId = undefined;
      }
    }

    if (!eventId) {
      const created = await deviceCalendar.createCalendarEvent(calendarId, payload);
      if (!created) return { ok: false, reason: "unavailable" };
      eventId = created;
    }

    const row: PersistedMatchCalendarEvent = {
      eventId,
      calendarId,
      fingerprint,
      updatedAt: new Date().toISOString(),
    };
    map[matchId] = row;
    await saveMatchCalendarEvents(uid, map);

    if (__DEV__) {
      devLog.info("[matchCalendar] synced", { matchId, eventId });
    }

    return { ok: true };
  } catch (err) {
    devLog.warn("[matchCalendar] sync failed:", err);
    return { ok: false, reason: "unavailable" };
  }
}

/** Remove calendar event for a deleted or non-scheduled match. */
export async function removeMatchFromDeviceCalendar(
  matchId: string,
  userId: string
): Promise<void> {
  const uid = userId.trim();
  const id = matchId.trim();
  if (!uid || !id) return;

  const map = await loadMatchCalendarEvents(uid);
  const existing = map[id];
  if (!existing?.eventId) {
    if (map[id]) {
      delete map[id];
      await saveMatchCalendarEvents(uid, map);
    }
    return;
  }

  await deviceCalendar.deleteCalendarEvent(existing.eventId);
  delete map[id];
  await saveMatchCalendarEvents(uid, map);

  if (__DEV__) {
    devLog.info("[matchCalendar] removed", { matchId: id });
  }
}

export async function fetchScheduledMatchDaysInMonth(
  userId: string,
  year: number,
  month: number
): Promise<Set<number>> {
  const uid = userId.trim();
  if (!uid) return new Set();

  const enabled = await isSyncEnabledForUser(uid);
  if (!enabled) return new Set();

  const matches = await fetchAllScheduledMatches(uid);
  const days = new Set<number>();
  for (const match of matches) {
    const start = new Date(match.matchDate);
    if (Number.isNaN(start.getTime())) continue;
    if (start.getFullYear() === year && start.getMonth() === month) {
      days.add(start.getDate());
    }
  }
  return days;
}

async function fetchAllScheduledMatches(_userId: string): Promise<Match[]> {
  const pageSize = MATCH_API_MAX_PAGE_SIZE;
  const collected: Match[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 20) {
    const response = await matchService.getMyMatches(page, pageSize, "scheduled");
    collected.push(...response.items);
    hasMore = Boolean(response.hasNext);
    page += 1;
    if (response.items.length === 0) break;
  }

  return collected;
}

/** Full reconcile: scheduled matches from API ↔ device calendar + prune stale events. */
export async function syncAllScheduledMatchesToDeviceCalendar(
  userId: string
): Promise<{ synced: number; removed: number; failed: number }> {
  const uid = userId.trim();
  const result = { synced: 0, removed: 0, failed: 0 };

  if (!uid) return result;

  const enabled = await isSyncEnabledForUser(uid);
  if (!enabled) return result;

  const access = await deviceCalendar.requestCalendarAccess();
  if (access !== "granted") return result;

  const scheduled = await fetchAllScheduledMatches(uid);
  const scheduledIds = new Set(scheduled.map((m) => m.id.trim()).filter(Boolean));

  for (const match of scheduled) {
    const syncResult = await syncMatchToDeviceCalendar(match, uid);
    if (syncResult.ok) {
      result.synced += 1;
    } else if (syncResult.reason !== "disabled") {
      result.failed += 1;
    }
  }

  const map = await loadMatchCalendarEvents(uid);
  for (const [matchId, row] of Object.entries(map)) {
    if (scheduledIds.has(matchId)) continue;
    if (row.eventId) {
      await deviceCalendar.deleteCalendarEvent(row.eventId);
      result.removed += 1;
    }
    delete map[matchId];
  }
  await saveMatchCalendarEvents(uid, map);

  return result;
}

export async function setDeviceCalendarSyncEnabled(
  userId: string,
  enabled: boolean
): Promise<MatchCalendarSyncResult> {
  const uid = userId.trim();
  if (!uid) return { ok: false, reason: "unavailable" };

  if (enabled) {
    const access = await deviceCalendar.requestCalendarAccess();
    if (access !== "granted") {
      await saveCalendarSyncEnabled(uid, false);
      return { ok: false, reason: "permission_denied" };
    }
    await saveCalendarSyncEnabled(uid, true);
    await syncAllScheduledMatchesToDeviceCalendar(uid);
    return { ok: true };
  }

  await saveCalendarSyncEnabled(uid, false);
  const map = await loadMatchCalendarEvents(uid);
  for (const row of Object.values(map)) {
    if (row.eventId) {
      await deviceCalendar.deleteCalendarEvent(row.eventId);
    }
  }
  await saveMatchCalendarEvents(uid, {});
  return { ok: true };
}

export async function hydrateMatchCalendarPreferences(userId: string): Promise<boolean> {
  return loadCalendarSyncEnabled(userId.trim());
}

/** Fire-and-forget helper for match write flows. */
export function scheduleMatchCalendarSync(match: Match, userId: string | undefined): void {
  const uid = userId?.trim();
  if (!uid) return;
  void syncMatchToDeviceCalendar(match, uid);
}

export function scheduleMatchCalendarRemoval(matchId: string, userId: string | undefined): void {
  const uid = userId?.trim();
  const id = matchId.trim();
  if (!uid || !id) return;
  void removeMatchFromDeviceCalendar(id, uid);
}
