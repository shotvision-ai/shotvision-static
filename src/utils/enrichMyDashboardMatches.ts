import type { Match } from "../../types/match";

import { getMatchOwnershipSnapshot } from "../stores/matchOwnershipStore";

/**
 * GET `/api/matches/my` omits `creatorId`, `finishedAt`, and `notes`.
 * Enrich list rows so ownership and visibility checks work on the dashboard.
 * Do not infer `finishedAt` from `createdAt` — that breaks the 48h edit window for matches
 * created long before they were finished.
 */
export function enrichMyDashboardMatches(items: Match[], viewerUserId: string | undefined): Match[] {
  if (!viewerUserId) return items;
  return items.map((m) => {
    const snap = getMatchOwnershipSnapshot(m.id);
    const creatorId = m.creatorId?.trim() || snap?.creatorId || viewerUserId;
    const finishedAt = m.finishedAt ?? snap?.finishedAt;
    return {
      ...m,
      creatorId,
      ...(finishedAt !== undefined ? { finishedAt } : {}),
    };
  });
}
