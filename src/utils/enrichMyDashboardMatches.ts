import type { Match } from "../../types/match";
import { resolveMatchLifecycleFields } from "./matchEditEligibility";

/**
 * GET `/api/matches/my` omits `creatorId`, `finishedAt`, and `notes`.
 * Enrich list rows so ownership, visibility, and 48h edit eligibility match detail/edit flows.
 * Do not infer `finishedAt` from `createdAt` — that breaks the edit window for old creates.
 */
export function enrichMyDashboardMatches(items: Match[], viewerUserId: string | undefined): Match[] {
  if (!viewerUserId) return items;
  return items.map((m) => {
    const withCreator = m.creatorId?.trim()
      ? m
      : { ...m, creatorId: viewerUserId };
    return resolveMatchLifecycleFields(withCreator);
  });
}
