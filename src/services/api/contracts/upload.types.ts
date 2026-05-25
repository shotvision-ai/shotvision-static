/**
 * Upload API types from API_CONTRACTS.md §9.
 */

import type { ApiSuccessEnvelope } from "./common.types";

// --- Multipart request ---

/** Form field name must be `file` (JPEG or PNG, max 5 MB). */
export interface ProfileImageUploadForm {
  file: Blob | File;
}

// --- Response data (body.data) ---

export interface ProfileImageUploadResponse {
  url: string;
  publicId: string;
}

export type ProfileImageUploadApiResponse = ApiSuccessEnvelope<ProfileImageUploadResponse>;
