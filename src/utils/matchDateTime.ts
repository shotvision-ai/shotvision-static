/**
 * Merges a calendar date with an "HH:MM" time for API `matchDate` (ISO-8601).
 */
export function combineMatchDateAndTime(date: Date, timeHHmm: string): Date {
  const result = new Date(date);
  const parts = timeHHmm.trim().split(":");
  const hours = parseInt(parts[0] ?? "", 10);
  const minutes = parseInt(parts[1] ?? "", 10);
  if (!Number.isNaN(hours) && hours >= 0 && hours < 24) {
    result.setHours(hours, Number.isNaN(minutes) ? 0 : Math.min(59, Math.max(0, minutes)), 0, 0);
  }
  return result;
}
