/**
 * Feature flags for gradual rollout / temporary disables.
 */

/**
 * Profile image upload (POST `/api/uploads/profile-image`).
 * TODO: Re-enable after production storage integration (Cloudinary/S3).
 */
export const PROFILE_IMAGE_UPLOAD_ENABLED = false;

/**
 * In-app notifications list (`/api/notifications/*`).
 * Leave `false` until backend documents endpoints in API_CONTRACTS.md.
 * When `true`, the app still degrades to “coming soon” on 404/5xx (see notificationsAvailability).
 */
export const NOTIFICATIONS_API_ENABLED = false;
