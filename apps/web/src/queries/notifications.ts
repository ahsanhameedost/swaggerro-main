import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/api";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
  unread: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => listNotifications({ limit: 30 }),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
