import type { IconName } from "~/lib/icons/LucideIcon";
import { AppError } from "../services/api/apiErrors";

export type NotificationLoadFailureUI = {
  title: string;
  detail: string;
  iconName: IconName;
  iconColor: string;
};

/** User-friendly copy for failed notification list loads (not generic “error” wording). */
export function getNotificationLoadFailureUI(
  err: unknown,
  userDisplayName?: string | null
): NotificationLoadFailureUI {
  const first =
    userDisplayName?.trim().split(/\s+/)[0]?.replace(/,$/, "") ??
    null;
  const hi = first ? `${first}, ` : "";

  if (err instanceof AppError) {
    const { statusCode, code, message } = err;

    if (code === "NETWORK_FAILURE") {
      return {
        title: "You're offline",
        detail: `${hi}Check your connection and try again when you're back online.`,
        iconName: "WifiOff",
        iconColor: "#64748b",
      };
    }

    if (code === "UNKNOWN_ERROR" || /^something went wrong/i.test(message.trim())) {
      return {
        title: "Can’t load your notifications",
        detail: `${hi}Pull down to refresh, or tap Try again.`,
        iconName: "Bell",
        iconColor: "#94a3b8",
      };
    }

    if (statusCode === 401) {
      return {
        title: "Sign in to refresh alerts",
        detail: `${hi}We couldn’t verify your account just now. Sign in again, then come back here.`,
        iconName: "Lock",
        iconColor: "#64748b",
      };
    }

    if (statusCode === 404 || statusCode === 501 || statusCode === 503) {
      return {
        title: "Notifications coming soon",
        detail: `${hi}Alerts aren't available on the server yet. Check back after a future app update.`,
        iconName: "Bell",
        iconColor: "#94a3b8",
      };
    }

    if (code === "INVALID_RESPONSE" || statusCode === 502) {
      return {
        title: "Hang tight",
        detail: `${hi}We got an unexpected reply from the server. Please try again shortly.`,
        iconName: "Bell",
        iconColor: "#64748b",
      };
    }

    if (code === "TIMEOUT") {
      return {
        title: "That took too long",
        detail: `${hi}The server didn’t answer in time. Pull down to retry.`,
        iconName: "Bell",
        iconColor: "#64748b",
      };
    }

    if (statusCode >= 500) {
      return {
        title: "Can’t load alerts right now",
        detail: `${hi}Our servers are having a moment. Please try again soon.`,
        iconName: "Bell",
        iconColor: "#64748b",
      };
    }

    const trimmed = message.trim();
    if (
      trimmed &&
      trimmed.length < 160 &&
      trimmed.toLowerCase() !== "request failed" &&
      !/<\s*html/i.test(trimmed)
    ) {
      return {
        title: "Here’s what happened",
        detail: `${hi}${trimmed}`,
        iconName: "Bell",
        iconColor: "#64748b",
      };
    }
  }

  return {
    title: "Can’t load your notifications",
    detail: `${hi}Pull down to refresh, or tap Try again.`,
    iconName: "Bell",
    iconColor: "#94a3b8",
  };
}
