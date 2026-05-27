/**
 * Match report / moderation types.
 * Endpoints verified on Shot Vision service (401 without auth, not 404).
 */

export interface ReportMatchRequest {
  reason: string;
  notes?: string;
}

export interface ReportMatchResponse {
  matchId: string;
  reportedByMe: boolean;
}

/** GET `/api/users/me/reports` — shape may vary; normalized in reportService. */
export interface UserReportsListResponse {
  matchIds?: string[];
  reportedMatchIds?: string[];
  items?: Array<{ matchId?: string; match_id?: string }>;
}
