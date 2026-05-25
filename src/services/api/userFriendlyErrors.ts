import { AppError } from "./apiErrors";

/** Maps HTTP / API error codes to copy safe for end users. */
export function getUserFriendlyErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(err instanceof AppError)) {
    return err instanceof Error && err.message.trim() ? err.message : fallback;
  }

  if (err.code === "NETWORK_FAILURE") {
    return "We couldn't reach Shot Vision. Check your internet connection and try again.";
  }
  if (err.code === "TIMEOUT") {
    return "The server is taking too long to respond. This can happen when the app wakes up a sleeping server — check your connection and try again.";
  }
  if (err.statusCode === 401) {
    return "Your session expired. Please sign in again.";
  }
  if (err.statusCode === 403) {
    return "You don't have permission to do that.";
  }
  if (err.statusCode === 404) {
    return "We couldn't find what you're looking for.";
  }
  if (err.statusCode === 409) {
    return err.message || "That conflicts with existing data. Please adjust and try again.";
  }
  if (err.statusCode === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (err.statusCode === 503) {
    return err.message || "This feature isn't available right now. Please try again later.";
  }
  if (err.statusCode >= 500) {
    return "Shot Vision is having trouble right now. Please try again shortly.";
  }

  return err.message?.trim() || fallback;
}
