import { apiClient } from "./apiClient";
import { AppError } from "./apiErrors";
import type {
  UpdateUserProfileRequest,
  UpdateUserSettingsRequest,
  UserProfileResponse,
  UserStatsResponse,
} from "./contracts";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
  location?: string;
  createdAt?: string;
}

/** Maps `/api/users/me` payload to `UserProfile`. */
function normalizeUserProfile(raw: unknown): UserProfile {
  if (raw == null || typeof raw !== "object") {
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.userId ?? r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    image:
      typeof r.profileImage === "string"
        ? r.profileImage
        : typeof r.image === "string"
          ? r.image
          : typeof r.photoUrl === "string"
            ? r.photoUrl
            : undefined,
    bio: typeof r.bio === "string" ? r.bio : undefined,
    location: typeof r.location === "string" ? r.location : undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
  };
}

/**
 * profileService — user profile, settings, stats, and account APIs per API_CONTRACTS.md.
 */
export const profileService = {
  async getCurrentProfile(): Promise<UserProfile> {
    const raw = await apiClient.get<UserProfileResponse>("/api/users/me");
    return normalizeUserProfile(raw);
  },

  async updateProfile(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const raw = await apiClient.patch<UserProfileResponse>("/api/users/me", data);
    return normalizeUserProfile(raw);
  },

  /** PATCH `/api/users/me/settings` — `body.data` is null on success. */
  async updateSettings(data: UpdateUserSettingsRequest): Promise<void> {
    await apiClient.patch<null>("/api/users/me/settings", data);
  },

  async getMyStats(): Promise<UserStatsResponse> {
    return await apiClient.get<UserStatsResponse>("/api/users/me/stats");
  },

  /** Soft-delete account (grace period on server). */
  async deleteAccount(): Promise<void> {
    await apiClient.delete<null>("/api/users/me");
  },
};
