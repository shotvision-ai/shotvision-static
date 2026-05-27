import { coalesceProfileImageUrl } from "../../utils/profileImageUrl";
import { coerceProfileText } from "../../utils/profileSessionMerge";
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
 * Maps GET `/api/users/me` into the session user.
 * Omitted JSON keys keep session values; explicit `null` clears optional text fields.
 */
function mergeApiMeIntoSession(raw: unknown, session: UserProfile): UserProfile {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return session;
  }
  const r = raw as Record<string, unknown>;
  const id = readProfileId(r, session) || session.id;

  return {
    id,
    email: coerceProfileText(r.email) ?? session.email,
    name: "name" in r ? (coerceProfileText(r.name) ?? session.name) : session.name,
    bio: "bio" in r ? (typeof r.bio === "string" ? r.bio : undefined) : session.bio,
    location:
      "location" in r ? (typeof r.location === "string" ? r.location : undefined) : session.location,
    image:
      coalesceProfileImageUrl(
        typeof r.profileImage === "string" ? r.profileImage : undefined,
        typeof r.image === "string" ? r.image : undefined,
        typeof r.photoUrl === "string" ? r.photoUrl : undefined,
        session.image
      ) ?? session.image,
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : session.createdAt,
  };
}

/**
 * Maps `/api/users/me` payload to `UserProfile` (cold load / login).
 */
function normalizeUserProfile(raw: unknown, existing?: UserProfile): UserProfile {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    if (existing) return { ...existing };
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }

  const r = raw as Record<string, unknown>;
  const id = readProfileId(r, existing);

  if (!id) {
    if (existing?.id) {
      return mergePartialApiProfile(r, existing);
    }
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }

  const name = coerceProfileText(r.name) ?? coerceProfileText(existing?.name) ?? "";
  const email = coerceProfileText(r.email) ?? coerceProfileText(existing?.email) ?? "";

  return {
    id,
    name,
    email,
    image: coalesceProfileImageUrl(
      typeof r.profileImage === "string" ? r.profileImage : undefined,
      typeof r.image === "string" ? r.image : undefined,
      typeof r.photoUrl === "string" ? r.photoUrl : undefined,
      existing?.image
    ),
    bio:
      typeof r.bio === "string"
        ? r.bio
        : r.bio === null
          ? undefined
          : existing?.bio,
    location:
      typeof r.location === "string"
        ? r.location
        : r.location === null
          ? undefined
          : existing?.location,
    createdAt:
      typeof r.createdAt === "string" ? r.createdAt : existing?.createdAt,
  };
}

/** PATCH body with only fields the user changed (contract: omitted = unchanged). */
function mergePartialApiProfile(
  r: Record<string, unknown>,
  existing: UserProfile
): UserProfile {
  return {
    ...existing,
    name: coerceProfileText(r.name) ?? existing.name,
    bio: typeof r.bio === "string" ? r.bio : r.bio === null ? undefined : existing.bio,
    location:
      typeof r.location === "string"
        ? r.location
        : r.location === null
          ? undefined
          : existing.location,
    image:
      coalesceProfileImageUrl(
        typeof r.profileImage === "string" ? r.profileImage : undefined,
        typeof r.image === "string" ? r.image : undefined,
        typeof r.photoUrl === "string" ? r.photoUrl : undefined,
        existing.image
      ) ?? existing.image,
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
   * @param mergeWith — session profile used to preserve fields the API omitted on refresh.
   */
  async getCurrentProfile(mergeWith?: UserProfile): Promise<UserProfile> {
    const raw = await apiClient.get<UserProfileResponse>("/api/users/me");
    const profile = mergeWith
      ? mergeApiMeIntoSession(raw, mergeWith)
      : normalizeUserProfile(raw);
    logProfileStage("GET /api/users/me normalized", {
      hasMergeWith: !!mergeWith,
      snapshot: {
        name: profile.name,
        bio: profile.bio ?? "(none)",
        location: profile.location ?? "(none)",
      },
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
      before: {
        name: existing.name,
        bio: existing.bio ?? "(none)",
        location: existing.location ?? "(none)",
      },
    });

    const raw = await apiClient.patch<unknown>("/api/users/me", data);
    const merged = mergeProfileFromPatch(existing, data, raw);

    logProfileStage("PATCH /api/users/me merged", {
      responseEmpty: raw == null,
      responseKeys:
        raw != null && typeof raw === "object" && !Array.isArray(raw)
          ? Object.keys(raw as object).join(",")
          : "(none)",
      after: {
        name: merged.name,
        bio: merged.bio ?? "(none)",
        location: merged.location ?? "(none)",
      },
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
