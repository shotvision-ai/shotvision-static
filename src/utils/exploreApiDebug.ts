import type { Match } from "../../types/match";
import type { PaginatedResponse } from "../services/api/pagination";
import { devLog } from "./devLog";

/** API_CONTRACTS.md — `size` query param max for paginated match lists. */
export const MATCH_API_MAX_PAGE_SIZE = 50;

export function clampMatchApiPageSize(limit: number): number {
  return Math.min(Math.max(1, limit), MATCH_API_MAX_PAGE_SIZE);
}

type ExploreRawPageMeta = {
  requestPage: number;
  requestSize: number;
  raw: unknown;
};

/** Dev-only structured log for GET `/api/matches/explore` (no tokens). */
export function logExploreApiResponse(
  meta: ExploreRawPageMeta,
  paged: PaginatedResponse<unknown>,
  mapped: Match[],
  filtered: Match[],
  statusFilter: string
): void {
  if (!__DEV__) return;

  const rawItems = Array.isArray((meta.raw as { items?: unknown })?.items)
    ? ((meta.raw as { items: unknown[] }).items ?? [])
    : [];

  const firstRaw =
    rawItems.length > 0 && typeof rawItems[0] === "object" && rawItems[0] !== null
      ? (rawItems[0] as Record<string, unknown>)
      : null;

  devLog.info("[explore:api] GET /api/matches/explore response", {
    request: { page: meta.requestPage, size: meta.requestSize, statusFilter },
    pagination: {
      page: paged.page,
      limit: paged.limit,
      total: paged.total,
      totalPages: paged.totalPages,
      hasNext: paged.hasNext,
    },
    counts: {
      rawItems: rawItems.length,
      mapped: mapped.length,
      afterStatusFilter: filtered.length,
    },
    sampleRawItemKeys: firstRaw ? Object.keys(firstRaw).join(",") : "(empty)",
    sampleRawItem: firstRaw
      ? {
          matchId: firstRaw.matchId ?? firstRaw.id,
          status: firstRaw.status,
          player1Name: firstRaw.player1Name ?? firstRaw.playerA,
          player2Name: firstRaw.player2Name ?? firstRaw.playerB,
          likesCount: firstRaw.likesCount ?? firstRaw.likes_count,
        }
      : null,
    mappedRows: mapped.slice(0, 8).map((m) => ({
      id: m.id,
      status: m.status,
      playerA: m.playerA,
      playerB: m.playerB,
      likesCount: m.likesCount,
    })),
  });
}
