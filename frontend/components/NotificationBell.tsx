"use client";

// NotificationBell — polls the current user's notifications every ~30s, shows an
// unread badge, and a dropdown list where each item can be marked read (and
// "Mark all read"). Rendered only when logged in AND featureFlags.notifications
// is on (the Navbar gates it), but it degrades to null while empty.

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api";
import type { NotificationItem } from "@/lib/api";
import { useT } from "@/lib/i18n";

const POLL_MS = 30_000;

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

// Human-readable line for a notification from its machine type + data payload.
function describe(n: NotificationItem): string {
  const data = (n.data || {}) as Record<string, unknown>;
  const who = typeof data.name === "string" ? data.name : "Someone";
  switch (n.type) {
    case "new_follower":
      return `${who} started following you`;
    case "new_message":
      return `New message${data.from ? ` from ${String(data.from)}` : ""}`;
    case "new_lead":
    case "new_inquiry": {
      const product =
        typeof data.productName === "string" && data.productName.trim()
          ? data.productName.trim()
          : "";
      if (product && who !== "Someone") return `New lead — ${who} is looking for ${product}`;
      if (product) return `New lead — ${product}`;
      return "You have a new lead";
    }
    case "new_review":
      return `${who} left a review`;
    // Recruitment (build plan Phase 6) — previously fell through to the raw-text
    // default below.
    case "new_application": {
      const job = typeof data.jobTitle === "string" && data.jobTitle ? data.jobTitle : "your job";
      const candidate = typeof data.candidateName === "string" && data.candidateName ? data.candidateName : "Someone";
      return `${candidate} applied for ${job}`;
    }
    case "application_withdrawn": {
      const job = typeof data.jobTitle === "string" && data.jobTitle ? data.jobTitle : "your job";
      const candidate = typeof data.candidateName === "string" && data.candidateName ? data.candidateName : "A candidate";
      return `${candidate} withdrew their application for ${job}`;
    }
    case "application_status": {
      const job = typeof data.jobTitle === "string" && data.jobTitle ? data.jobTitle : "a role";
      const status = typeof data.status === "string" ? data.status : "updated";
      return `Your application for ${job} is now ${status}`;
    }
    default:
      return typeof data.message === "string"
        ? data.message
        : n.type.replace(/_/g, " ");
  }
}

// Where clicking a notification should navigate — Recruitment types only (build plan
// Phase 6); every other existing type keeps its current mark-read-only behavior (null
// here means "no navigation"), so this is purely additive for Directory/suite notifications.
function notificationHref(n: NotificationItem): string | null {
  const data = (n.data || {}) as Record<string, unknown>;
  const jobId = typeof data.jobId === "string" ? data.jobId : null;
  switch (n.type) {
    case "new_application":
    case "application_withdrawn":
      return jobId ? `/recruitment/dashboard?tab=applications&job=${jobId}` : "/recruitment/dashboard?tab=applications";
    case "application_status":
      return "/recruitment/dashboard?tab=myapplications";
    default:
      return null;
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function NotificationBell() {
  const { t } = useT();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const { notifications, unreadCount } = await getNotifications();
      setItems(notifications);
      setUnread(unreadCount);
    } catch {
      /* silent — a failed poll shouldn't disrupt the nav */
    }
  }, []);

  // Initial load + steady polling.
  useEffect(() => {
    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    try {
      await markNotificationRead(id);
    } catch {
      /* optimistic; a later poll reconciles */
    }
  }, []);

  const onReadAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      /* optimistic */
    }
  }, []);

  // Recruitment click-through (build plan Phase 6) — navigates when the notification
  // has a known destination, always marks read regardless. Every other existing
  // notification type has no destination (notificationHref returns null) and keeps the
  // original mark-read-only behavior.
  const onItemClick = useCallback(
    (n: NotificationItem) => {
      if (!n.read) onRead(n.id);
      const href = notificationHref(n);
      if (href) {
        setOpen(false);
        router.push(href);
      }
    },
    [onRead, router]
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("common.notifications")}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-bg-subtle hover:text-ink transition-colors"
      >
        <BellIcon />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: "#DC2626" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card card-flat p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-ink">
              {t("common.notifications")}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={onReadAll}
                className="text-xs text-brand hover:underline"
              >
                {t("common.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-faint">
                {t("common.noResults")}
              </div>
            ) : (
              items.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onItemClick(n)}
                  className={`flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-bg-subtle transition-colors ${
                    n.read ? "" : "bg-bg-subtle/60"
                  }`}
                >
                  <span
                    className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: n.read ? "transparent" : "#2563EB" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink line-clamp-2">
                      {describe(n)}
                    </span>
                    <span className="mt-0.5 block text-xs text-faint">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5 text-center">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-muted hover:text-ink"
            >
              {t("nav.dashboard")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
