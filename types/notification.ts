/** In-app notification row shown on the notifications screen (mapped from API). */
export type InAppNotificationType = "match" | "system" | "alert";

export interface InAppNotification {
  id: string;
  type: InAppNotificationType;
  title: string;
  message: string;
  /** Relative label e.g. "2 hours ago" */
  time: string;
  read: boolean;
}
