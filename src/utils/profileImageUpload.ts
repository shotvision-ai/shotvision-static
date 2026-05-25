import { AppError } from "../services/api/apiErrors";

/** API contract: JPEG/PNG max 5 MB (POST `/api/uploads/profile-image`). */
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Validates size before multipart upload.
 * Edge case: picker may omit `fileSize` on some platforms — caller should pass when available.
 */
export function assertProfileImageWithinSizeLimit(fileSizeBytes: number | undefined): void {
  if (fileSizeBytes === undefined || fileSizeBytes <= 0) {
    return;
  }
  if (fileSizeBytes > PROFILE_IMAGE_MAX_BYTES) {
    throw new AppError(
      "Image must be 5 MB or smaller. Choose a smaller photo and try again.",
      400,
      "FILE_TOO_LARGE"
    );
  }
}
