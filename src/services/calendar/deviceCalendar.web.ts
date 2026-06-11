import type { MatchCalendarEventPayload } from "../../utils/matchCalendarEvent";

export type CalendarAccessStatus = "granted" | "denied" | "unavailable";

export async function getCalendarAccessStatus(): Promise<CalendarAccessStatus> {
  return "unavailable";
}

export async function requestCalendarAccess(): Promise<CalendarAccessStatus> {
  return "unavailable";
}

export async function getShotVisionCalendarId(): Promise<string | null> {
  return null;
}

export async function createCalendarEvent(
  _calendarId: string,
  _payload: MatchCalendarEventPayload
): Promise<string | null> {
  return null;
}

export async function updateCalendarEvent(
  _eventId: string,
  _payload: MatchCalendarEventPayload
): Promise<boolean> {
  return false;
}

export async function deleteCalendarEvent(_eventId: string): Promise<void> {
  // Web preview: no device calendar.
}
