import { apiClient } from "./apiClient";
import { Match } from "../../../types/match";
import { toApiMatchWritePayload } from "./matchPayload";
import { normalizeMatch, normalizeMatchList } from "./matchMapper";
import { normalizePaginatedResponse, type PaginatedResponse } from "./pagination";

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
  scheduledDate?: string;
}

export interface UpdateMatchInput extends Partial<CreateMatchInput> {}

/**
 * matchService handles match-related API calls.
 */
export const matchService = {
  /**
   * Fetches the current user's matches with pagination and filters.
   */
  async getMyMatches(
    page: number = 1,
    limit: number = 10,
    status: MatchStatusFilter = "all"
  ): Promise<PaginatedResponse<Match>> {
    // Spring Pageable: `page` is 0-based; `size` is page size (not `limit`).
    // Internal `page` is 1-based (first page = 1) for useMatches/loadMore.
    const params: Record<string, string> = {
      page: String(Math.max(0, page - 1)),
      size: String(limit),
      limit: String(limit),
    };

    if (status !== "all") {
      params.status = status;
    }

    const raw = await apiClient.get<unknown>("/api/matches/my", { params });
    const paged = normalizePaginatedResponse<unknown>(raw, limit);
    return { ...paged, items: normalizeMatchList(paged.items as unknown[]) };
  },

  /**
   * Fetches public matches for exploration.
   */
  async getExploreMatches(
    page: number = 1,
    limit: number = 10,
    status: MatchStatusFilter = "all"
  ): Promise<PaginatedResponse<Match>> {
    const params: Record<string, string> = {
      page: String(Math.max(0, page - 1)),
      size: String(limit),
      limit: String(limit),
    };

    if (status !== "all") {
      params.status = status;
    }

    const raw = await apiClient.get<unknown>("/api/matches/explore", { params });
    const paged = normalizePaginatedResponse<unknown>(raw, limit);
    return { ...paged, items: normalizeMatchList(paged.items as unknown[]) };
  },

  /**
   * Fetches details for a specific match.
   */
  async getMatchDetails(id: string): Promise<Match> {
    const raw = await apiClient.get<unknown>(`/api/matches/${id}`);
    return normalizeMatch(raw);
  },

  /**
   * Creates a new match.
   */
  async createMatch(data: CreateMatchInput): Promise<Match> {
    const raw = await apiClient.post<unknown>("/api/matches", toApiMatchWritePayload(data));
    return normalizeMatch(raw);
  },

  /**
   * Updates an existing match.
   */
  async updateMatch(id: string, data: UpdateMatchInput): Promise<Match> {
    const raw = await apiClient.patch<unknown>(`/api/matches/${id}`, toApiMatchWritePayload(data));
    return normalizeMatch(raw);
  },

  /**
   * Deletes a match.
   */
  async deleteMatch(id: string): Promise<void> {
    return await apiClient.delete<void>(`/api/matches/${id}`);
  },

  /**
   * Likes a match.
   */
  async likeMatch(id: string): Promise<void> {
    return await apiClient.post<void>(`/api/matches/${id}/like`, {});
  },

  /**
   * Unlikes a match.
   */
  async unlikeMatch(id: string): Promise<void> {
    return await apiClient.delete<void>(`/api/matches/${id}/like`);
  },
};
