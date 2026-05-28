import { coerceProfileText, mergeApiMeIntoSession, mergeProfileFromPatch, profileFieldsSnapshot } from "../../utils/profileSessionMerge";
import { coalesceProfileImageUrl } from "../../utils/profileImageUrl";
import { devLog } from "../../utils/devLog";
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

function readProfileId(r: Record<string, unknown>, existing?: UserProfile): string {
  return String(r.userId ?? r.id ?? existing?.id ?? "").trim();
}

/**
 * Maps GET `/api/users/me` into the session user (cold load / login / bootstrap).
 */
export function normalizeUserProfile(raw: unknown, existing?: UserProfile): UserProfile {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    if (existing) return { ...existing };
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }

  const r = raw as Record<string, unknown>;
  const id = readProfileId(r, existing);

  if (!id) {
    if (existing?.id) {
      return mergeApiMeIntoSession(r, existing);
    }
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }

  const base: UserProfile = {
    id,
    name: coerceProfileText(r.name) ?? coerceProfileText(r.displayName) ?? coerceProfileText(existing?.name) ?? "",
    email: coerceProfileText(r.email) ?? coerceProfileText(existing?.email) ?? "",
    image: coalesceProfileImageUrl(
      typeof r.profileImage === "string" ? r.profileImage : undefined,
      typeof r.image === "string" ? r.image : undefined,
      typeof r.photoUrl === "string" ? r.photoUrl : undefined,
      typeof r.photoURL === "string" ? r.photoURL : undefined,
      typeof r.picture === "string" ? r.picture : undefined,
      existing?.image
    ),
    bio:
      typeof r.bio === "string"
        ? r.bio.trim() || undefined
        : r.bio === null
          ? undefined
          : existing?.bio,
    location:
      typeof r.location === "string"
        ? r.location.trim() || undefined
        : r.location === null
          ? undefined
          : existing?.location,
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : existing?.createdAt,
  };

  return existing ? mergeApiMeIntoSession(r, { ...existing, ...base }) : base;
}

function logProfileStage(
  stage: string,
  payload: Record<string, unknown>
): void {
  devLog.info(`[profile:persist] ${stage}`, payload);
}

/**
 * profileService — user profile, settings, stats, and account APIs per API_CONTRACTS.md.
 */
export const profileService = {
  /**
   * GET `/api/users/me`.
   * @param mergeWith — session profile; omitted API keys keep session values on refresh.
   */
  async getCurrentProfile(mergeWith?: UserProfile): Promise<UserProfile> {
    const raw = await apiClient.get<UserProfileResponse>("/api/users/me");
    const profile = mergeWith
      ? mergeApiMeIntoSession(raw, mergeWith)
      : normalizeUserProfile(raw);
    logProfileStage("GET /api/users/me normalized", {
      hasMergeWith: !!mergeWith,
      snapshot: profileFieldsSnapshot(profile),
    });
    return profile;
  },

  async updateProfile(data: UpdateUserProfileRequest, existing: UserProfile): Promise<UserProfile> {
    if (!existing.id?.trim()) {
      throw new AppError("Not signed in", 401, "UNAUTHORIZED");
    }

    logProfileStage("PATCH /api/users/me request", {
      userId: existing.id,
      patch: data,
      before: profileFieldsSnapshot(existing),
    });

    const raw = await apiClient.patch<unknown>("/api/users/me", data);
    const merged = mergeProfileFromPatch(existing, data, raw);

    logProfileStage("PATCH /api/users/me merged", {
      responseEmpty: raw == null,
      responseKeys:
        raw != null && typeof raw === "object" && !Array.isArray(raw)
          ? Object.keys(raw as object).join(",")
          : "(none)",
      after: profileFieldsSnapshot(merged),
    });

    return merged;
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
