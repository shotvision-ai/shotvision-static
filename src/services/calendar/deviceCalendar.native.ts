import { Platform } from "react-native";
import { SHOT_VISION_CALENDAR_TITLE } from "../../constants/matchCalendar";
import type { MatchCalendarEventPayload } from "../../utils/matchCalendarEvent";
import { devLog } from "../../utils/devLog";

export type CalendarAccessStatus = "granted" | "denied" | "unavailable";

type ExpoCalendarModule = typeof import("expo-calendar");

let calendarModule: ExpoCalendarModule | null | undefined;

function getCalendarModule(): ExpoCalendarModule | null {
  if (calendarModule !== undefined) {
    return calendarModule;
  }

  try {
    // Lazy load so outdated dev clients without ExpoCalendar still boot.
    calendarModule = require("expo-calendar") as ExpoCalendarModule;
  } catch (err) {
    devLog.warn(
      "[deviceCalendar] expo-calendar native module unavailable — rebuild the dev client to enable calendar sync:",
      err
    );
    calendarModule = null;
  }

  return calendarModule;
}

function mapPermissionStatus(
  Calendar: ExpoCalendarModule,
  status: import("expo-calendar").PermissionStatus
): CalendarAccessStatus {
  if (status === Calendar.PermissionStatus.GRANTED) return "granted";
  if (status === Calendar.PermissionStatus.DENIED) return "denied";
  return "unavailable";
}

export async function getCalendarAccessStatus(): Promise<CalendarAccessStatus> {
  const Calendar = getCalendarModule();
  if (!Calendar) return "unavailable";

  try {
    const result = await Calendar.getCalendarPermissionsAsync();
    return mapPermissionStatus(Calendar, result.status);
  } catch (err) {
    devLog.warn("[deviceCalendar] getCalendarPermissions failed:", err);
    return "unavailable";
  }
}

export async function requestCalendarAccess(): Promise<CalendarAccessStatus> {
  const Calendar = getCalendarModule();
  if (!Calendar) return "unavailable";

  try {
    const current = await Calendar.getCalendarPermissionsAsync();
    if (current.status === Calendar.PermissionStatus.GRANTED) {
      return "granted";
    }
    const requested = await Calendar.requestCalendarPermissionsAsync();
    return mapPermissionStatus(Calendar, requested.status);
  } catch (err) {
    devLog.warn("[deviceCalendar] requestCalendarPermissions failed:", err);
    return "unavailable";
  }
}

async function resolveCalendarSource(
  Calendar: ExpoCalendarModule
): Promise<import("expo-calendar").Source | null> {
  try {
    if (Platform.OS === "ios") {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      return defaultCal.source ?? null;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find((c) => c.allowsModifications);
    return writable?.source ?? calendars[0]?.source ?? null;
  } catch (err) {
    devLog.warn("[deviceCalendar] resolveCalendarSource failed:", err);
    return null;
  }
}

export async function getShotVisionCalendarId(): Promise<string | null> {
  const Calendar = getCalendarModule();
  if (!Calendar) return null;

  const access = await getCalendarAccessStatus();
  if (access !== "granted") {
    const requested = await requestCalendarAccess();
    if (requested !== "granted") return null;
  }

  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find(
      (c) => c.title === SHOT_VISION_CALENDAR_TITLE && c.allowsModifications
    );
    if (existing?.id) return existing.id;

    const source = await resolveCalendarSource(Calendar);
    if (!source?.id) {
      devLog.warn("[deviceCalendar] no writable calendar source");
      return null;
    }

    const calendarId = await Calendar.createCalendarAsync({
      title: SHOT_VISION_CALENDAR_TITLE,
      color: "#2563eb",
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
      name: "shotvision-matches",
      ownerAccount: source.name ?? "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    return calendarId;
  } catch (err) {
    devLog.warn("[deviceCalendar] getShotVisionCalendarId failed:", err);
    return null;
  }
}

function payloadToEventInput(
  Calendar: ExpoCalendarModule,
  payload: MatchCalendarEventPayload
) {
  return {
    title: payload.title,
    startDate: payload.startDate,
    endDate: payload.endDate,
    location: payload.location,
    notes: payload.notes,
    timeZone: payload.timeZone,
    alarms: [{ relativeOffset: -60 }],
  };
}

export async function createCalendarEvent(
  calendarId: string,
  payload: MatchCalendarEventPayload
): Promise<string | null> {
  const Calendar = getCalendarModule();
  if (!Calendar) return null;

  try {
    const eventId = await Calendar.createEventAsync(
      calendarId,
      payloadToEventInput(Calendar, payload)
    );
    return eventId ?? null;
  } catch (err) {
    devLog.warn("[deviceCalendar] createEvent failed:", err);
    return null;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  payload: MatchCalendarEventPayload
): Promise<boolean> {
  const Calendar = getCalendarModule();
  if (!Calendar) return false;

  try {
    await Calendar.updateEventAsync(eventId, payloadToEventInput(Calendar, payload));
    return true;
  } catch (err) {
    devLog.warn("[deviceCalendar] updateEvent failed:", err);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const Calendar = getCalendarModule();
  if (!Calendar) return;

  try {
    await Calendar.deleteEventAsync(eventId);
  } catch (err) {
    devLog.warn("[deviceCalendar] deleteEvent failed:", err);
  }
}
