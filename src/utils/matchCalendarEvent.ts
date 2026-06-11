import type { Match } from "../../types/match";
import {
  MATCH_CALENDAR_DEEP_LINK_BASE,
  MATCH_CALENDAR_DURATION_MINUTES,
} from "../constants/matchCalendar";

export type MatchCalendarEventPayload = {
  matchId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  timeZone: string;
};

export function resolveDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Parse API `matchDate` (ISO-8601) into local start/end for the device calendar. */
export function matchCalendarWindow(matchDateIso: string): { startDate: Date; endDate: Date } {
  const startDate = new Date(matchDateIso);
  const endDate = new Date(startDate.getTime() + MATCH_CALENDAR_DURATION_MINUTES * 60 * 1000);
  return { startDate, endDate };
}

export function buildMatchCalendarEvent(match: Match): MatchCalendarEventPayload | null {
  if (match.status !== "scheduled") return null;

  const matchId = match.id?.trim();
  if (!matchId) return null;

  const { startDate, endDate } = matchCalendarWindow(match.matchDate);
  if (Number.isNaN(startDate.getTime())) return null;

  const title = `Tennis: ${match.playerA.trim()} vs ${match.playerB.trim()}`;
  const location = match.location?.trim() || undefined;
  const noteLines = [
    "Scheduled match on Shot Vision",
    `${MATCH_CALENDAR_DEEP_LINK_BASE}/${matchId}`,
  ];
  if (match.notes?.trim()) {
    noteLines.push("", match.notes.trim());
  }

  return {
    matchId,
    title,
    startDate,
    endDate,
    location,
    notes: noteLines.join("\n"),
    timeZone: resolveDeviceTimeZone(),
  };
}

export function matchCalendarFingerprint(payload: MatchCalendarEventPayload): string {
  return JSON.stringify({
    title: payload.title,
    start: payload.startDate.toISOString(),
    end: payload.endDate.toISOString(),
    location: payload.location ?? "",
    notes: payload.notes ?? "",
    timeZone: payload.timeZone,
  });
}

export function isScheduledMatchForCalendar(match: Pick<Match, "status">): boolean {
  return match.status === "scheduled";
}
