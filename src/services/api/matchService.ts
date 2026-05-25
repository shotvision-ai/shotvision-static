import { apiClient } from "./apiClient";
import { Match } from "../../../types/match";
import { toApiMatchWritePayload } from "./matchPayload";
import { normalizeMatch, normalizeMatchList } from "./matchMapper";
import { normalizePaginatedResponse, type PaginatedResponse } from "./pagination";
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
    const params: Record<string, string> = {
      page: String(Math.max(0, page - 1)),
      size: String(limit),
    };

    const raw = await apiClient.get<unknown>("/api/matches/explore", { params });
    const paged = normalizePaginatedResponse<unknown>(raw, limit);
    const items = filterMatchesByStatus(normalizeMatchList(paged.items as unknown[]), status);
    return { ...paged, items };
  },

  async getMatchDetails(id: string): Promise<Match> {
    const raw = await apiClient.get<unknown>(`/api/matches/${id}`);
    return normalizeMatch(raw);
  },

  async createMatch(data: CreateMatchInput): Promise<Match> {
    const raw = await apiClient.post<unknown>("/api/matches", toApiMatchWritePayload(data));
    return normalizeMatch(raw);
  },

  async updateMatch(id: string, data: UpdateMatchInput): Promise<Match> {
    const raw = await apiClient.patch<unknown>(`/api/matches/${id}`, toApiMatchWritePayload(data));
    return normalizeMatch(raw);
  },

  async deleteMatch(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/matches/${id}`);
  },

  async finishMatch(id: string): Promise<FinishMatchResponse> {
    return await apiClient.post<FinishMatchResponse>(`/api/matches/${id}/finish`, {});
  },

  async getMatchShare(id: string): Promise<MatchShareResponse> {
    return await apiClient.get<MatchShareResponse>(`/api/matches/${id}/share`);
  },

  async likeMatch(id: string): Promise<LikeMatchResponse> {
    return await apiClient.post<LikeMatchResponse>(`/api/matches/${id}/like`, {});
  },

  async unlikeMatch(id: string): Promise<LikeMatchResponse> {
    return await apiClient.delete<LikeMatchResponse>(`/api/matches/${id}/like`);
  },
};
