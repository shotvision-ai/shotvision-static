import { AppError } from "../services/api/apiErrors";

let sessionApiUnavailable = false;

/** After a definitive “not shipped” response, skip further list calls until app restart. */
export function markNotificationsApiUnavailableForSession(): void {
  sessionApiUnavailable = true;
}

export function isNotificationsApiKnownUnavailable(): boolean {
  return sessionApiUnavailable;
}

export function resetNotificationsAvailabilitySession(): void {
  sessionApiUnavailable = false;
}

/** Backend notification routes are undocumented; 404/501/503/5xx mean “not ready”, not user error. */
export function isNotificationsApiUnavailableError(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  if (err.statusCode === 404 || err.statusCode === 501 || err.statusCode === 503) {
    return true;
  }
  if (err.statusCode >= 500) return true;
  if (err.code === "INVALID_RESPONSE" && err.statusCode >= 500) return true;
  return false;
}
