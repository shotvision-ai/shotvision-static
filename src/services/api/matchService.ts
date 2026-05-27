import { apiClient } from "./apiClient";
import { Match } from "../../../types/match";
import { toApiMatchWritePayload, type MatchWritePayloadOptions } from "./matchPayload";
import { normalizeMatch, normalizeMatchList, normalizeExploreMatchList } from "./matchMapper";
import { normalizeLikeResponse } from "../../utils/matchLike";
import { setsForMatchWrite } from "../../utils/matchSetsPayload";
import { AppError } from "./apiErrors";
import { normalizePaginatedResponse, type PaginatedResponse } from "./pagination";
import { devLog } from "../../utils/devLog";
import type {
  FinishMatchResponse,
  LikeMatchResponse,
  MatchShareResponse,
  MatchStatus,
} from "./contracts";

export type { PaginatedResponse };

export type MatchStatusFilter = "live" | "scheduled" | "completed" | "all";

export interface CreateMatchInput {
  playerA: string;
  playerB: string;
  matchDate: string;
  location?: string;
  isPublic: boolean;
  status: "live" | "scheduled" | "completed";
  sets: { playerAScore: number; playerBScore: number }[];
  notes?: string;
}

export interface UpdateMatchInput extends Partial<CreateMatchInput> {}

function toApiStatusFilter(status: MatchStatusFilter): MatchStatus | undefined {
  if (status === "all") return undefined;
  if (status === "scheduled") return "SCHEDULED";
  if (status === "completed") return "FINISHED";
  return "LIVE";
}

function filterMatchesByStatus(matches: Match[], status: MatchStatusFilter): Match[] {
  if (status === "all") return matches;
  return matches.filter((m) => m.status === status);
}

/**
 * matchService — match CRUD, explore feed, likes, finish, and share per API_CONTRACTS.md.
 */
export const matchService = {
  async getMyMatches(
    page: number = 1,
    limit: number = 10,
    status: MatchStatusFilter = "all"
  ): Promise<PaginatedResponse<Match>> {
    const params: Record<string, string> = {
      page: String(Math.max(0, page - 1)),
      size: String(limit),
    };

    const apiStatus = toApiStatusFilter(status);
    if (apiStatus) {
      params.status = apiStatus;
    }

    const raw = await apiClient.get<unknown>("/api/matches/my", { params });
    const paged = normalizePaginatedResponse<unknown>(raw, limit);
    return { ...paged, items: normalizeMatchList(paged.items as unknown[]) };
  },

  /**
   * Explore feed — contract supports only `page` and `size` (no server-side status filter).
   * Status filter is applied client-side after mapping (see docs/EXPLORE_FILTERING.md).
   *
   * Limitations: `hasNext` / `totalElements` refer to the unfiltered feed; filtered tabs may
   * return fewer than `size` items per request. UI should allow load-more when empty + hasNext.
   */
  async getExploreMatches(
    page: number = 1,
    limit: number = 10,
    status: MatchStatusFilter = "all"
  ): Promise<PaginatedResponse<Match>> {
    const startPage = Math.max(1, page);
    const targetSize = Math.max(1, limit);
    const maxScanPages = status === "all" ? 1 : 6;

    let currentPage = startPage;
    let scanned = 0;
    let hasNext = true;
    let total = 0;
    let totalPages = 0;
    let lastPage = startPage;
    const collected: Match[] = [];

    while (hasNext && scanned < maxScanPages && collected.length < targetSize) {
      const params: Record<string, string> = {
        page: String(currentPage - 1),
        size: String(targetSize),
      };
      const raw = await apiClient.get<unknown>("/api/matches/explore", { params });
      const paged = normalizePaginatedResponse<unknown>(raw, targetSize);
      const mapped = normalizeExploreMatchList(paged.items as unknown[]);
      const filtered = filterMatchesByStatus(mapped, status);

      collected.push(...filtered);
      hasNext =
        typeof paged.hasNext === "boolean" ? paged.hasNext : paged.page < paged.totalPages;
      total = paged.total;
      totalPages = paged.totalPages;
      lastPage = paged.page;
      currentPage = paged.page + 1;
      scanned += 1;

      if (__DEV__) {
        devLog.info(
          `[explore:get] reqPage=${paged.page} raw=${paged.items.length} mapped=${mapped.length} filtered(${status})=${filtered.length} collected=${collected.length} hasNext=${hasNext}`
        );
      }
    }

    return {
      items: collected.slice(0, targetSize),
      page: lastPage,
      totalPages,
      total,
      limit: targetSize,
      hasNext,
    };
  },

  async getMatchDetails(id: string): Promise<Match> {
    const raw = await apiClient.get<unknown>(`/api/matches/${id}`);
    return normalizeMatch(raw);
  },

  async createMatch(data: CreateMatchInput): Promise<Match> {
    const payload = toApiMatchWritePayload(data, { forCreate: true });
    if (__DEV__) {
      devLog.info("[match:create] payload", {
        status: payload.status,
        isPublic: payload.isPublic,
      });
    }
    const raw = await apiClient.post<unknown>("/api/matches", payload);
    const created = normalizeMatch(raw);
    if (__DEV__) {
      devLog.info("[match:create] response", {
        id: created.id,
        status: created.status,
        isPublic: created.isPublic,
      });
    }
    return created;
  },

  async updateMatch(
    id: string,
    data: UpdateMatchInput,
    options?: MatchWritePayloadOptions
  ): Promise<Match> {
    const raw = await apiClient.patch<unknown>(
      `/api/matches/${id}`,
      toApiMatchWritePayload(data, options)
    );
    return normalizeMatch(raw);
  },

  async deleteMatch(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/matches/${id}`);
  },

  async finishMatch(id: string): Promise<FinishMatchResponse> {
    return await apiClient.post<FinishMatchResponse>(`/api/matches/${id}/finish`, {});
  },

  /**
   * Saves scores/fields, transitions to LIVE if needed, then POST `/finish`.
   * Returns authoritative match details after completion.
   */
  async completeMatch(id: string, data: UpdateMatchInput): Promise<Match> {
    const matchId = id.trim();
    if (!matchId || matchId.startsWith("match-")) {
      throw new AppError("Invalid match id for completion.", 400, "INVALID_MATCH_ID");
    }
    const livePayload: UpdateMatchInput = {
      ...data,
      status: "live",
      sets:
        data.sets !== undefined ? setsForMatchWrite(data.sets, "live") : data.sets,
    };
    await this.updateMatch(matchId, livePayload);
    await this.finishMatch(matchId);
    return this.getMatchDetails(matchId);
  },

  /** SCHEDULED → LIVE (scores optional; backend rejects sets on SCHEDULED only). */
  async startLiveMatch(id: string, data: UpdateMatchInput): Promise<Match> {
    const matchId = id.trim();
    if (!matchId || matchId.startsWith("match-")) {
      throw new AppError("Invalid match id.", 400, "INVALID_MATCH_ID");
    }
    const livePayload: UpdateMatchInput = {
      ...data,
      status: "live",
      sets:
        data.sets !== undefined ? setsForMatchWrite(data.sets, "live") : data.sets,
    };
    return this.updateMatch(matchId, livePayload);
  },

  async getMatchShare(id: string): Promise<MatchShareResponse> {
    return await apiClient.get<MatchShareResponse>(`/api/matches/${id}/share`);
  },

  async likeMatch(id: string): Promise<LikeMatchResponse> {
    const matchId = id.trim();
    if (!matchId || matchId.startsWith("match-")) {
      throw new AppError("Invalid match id for like.", 400, "INVALID_MATCH_ID");
    }
    devLog.info("[like:api] POST /api/matches/{id}/like", { matchId });
    const raw = await apiClient.post<unknown>(`/api/matches/${matchId}/like`, {});
    const result = normalizeLikeResponse(raw, matchId);
    devLog.info("[like:api] POST response", {
      matchId,
      likesCount: result.likesCount,
      likedByMe: result.likedByMe,
    });
    return result;
  },

  async unlikeMatch(id: string): Promise<LikeMatchResponse> {
    const matchId = id.trim();
    if (!matchId || matchId.startsWith("match-")) {
      throw new AppError("Invalid match id for unlike.", 400, "INVALID_MATCH_ID");
    }
    devLog.info("[like:api] DELETE /api/matches/{id}/like", { matchId });
    const raw = await apiClient.delete<unknown>(`/api/matches/${matchId}/like`);
    const result = normalizeLikeResponse(raw, matchId);
    devLog.info("[like:api] DELETE response", {
      matchId,
      likesCount: result.likesCount,
      likedByMe: result.likedByMe,
    });
    return result;
  },
};
