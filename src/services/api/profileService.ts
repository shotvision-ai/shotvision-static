import { coalesceProfileImageUrl } from "../../utils/profileImageUrl";
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

/**
 * Maps `/api/users/me` payload to `UserProfile`.
 * PATCH often returns a partial or empty body — pass `existing` to preserve session identity.
 */
function normalizeUserProfile(raw: unknown, existing?: UserProfile): UserProfile {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    if (existing) return { ...existing };
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }
  const r = raw as Record<string, unknown>;
  const id = String(r.userId ?? r.id ?? existing?.id ?? "").trim();
  if (!id) {
    if (existing?.id) {
      return {
        ...existing,
        name: String(r.name ?? existing.name ?? ""),
        bio: typeof r.bio === "string" ? r.bio : existing.bio,
        location: typeof r.location === "string" ? r.location : existing.location,
        image:
          coalesceProfileImageUrl(
            typeof r.profileImage === "string" ? r.profileImage : undefined,
            typeof r.image === "string" ? r.image : undefined,
            typeof r.photoUrl === "string" ? r.photoUrl : undefined,
            existing.image
          ) ?? existing.image,
      };
    }
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }
  return {
    id,
    name: String(r.name ?? existing?.name ?? ""),
    email: String(r.email ?? existing?.email ?? ""),
    image: coalesceProfileImageUrl(
      typeof r.profileImage === "string" ? r.profileImage : undefined,
      typeof r.image === "string" ? r.image : undefined,
      typeof r.photoUrl === "string" ? r.photoUrl : undefined,
      existing?.image
    ),
    bio: typeof r.bio === "string" ? r.bio : undefined,
    location: typeof r.location === "string" ? r.location : undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
  };
}

/** Applies a successful PATCH using API fields when present, otherwise the request payload. */
export function mergeProfileFromPatch(
  existing: UserProfile,
  patch: UpdateUserProfileRequest,
  rawResponse?: unknown
): UserProfile {
  let merged = existing;
  if (rawResponse != null && typeof rawResponse === "object" && !Array.isArray(rawResponse)) {
    try {
      merged = normalizeUserProfile(rawResponse, existing);
    } catch {
      merged = { ...existing };
    }
  }

  const next: UserProfile = {
    ...merged,
    id: existing.id,
    email: existing.email,
  };

  if (patch.name !== undefined) {
    next.name = String(patch.name).trim();
  }
  if (patch.bio !== undefined) {
    const b = String(patch.bio).trim();
    next.bio = b || undefined;
  }
  if (patch.location !== undefined) {
    const loc = String(patch.location).trim();
    next.location = loc || undefined;
  }

  return next;
}

/**
 * profileService — user profile, settings, stats, and account APIs per API_CONTRACTS.md.
 */
export const profileService = {
  async getCurrentProfile(): Promise<UserProfile> {
    const raw = await apiClient.get<UserProfileResponse>("/api/users/me");
    return normalizeUserProfile(raw);
  },

  async updateProfile(data: UpdateUserProfileRequest, existing: UserProfile): Promise<UserProfile> {
    if (!existing.id?.trim()) {
      throw new AppError("Not signed in", 401, "UNAUTHORIZED");
    }
    const raw = await apiClient.patch<unknown>("/api/users/me", data);
    return mergeProfileFromPatch(existing, data, raw);
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
