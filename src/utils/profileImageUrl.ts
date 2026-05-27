const INVALID_LITERALS = new Set(["null", "undefined", "none", "n/a", "nil", "false", "0"]);

/**
 * Returns a loadable remote profile image URL, or `undefined` when the value is empty/invalid.
 * Treats API placeholder strings (`"null"`, etc.) as no photo.
 */
export function normalizeProfileImageUrl(
  url: string | null | undefined
): string | undefined {
  if (url == null) return undefined;
  const trimmed = url.trim();
  if (!trimmed || INVALID_LITERALS.has(trimmed.toLowerCase())) {
    return undefined;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Relative CDN paths (prepend when API returns path-only URLs).
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return undefined;
}

/** First valid URL from a list of candidates (API field aliases). */
export function coalesceProfileImageUrl(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const c of candidates) {
    const normalized = normalizeProfileImageUrl(c);
    if (normalized) return normalized;
  }
  return undefined;
}

/**
 * Bust expo-image / CDN caches when the profile photo URL is unchanged but content changed.
 * Safe for URLs that already have query params.
 */
export function withProfileImageCacheBust(
  url: string,
  revision: number
): string {
  if (revision <= 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sv=${revision}`;
}
