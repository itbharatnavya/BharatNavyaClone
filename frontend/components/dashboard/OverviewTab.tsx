"use client";

import React, { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { getMyListings, getMyRfqDeliveries, getNotifications } from "@/lib/api";
import Button from "@/components/Button";
import {
  PanelHeader,
  StatCard,
  EmptyState,
  Loading,
  Icon,
  useTr,
  timeAgo,
  type DashNotification,
  type TabId,
} from "./shared";

interface Props {
  user: User;
  onNavigate: (tab: TabId) => void;
}

export default function OverviewTab({ user, onNavigate }: Props) {
  const tr = useTr();
  const [loading, setLoading] = useState(true);
  const [listingCount, setListingCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [notifications, setNotifications] = useState<DashNotification[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Each source is independent; a failure in one shouldn't blank the rest.
      const [listingsRes, rfqsRes, notifRes] = await Promise.allSettled([
        getMyListings(),
        getMyRfqDeliveries({ limit: 1 }),
        getNotifications(),
      ]);
      if (!alive) return;

      if (listingsRes.status === "fulfilled") {
        setListingCount((listingsRes.value || []).length);
      }
      if (rfqsRes.status === "fulfilled") {
        setLeadCount(rfqsRes.value.total);
      }
      if (notifRes.status === "fulfilled") {
        // getNotifications() resolves to { notifications, unreadCount } — pull the
        // array out (and stay defensive if a bare array is ever returned).
        const v = notifRes.value as unknown as
          | { notifications?: DashNotification[] }
          | DashNotification[];
        setNotifications(
          (Array.isArray(v) ? v : v?.notifications || []) as DashNotification[]
        );
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  if (loading) return <Loading />;

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.overview.title", `Welcome back, ${user.name.split(" ")[0]}`)}
        subtitle={tr("dashboard.overview.subtitle", "Here's what's happening across your account.")}
        actions={
          <Button href="/sell" variant="primary" leftIcon={<Icon name="plus" size={16} />}>
            {tr("dashboard.postNew", "Post new")}
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label={tr("dashboard.stat.listings", "My listings")}
          value={listingCount}
          hint={tr("dashboard.stat.listingsHint", "Active & draft items")}
          icon={<Icon name="listings" size={18} />}
        />
        <StatCard
          label={tr("dashboard.stat.leads", "RFQs")}
          value={leadCount}
          accent="var(--success)"
          hint={tr("dashboard.stat.leadsHint", "Buyer enquiries delivered")}
          icon={<Icon name="leads" size={18} />}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon name="bell" size={18} style={{ color: "var(--brand)" }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
          {tr("dashboard.recentActivity", "Recent notifications")}
        </h2>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Icon name="bell" size={22} />}
          title={tr("dashboard.noNotifications", "No notifications yet")}
          subtitle={tr(
            "dashboard.noNotificationsHint",
            "Leads, messages and reviews will show up here."
          )}
        />
      ) : (
        <div className="card card-flat" style={{ overflow: "hidden" }}>
          {notifications.slice(0, 8).map((n, i) => {
            const read = n.read ?? n.isRead ?? false;
            const text = n.title || n.message || n.body || "Notification";
            return (
              <div
                key={n.id || i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 18px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  background: read ? "transparent" : "var(--brand-tint)",
                }}
              >
                <span
                  style={{
                    marginTop: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: read ? "var(--border-strong)" : "var(--brand)",
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: read ? 500 : 600 }}>
                    {text}
                  </div>
                  {n.body && n.body !== text && (
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{n.body}</div>
                  )}
                </div>
                {n.createdAt && (
                  <span style={{ fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap" }}>
                    {timeAgo(n.createdAt)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
        <Button variant="secondary" onClick={() => onNavigate("listings")}>
          {tr("dashboard.manageListings", "Manage listings")}
        </Button>
        <Button variant="secondary" onClick={() => onNavigate("leads")}>
          {tr("dashboard.viewLeads", "View leads")}
        </Button>
        <Button variant="ghost" onClick={() => onNavigate("profile")}>
          {tr("dashboard.editProfile", "Edit profile")}
        </Button>
      </div>
    </div>
  );
}
