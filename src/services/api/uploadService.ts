import { apiClient } from "./apiClient";
import type { ProfileImageUploadResponse } from "./contracts";
import { AppError } from "./apiErrors";
import { PROFILE_IMAGE_UPLOAD_ENABLED } from "../../config/featureFlags";
import { assertProfileImageWithinSizeLimit } from "../../utils/profileImageUpload";

export interface ProfileImageFile {
  uri: string;
  mimeType: string;
  name: string;
  /** From image picker when available — used for 5 MB contract check before upload. */
  fileSizeBytes?: number;
}

/**
 * Multipart upload for POST `/api/uploads/profile-image` (field name: `file`).
 * TODO: Re-enable after production storage integration (Cloudinary/S3).
 * Gate UI via `PROFILE_IMAGE_UPLOAD_ENABLED`; this guard blocks accidental API calls.
 */
export const uploadService = {
  async uploadProfileImage(file: ProfileImageFile): Promise<ProfileImageUploadResponse> {
    if (!PROFILE_IMAGE_UPLOAD_ENABLED) {
      throw new AppError(
        "Profile photo upload is temporarily unavailable.",
        503,
        "UPLOAD_DISABLED"
      );
    }

    assertProfileImageWithinSizeLimit(file.fileSizeBytes);

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      type: file.mimeType,
      name: file.name,
    } as unknown as Blob);

    return await apiClient.postFormData<ProfileImageUploadResponse>(
      "/api/uploads/profile-image",
      formData
    );
  },
};
