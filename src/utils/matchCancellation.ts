import type { Match } from "../../types/match";

export const MATCH_CANCELLATION_REASONS = [
  "Rain",
  "Player unavailable",
  "Court unavailable",
  "Other",
] as const;

export type MatchCancellationReason = (typeof MATCH_CANCELLATION_REASONS)[number];

const CANCELLATION_REASON_PREFIX = "[CANCELLATION_REASON]";

export function buildCancellationNotes(
  reason: MatchCancellationReason,
  existingNotes?: string
): string {
  const cleanExisting = (existingNotes ?? "")
    .split("\n")
    .filter((line) => !line.startsWith(CANCELLATION_REASON_PREFIX))
    .join("\n")
    .trim();

  return `${CANCELLATION_REASON_PREFIX} ${reason}${cleanExisting ? `\n${cleanExisting}` : ""}`;
}

export function extractCancellationReason(match: Pick<Match, "cancellationReason" | "notes">): string | null {
  if (match.cancellationReason?.trim()) return match.cancellationReason.trim();
  const lines = (match.notes ?? "").split("\n");
  const tagged = lines.find((line) => line.startsWith(CANCELLATION_REASON_PREFIX));
  if (!tagged) return null;
  return tagged.replace(CANCELLATION_REASON_PREFIX, "").trim() || null;
}
