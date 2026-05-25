/**
 * User API types from API_CONTRACTS.md §6.
 */

import type { ApiEmptyData, ApiSuccessEnvelope } from "./common.types";

// --- Requests ---

export interface UpdateUserProfileRequest {
  name?: string;
  bio?: string;
  location?: string;
}

export interface UpdateUserSettingsRequest {
  notificationsEnabled?: boolean | null;
  darkMode?: boolean | null;
}

// --- Response data (body.data) ---

export interface UserProfileResponse {
  userId: string;
  name: string | null;
  email: string;
  profileImage: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
}

export interface MonthlyPerformancePoint {
  month: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface UserStatsResponse {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  monthlyPerformance: MonthlyPerformancePoint[];
}

export interface UserMonthlyStatsResponse {
  monthlyPerformance: MonthlyPerformancePoint[];
}

// --- Envelopes ---

export type UserProfileApiResponse = ApiSuccessEnvelope<UserProfileResponse>;
export type UserStatsApiResponse = ApiSuccessEnvelope<UserStatsResponse>;
export type UserMonthlyStatsApiResponse = ApiSuccessEnvelope<UserMonthlyStatsResponse>;
export type UpdateUserSettingsApiResponse = ApiSuccessEnvelope<ApiEmptyData>;
export type DeleteUserApiResponse = ApiSuccessEnvelope<ApiEmptyData>;
