import { apiClient } from "./apiClient";
import type { InAppNotification, InAppNotificationType } from "../../../types/notification";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

/**
 * Raw notification from Shot Vision API (`/api/notifications`).
 * Field names are tolerant of common Spring / Jackson variants.
 */
export interface ApiNotificationDto {
  id: string;
  type?: string;
  notificationType?: string;
  title?: string;
  subject?: string;
  message?: string;
  body?: string;
  content?: string;
  read?: boolean;
  isRead?: boolean;
  readAt?: string | null;
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
}

function unwrapNotificationList(data: unknown): ApiNotificationDto[] {
  if (Array.isArray(data)) return data as ApiNotificationDto[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as ApiNotificationDto[];
    if (Array.isArray(o.content)) return o.content as ApiNotificationDto[];
    if (Array.isArray(o.notifications)) return o.notifications as ApiNotificationDto[];
  }
  return [];
}

function mapNotificationType(raw: string | undefined): InAppNotificationType {
  const t = (raw ?? "SYSTEM").toUpperCase();
  if (t.includes("MATCH") || t === "MATCH_COMPLETED" || t === "PUBLIC_MATCH") return "match";
  if (t.includes("ALERT") || t.includes("REMINDER")) return "alert";
  return "system";
}

export function mapApiNotificationToInApp(raw: ApiNotificationDto): InAppNotification | null {
  if (!raw?.id) return null;
  let title = raw.title ?? raw.subject;
  if (!title && raw.message) title = String(raw.message).slice(0, 120);
  if (!title) title = "Notification";
  const message =
    raw.message ?? raw.body ?? raw.content ?? "";
  const read = raw.read ?? raw.isRead ?? !!raw.readAt;
  const created =
    raw.createdAt ?? raw.created_at ?? raw.timestamp ?? new Date().toISOString();

  return {
    id: String(raw.id),
    type: mapNotificationType(raw.type ?? raw.notificationType),
    title: String(title),
    message: String(message),
    time: formatRelativeTime(created) || "",
    read,
  };
}

/**
 * Notification API — **not defined in API_CONTRACTS.md** (2026-05-24).
 * These paths are kept for forward compatibility; expect 404 until the backend ships them.
 * See API_INTEGRATION_REPORT.md § "Unimplemented / undocumented backend APIs".
 */
export const notificationService = {
  async list(params?: { limit?: number }): Promise<InAppNotification[]> {
    const limit = params?.limit ?? 100;
    const data = await apiClient.get<unknown>("/api/notifications", {
      params: { limit: String(limit) },
    });

    const rows = unwrapNotificationList(data);
    const mapped = rows.map(mapApiNotificationToInApp).filter((n): n is InAppNotification => n !== null);
    return mapped;
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch<void>(`/api/notifications/${encodeURIComponent(id)}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await apiClient.post<void>("/api/notifications/read-all", {});
  },

  async deleteOne(id: string): Promise<void> {
    await apiClient.delete<void>(`/api/notifications/${encodeURIComponent(id)}`);
  },

  async deleteAll(): Promise<void> {
    await apiClient.delete<void>("/api/notifications");
  },
};
