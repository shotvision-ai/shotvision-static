/**
 * Auth API types from API_CONTRACTS.md §5.
 */

import type { ApiEmptyData, ApiSuccessEnvelope } from "./common.types";

// --- Requests ---

export interface AuthLoginRequest {
  firebaseToken: string;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthLogoutRequest {
  refreshToken: string;
}

// --- Response data (body.data) ---

export interface AuthUserResponse {
  userId: string;
  name: string | null;
  email: string;
  profileImage: string | null;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserResponse;
}

export interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Stored session tokens (client-side; mirrors login/refresh fields). */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

// --- Envelopes ---

export type AuthLoginApiResponse = ApiSuccessEnvelope<AuthLoginResponse>;
export type AuthRefreshApiResponse = ApiSuccessEnvelope<AuthRefreshResponse>;
export type AuthLogoutApiResponse = ApiSuccessEnvelope<ApiEmptyData>;
