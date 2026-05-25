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
 * TODO: Re-enable when backend documents and ships notification APIs.
 */
export const NOTIFICATIONS_API_ENABLED = false;
