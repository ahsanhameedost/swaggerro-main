import { apiFetch } from "@/lib/api";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export async function listNotifications(params: { unread?: boolean; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.unread) qs.set("unread", "true");
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<{ notifications: AppNotification[] }>(`/notifications${suffix}`, { method: "GET" });
}

export async function getUnreadCount() {
  return apiFetch<{ count: number }>("/notifications/unread-count", { method: "GET" });
}

export async function markNotificationRead(id: string) {
  return apiFetch<{ ok: true }>(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead() {
  return apiFetch<{ ok: true }>("/notifications/read-all", { method: "POST" });
}
