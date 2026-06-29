"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/queries/notifications";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadCount();
  const { data, isLoading } = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = countData?.count ?? 0;
  const notifications = data?.notifications ?? [];

  const handleClick = (id: string, link: string | null, read: boolean) => {
    if (!read) markRead.mutate(id);
    setOpen(false);
    if (link) router.push(link);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 items-center justify-center rounded-lg text-foreground/70 transition hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button aria-hidden className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-display text-sm font-bold">Notifications</span>
              {unread > 0 ? (
                <button
                  onClick={() => markAll.mutate()}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length ? (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n.id, n.link, n.read)}
                    className={cn(
                      "block w-full border-b border-border px-4 py-3 text-left transition hover:bg-muted/60",
                      !n.read && "bg-brand-soft/40"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : <span className="mt-1.5 size-2 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
