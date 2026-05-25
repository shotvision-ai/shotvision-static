import { apiClient } from "./apiClient";
import type { PublicShareMatchResponse } from "./contracts";

/**
 * Public share view — GET `/public/share/{matchId}` (no auth per API_CONTRACTS.md).
 */
export const publicShareService = {
  async getPublicMatch(matchId: string): Promise<PublicShareMatchResponse> {
    return apiClient.get<PublicShareMatchResponse>(`/public/share/${matchId}`, {
      skipAuth: true,
    });
  },
};
