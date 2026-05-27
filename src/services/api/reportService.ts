import { apiClient } from "./apiClient";
import { AppError } from "./apiErrors";
import type { ReportMatchRequest, ReportMatchResponse } from "./contracts/report.types";
import {
  isValidMatchIdForReport,
  normalizeReportMatchResponse,
  normalizeUserReportedMatchIds,
} from "../../utils/matchReport";

/**
 * Match reporting — POST/DELETE `/api/matches/{matchId}/report`, list via GET `/api/users/me/reports`.
 */
export const reportService = {
  async reportMatch(matchId: string, body: ReportMatchRequest): Promise<ReportMatchResponse> {
    const id = matchId.trim();
    if (!isValidMatchIdForReport(id)) {
      throw new AppError("Invalid match id for report.", 400, "INVALID_MATCH_ID");
    }
    const reason = body.reason?.trim();
    if (!reason) {
      throw new AppError("Report reason is required.", 400, "VALIDATION_ERROR");
    }

    const payload: Record<string, string> = { reason };
    const notes = body.notes?.trim();
    if (notes) payload.notes = notes;

    const raw = await apiClient.post<unknown>(`/api/matches/${id}/report`, payload);
    return normalizeReportMatchResponse(raw, id);
  },

  async undoReport(matchId: string): Promise<ReportMatchResponse> {
    const id = matchId.trim();
    if (!isValidMatchIdForReport(id)) {
      throw new AppError("Invalid match id for report.", 400, "INVALID_MATCH_ID");
    }
    const raw = await apiClient.delete<unknown>(`/api/matches/${id}/report`);
    return normalizeReportMatchResponse(raw ?? { matchId: id, reportedByMe: false }, id);
  },

  /** Loads match IDs the current user has reported (for list/detail sync after refresh). */
  async getMyReportedMatchIds(): Promise<string[]> {
    try {
      const raw = await apiClient.get<unknown>("/api/users/me/reports");
      return normalizeUserReportedMatchIds(raw);
    } catch (err) {
      if (err instanceof AppError && (err.statusCode === 404 || err.statusCode === 501)) {
        return [];
      }
      throw err;
    }
  },
};
