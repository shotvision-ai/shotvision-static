/**
 * Match API types from API_CONTRACTS.md §7–§8.
 */

import type { ApiEmptyData, ApiSuccessEnvelope, PaginatedResponseDto } from "./common.types";

// --- Enums (§10) ---

export type MatchStatus = "SCHEDULED" | "LIVE" | "IN_PROGRESS" | "FINISHED";

export type MatchPlayerSide = "PLAYER_1" | "PLAYER_2";

/** Set/match winner; `null` when draw or undetermined. */
export type MatchWinner = MatchPlayerSide | null;

/** Alias used across services for API winner fields. */
export type ApiMatchStatus = MatchStatus;
export type ApiMatchWinner = MatchWinner;

// --- Query params ---

export interface ExploreMatchesQueryParams {
  page?: number;
  size?: number;
}

export interface MyMatchesQueryParams {
  page?: number;
  size?: number;
  status?: MatchStatus;
}

// --- Request DTOs ---

export interface MatchSetRequest {
  setNumber: number;
  p1Score: number;
  p2Score: number;
}

export interface CreateMatchRequest {
  player1Name: string;
  player2Name: string;
  status: MatchStatus;
  matchDate: string;
  location?: string;
  notes?: string;
  isPublic?: boolean;
  sets?: MatchSetRequest[];
}

export interface UpdateMatchRequest {
  status?: MatchStatus;
  location?: string;
  notes?: string;
  isPublic?: boolean;
  sets?: MatchSetRequest[];
}

// --- Response DTOs ---

export interface MatchSetResponse {
  setNumber: number;
  p1Score: number;
  p2Score: number;
  setWinner: MatchWinner;
}

export interface ShotDetail {
  playerSide: MatchPlayerSide;
  shotType: string;
  isWinner: boolean;
  isError: boolean;
}

export interface MatchDetailsResponse {
  matchId: string;
  player1Name: string;
  player2Name: string;
  location: string | null;
  status: MatchStatus;
  matchDate: string;
  isPublic: boolean;
  winner: MatchWinner;
  p1SetsWon: number;
  p2SetsWon: number;
  createdAt: string;
  finishedAt: string | null;
  sets: MatchSetResponse[];
  shots: ShotDetail[];
  notes: string | null;
  likesCount: number;
  likedByMe: boolean;
}

export interface ExploreMatchItem {
  matchId: string;
  player1Name: string;
  player2Name: string;
  status: MatchStatus;
  winner: MatchWinner;
  p1SetsWon: number;
  p2SetsWon: number;
  createdAt: string;
  likesCount: number;
}

export interface MatchDashboardItem {
  matchId: string;
  player1Name: string;
  player2Name: string;
  status: MatchStatus;
  matchDate: string;
  isPublic: boolean;
  winner: MatchWinner;
  p1SetsWon: number;
  p2SetsWon: number;
  createdAt: string;
}

export interface FinishMatchResponse {
  winner: MatchWinner;
  p1SetsWon: number;
  p2SetsWon: number;
  status: "FINISHED";
}

export interface LikeMatchResponse {
  matchId: string;
  likesCount: number;
  likedByMe: boolean;
}

export interface MatchShareResponse {
  title: string;
  subtitle: string;
  winner: MatchWinner;
  sets: string[];
  appLink: string;
  webLink: string;
}

/** GET `/public/share/{matchId}` — §8 */
export interface PublicShareMatchResponse {
  matchId: string;
  player1Name: string;
  player2Name: string;
  status: MatchStatus;
  winner: MatchWinner;
  matchDate: string;
  isPublic: boolean;
  createdAt: string;
  finishedAt: string | null;
  notes: string | null;
  shareTitle: string;
  shareSubtitle: string;
  sets: MatchSetResponse[];
}

// --- Paginated list envelopes ---

export type ExploreMatchesPage = PaginatedResponseDto<ExploreMatchItem>;
export type MyMatchesPage = PaginatedResponseDto<MatchDashboardItem>;

export type ExploreMatchesApiResponse = ApiSuccessEnvelope<ExploreMatchesPage>;
export type MyMatchesApiResponse = ApiSuccessEnvelope<MyMatchesPage>;

// --- Single-resource envelopes ---

export type MatchDetailsApiResponse = ApiSuccessEnvelope<MatchDetailsResponse>;
export type CreateMatchApiResponse = ApiSuccessEnvelope<MatchDetailsResponse>;
export type UpdateMatchApiResponse = ApiSuccessEnvelope<MatchDetailsResponse>;
export type FinishMatchApiResponse = ApiSuccessEnvelope<FinishMatchResponse>;
export type LikeMatchApiResponse = ApiSuccessEnvelope<LikeMatchResponse>;
export type MatchShareApiResponse = ApiSuccessEnvelope<MatchShareResponse>;
export type DeleteMatchApiResponse = ApiSuccessEnvelope<ApiEmptyData>;
export type PublicShareMatchApiResponse = ApiSuccessEnvelope<PublicShareMatchResponse>;
