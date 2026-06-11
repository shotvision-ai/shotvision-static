import type { Match } from "../../../types/match";
import { AppError } from "../api/apiErrors";
import { notificationService, type MatchUpdateNotificationRequest } from "../api/notificationService";
import { devLog } from "../../utils/devLog";

type MatchUpdateReason = MatchUpdateNotificationRequest["reason"];

type NotifyMatchUpdatedInput = {
  previousMatch?: Match | null;
  nextMatch: Match;
  actorUserId?: string;
  reason: MatchUpdateReason;
};

const DEDUPE_WINDOW_MS = 10_000;
const recentNotificationKeys = new Map<string, number>();

function toLocalDateTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown time";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function collectChangedFields(previousMatch: Match | null | undefined, nextMatch: Match): string[] {
  if (!previousMatch) return ["details"];
  const changed: string[] = [];
  if (previousMatch.playerA !== nextMatch.playerA || previousMatch.playerB !== nextMatch.playerB) {
    changed.push("players");
  }
  if (previousMatch.matchDate !== nextMatch.matchDate) changed.push("schedule");
  if ((previousMatch.location ?? "") !== (nextMatch.location ?? "")) changed.push("location");
  if ((previousMatch.notes ?? "") !== (nextMatch.notes ?? "")) changed.push("notes");
  if (previousMatch.status !== nextMatch.status) changed.push("status");
  if (previousMatch.isPublic !== nextMatch.isPublic) changed.push("visibility");
  if (JSON.stringify(previousMatch.sets ?? []) !== JSON.stringify(nextMatch.sets ?? [])) {
    changed.push("score");
  }
  return changed.length > 0 ? changed : ["details"];
}

function buildMessage(nextMatch: Match, changedFields: string[], reason: MatchUpdateReason): string {
  const when = toLocalDateTimeLabel(nextMatch.matchDate);
  const where = nextMatch.location?.trim() ? ` at ${nextMatch.location.trim()}` : "";
  if (reason === "match_completed") {
    return `${nextMatch.playerA} vs ${nextMatch.playerB} was completed. Final status: ${nextMatch.status.toUpperCase()}.`;
  }
  if (reason === "match_started_live") {
    return `${nextMatch.playerA} vs ${nextMatch.playerB} is now live${where}.`;
  }
  if (reason === "match_visibility_changed") {
    return `${nextMatch.playerA} vs ${nextMatch.playerB} visibility is now ${nextMatch.isPublic ? "public" : "private"}.`;
  }
  if (reason === "match_cancelled") {
    return `${nextMatch.playerA} vs ${nextMatch.playerB} was cancelled.`;
  }
  return `${nextMatch.playerA} vs ${nextMatch.playerB} updated (${changedFields.join(", ")}) on ${when}${where}.`;
}

function buildDedupeKey(input: NotifyMatchUpdatedInput, changedFields: string[]): string {
  const actor = input.actorUserId?.trim() || "unknown";
  return [
    input.nextMatch.id,
    input.reason,
    input.nextMatch.status,
    input.nextMatch.matchDate,
    input.nextMatch.isPublic ? "public" : "private",
    changedFields.join(","),
    actor,
  ].join("|");
}

function isDispatchUnavailableError(err: unknown): boolean {
  return (
    err instanceof AppError &&
    (err.statusCode === 404 ||
      err.statusCode === 501 ||
      err.statusCode === 503 ||
      err.statusCode >= 500 ||
      err.code === "NETWORK_FAILURE" ||
      err.code === "TIMEOUT")
  );
}

/**
 * Sends a participant update notification using the existing notification API architecture.
 * This call is intentionally best-effort and non-blocking for match update UX.
 */
export async function notifyParticipantsOfMatchUpdate(input: NotifyMatchUpdatedInput): Promise<void> {
  const changedFields = collectChangedFields(input.previousMatch, input.nextMatch);
  const dedupeKey = buildDedupeKey(input, changedFields);
  const now = Date.now();
  const lastSentAt = recentNotificationKeys.get(dedupeKey);
  if (lastSentAt && now - lastSentAt < DEDUPE_WINDOW_MS) {
    return;
  }
  recentNotificationKeys.set(dedupeKey, now);

  const participantUserIds = [input.nextMatch.playerAUserId, input.nextMatch.playerBUserId]
    .filter((id): id is string => Boolean(id?.trim()))
    .filter((id) => id !== input.actorUserId);

  const payload: MatchUpdateNotificationRequest = {
    matchId: input.nextMatch.id,
    actorUserId: input.actorUserId,
    participantUserIds,
    dedupeKey,
    reason: input.reason,
    title: `Match update: ${input.nextMatch.playerA} vs ${input.nextMatch.playerB}`,
    message: buildMessage(input.nextMatch, changedFields, input.reason),
    metadata: {
      status: input.nextMatch.status,
      isPublic: input.nextMatch.isPublic,
      changedFields: changedFields.join(","),
      matchDate: input.nextMatch.matchDate,
      location: input.nextMatch.location ?? null,
    },
  };

  try {
    await notificationService.notifyMatchUpdated(payload);
  } catch (err) {
    if (__DEV__) {
      devLog.warn("[notifications] match update dispatch skipped", err);
    }
    if (!isDispatchUnavailableError(err)) {
      throw err;
    }
  }
}
