import { apiClient } from "./apiClient";
import { AppError } from "./apiErrors";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
  location?: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  marketingEmails: boolean;
  theme: "light" | "dark" | "system";
  isPublic: boolean;
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  location?: string;
  image?: string; // Base64 or URL for now
}

export interface UpdateSettingsInput extends Partial<UserSettings> {}

/** Maps `/api/users/me` payload (camelCase or snake_case) to `UserProfile`. */
function normalizeUserProfile(raw: unknown): UserProfile {
  if (raw == null || typeof raw !== "object") {
    throw new AppError("Invalid profile response", 502, "INVALID_PROFILE");
  }
  const r = raw as Record<string, unknown>;
  const settingsRaw = r.settings ?? r.userSettings;
  let settings: UserSettings | undefined;
  if (settingsRaw && typeof settingsRaw === "object") {
    const s = settingsRaw as Record<string, unknown>;
    settings = {
      notificationsEnabled: Boolean(s.notificationsEnabled ?? s.notifications_enabled ?? true),
      marketingEmails: Boolean(s.marketingEmails ?? s.marketing_emails ?? false),
      theme: (s.theme === "light" || s.theme === "dark" || s.theme === "system" ? s.theme : "system") as UserSettings["theme"],
      isPublic: Boolean(s.isPublic ?? s.is_public ?? true),
    };
  }
  return {
    id: String(r.id ?? r.userId ?? ""),
    name: String(r.name ?? r.fullName ?? r.display_name ?? ""),
    email: String(r.email ?? ""),
    image:
      typeof r.image === "string"
        ? r.image
        : typeof r.photoUrl === "string"
          ? r.photoUrl
          : typeof r.photo_url === "string"
            ? r.photo_url
            : typeof r.avatarUrl === "string"
              ? r.avatarUrl
              : undefined,
    bio: typeof r.bio === "string" ? r.bio : typeof r.biography === "string" ? r.biography : undefined,
    location: typeof r.location === "string" ? r.location : undefined,
    settings,
  };
}

/**
 * profileService handles profile-related API calls.
 */
export const profileService = {
  /**
   * Fetches the current authenticated user's profile.
   * @returns Promise<UserProfile>
   */
  async getCurrentProfile(): Promise<UserProfile> {
    const raw = await apiClient.get<unknown>("/api/users/me");
    return normalizeUserProfile(raw);
  },

  /**
   * Updates the current user's profile.
   */
  async updateProfile(data: UpdateProfileInput): Promise<UserProfile> {
    const raw = await apiClient.patch<unknown>("/api/users/me", data);
    return normalizeUserProfile(raw);
  },

  /**
   * Updates the current user's settings.
   */
  async updateSettings(data: UpdateSettingsInput): Promise<UserSettings> {
    return await apiClient.patch<UserSettings>("/api/users/me/settings", data);
  },
};
