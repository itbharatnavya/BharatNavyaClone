"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useConfig } from "@/lib/config";
import Button from "@/components/Button";
import Avatar from "@/components/Avatar";
import { Icon, Loading, useTr, type TabId } from "./shared";

import OverviewTab from "./OverviewTab";
import AnalyticsTab from "./AnalyticsTab";
import ListingsTab from "./ListingsTab";
import PromoteTab from "./PromoteTab";
import BulkUploadTab from "./BulkUploadTab";
import LeadsTab from "./LeadsTab";
import MyRfqsTab from "./MyRfqsTab";
import SavedTab from "./SavedTab";
import FollowingTab from "./FollowingTab";
import ReviewsTab from "./ReviewsTab";
import BlogsTab from "./BlogsTab";
import StoriesTab from "./StoriesTab";
import SubscriptionTab from "./SubscriptionTab";
import ReferralTab from "./ReferralTab";
import ProfileTab from "./ProfileTab";
import AdvertiseTab from "./AdvertiseTab";
import ConsultationsTab from "./ConsultationsTab";

// Local widening of the shared TabId with this dashboard's own tabs ("advertise",
// buyer "myrfqs", "bulk", "analytics", "promote", expert "consultations").
// (shared.tsx's TabId union is a shared contract we don't edit here.)
type DashTabId =
  | TabId
  | "advertise"
  | "myrfqs"
  | "bulk"
  | "analytics"
  | "promote"
  | "consultations"
  | "saved"
  | "following";

interface TabMeta {
  id: DashTabId;
  label: string;
  icon: string;
  flag?: string; // featureFlags key that must be truthy to show
  expertOnly?: boolean; // only for Consultations experts (sellerProfile.expert set)
  sellerOnly?: boolean; // only once the main user has become a Directory seller (sellerProfile set)
}

const ALL_TABS: TabMeta[] = [
  { id: "overview", label: "Overview", icon: "overview", sellerOnly: true },
  { id: "analytics", label: "Analytics", icon: "analytics", sellerOnly: true },
  { id: "listings", label: "My listings", icon: "listings", sellerOnly: true },
  { id: "promote", label: "Promote", icon: "promote", sellerOnly: true },
  { id: "bulk", label: "Bulk upload", icon: "bulk", sellerOnly: true },
  { id: "leads", label: "RFQs", icon: "leads", sellerOnly: true },
  { id: "consultations", label: "Consultation requests", icon: "consultations", flag: "consultationsLive", expertOnly: true },
  { id: "myrfqs", label: "My RFQs", icon: "myrfqs" },
  { id: "saved", label: "Saved", icon: "saved" },
  { id: "following", label: "Following", icon: "following", flag: "follow" },
  { id: "reviews", label: "Reviews", icon: "reviews", sellerOnly: true },
  { id: "blogs", label: "Blogs", icon: "blogs", sellerOnly: true },
  { id: "stories", label: "Stories", icon: "stories", flag: "stories", sellerOnly: true },
  { id: "advertise", label: "Advertise", icon: "advertise", sellerOnly: true },
  { id: "subscription", label: "Subscription", icon: "subscription", sellerOnly: true },
  { id: "referral", label: "Referral", icon: "referral", flag: "referral" },
  { id: "profile", label: "Profile", icon: "profile" },
];

// Megaphone icon for the Advertise tab. Kept local because shared.tsx's icon set is a
// shared contract; matches the Icon component's rendering (viewBox 0 0 24 24, stroke).
function AdIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

// Document-with-price-tag icon for the buyer "My RFQs" tab. Kept local because
// shared.tsx's icon set is a shared contract; matches Icon's render conventions.
function RfqIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h6M8 17h4" />
    </svg>
  );
}

// Upload-to-table icon for the "Bulk upload" tab. Kept local because shared.tsx's icon
// set is a shared contract; matches Icon's render conventions (viewBox 0 0 24 24, stroke).
function BulkIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="M12 3v10" />
      <path d="m8 7 4-4 4 4" />
      <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      <path d="M4 17h16" />
    </svg>
  );
}

// Bar-chart icon for the Analytics tab. Kept local because shared.tsx's icon set is a
// shared contract; matches Icon's render conventions (viewBox 0 0 24 24, stroke).
function AnalyticsIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="5" rx="0.5" />
      <rect x="12.5" y="8" width="3" height="9" rx="0.5" />
      <rect x="18" y="5" width="3" height="12" rx="0.5" />
    </svg>
  );
}

// Rocket icon for the "Promote" tab (self-serve boosts). Kept local because
// shared.tsx's icon set is a shared contract; matches Icon's render conventions.
function PromoteIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2a2.1 2.1 0 0 0-3-3Z" />
      <path d="M12 15 9 12a11 11 0 0 1 6-8 11 11 0 0 1 5-2 11 11 0 0 1-2 5 11 11 0 0 1-6 8Z" />
      <path d="M15 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

// Calendar icon for the expert "Consultation requests" tab. Kept local because
// shared.tsx's icon set is a shared contract; matches Icon's render conventions.
function ConsultIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
      <path d="M8.5 13.5h3M8.5 16.5h6" />
    </svg>
  );
}

// Heart icon for the buyer "Saved" (shortlist) tab. Kept local because
// shared.tsx's icon set is a shared contract; matches Icon's render conventions.
function SavedIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

// People icon for the buyer "Following" (followed sellers) tab. Kept local
// because shared.tsx's icon set is a shared contract; matches Icon's render conventions.
function FollowingIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export default function DashboardShell() {
  const tr = useTr();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useRequireAuth();
  const narrow = useIsNarrow();

  // feature flags come from admin config (useConfig is a shared-additions contract item)
  const cfg = useConfig() as { featureFlags?: Record<string, boolean> } | null | undefined;
  const flags: Record<string, boolean> = cfg?.featureFlags || {};

  // The "Consultation requests" tab is only meaningful for Consultations experts
  // (sellers whose profile carries an `expert` block). Hide it for everyone else.
  const isExpert = !!(user?.sellerProfile as { expert?: unknown } | undefined)?.expert;
  const isSeller = !!user?.sellerProfile;
  const tabs = useMemo(
    () =>
      ALL_TABS.filter((t) => {
        if (t.flag && !flags[t.flag]) return false;
        if (t.expertOnly && !isExpert) return false;
        if (t.sellerOnly && !isSeller) return false;
        return true;
      }),
    [flags, isExpert, isSeller]
  );

  const tabParam = searchParams.get("tab") as DashTabId | null;
  // Default landing tab: sellers land on Overview as before; a plain main user
  // (no sellerProfile — Overview is sellerOnly and filtered out) lands on Profile,
  // the one tab they actually have.
  const active: DashTabId = tabs.some((t) => t.id === tabParam)
    ? (tabParam as DashTabId)
    : isSeller
      ? "overview"
      : "profile";

  // Redirect-if-unauthenticated is now handled by useRequireAuth() above.

  function setTab(id: DashTabId) {
    const qs = new URLSearchParams(Array.from(searchParams.entries()));
    qs.set("tab", id);
    qs.delete("c");
    router.replace(`/dashboard?${qs.toString()}`, { scroll: false });
  }

  if (loading) {
    return (
      <div className="container-bs" style={{ paddingTop: 60, paddingBottom: 60 }}>
        <Loading label={tr("dashboard.loading", "Loading your dashboard…")} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-bs" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div
          className="card card-flat"
          style={{ maxWidth: 440, margin: "0 auto", padding: 32, textAlign: "center" }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              margin: "0 auto 14px",
              background: "var(--brand-tint)",
              color: "var(--brand)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="profile" size={24} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
            {tr("dashboard.gate.title", "Sign in to view your dashboard")}
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, marginBottom: 20 }}>
            {tr("dashboard.gate.subtitle", "Manage your listings, leads and profile in one place.")}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Button href="/login" variant="primary">
              {tr("dashboard.gate.login", "Log in")}
            </Button>
            <Button href="/login" variant="secondary">
              {tr("dashboard.gate.register", "Create account")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const nav = (
    <nav
      className={narrow ? "no-scrollbar" : undefined}
      style={
        narrow
          ? {
              alignSelf: "stretch",
              width: "100%",
              minWidth: 0,
              display: "flex",
              gap: 6,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
              paddingBottom: 4,
              borderBottom: "1px solid var(--border)",
              marginBottom: 20,
            }
          : {
              width: 224,
              flexShrink: 0,
              position: "sticky",
              top: 84,
              maxHeight: "calc(100vh - 104px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              paddingRight: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }
      }
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: narrow ? "9px 14px" : "10px 12px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--brand)" : "var(--muted)",
              background: isActive ? "var(--brand-tint)" : "transparent",
            }}
          >
            {t.icon === "advertise" ? (
              <AdIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "consultations" ? (
              <ConsultIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "myrfqs" ? (
              <RfqIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "bulk" ? (
              <BulkIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "analytics" ? (
              <AnalyticsIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "promote" ? (
              <PromoteIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "saved" ? (
              <SavedIcon size={18} style={{ flexShrink: 0 }} />
            ) : t.icon === "following" ? (
              <FollowingIcon size={18} style={{ flexShrink: 0 }} />
            ) : (
              <Icon name={t.icon} size={18} style={{ flexShrink: 0 }} />
            )}
            {tr(`dashboard.tab.${t.id}`, t.label)}
          </button>
        );
      })}
    </nav>
  );

  function renderActive() {
    if (!user) return null;
    switch (active) {
      case "overview":
        return <OverviewTab user={user} onNavigate={setTab} />;
      case "analytics":
        return <AnalyticsTab user={user} onNavigate={setTab} />;
      case "listings":
        return <ListingsTab user={user} />;
      case "promote":
        return <PromoteTab user={user} />;
      case "bulk":
        return <BulkUploadTab user={user} />;
      case "leads":
        return <LeadsTab user={user} />;
      case "consultations":
        return <ConsultationsTab user={user} />;
      case "myrfqs":
        return <MyRfqsTab user={user} />;
      case "saved":
        return <SavedTab user={user} />;
      case "following":
        return <FollowingTab user={user} />;
      case "reviews":
        return <ReviewsTab user={user} />;
      case "blogs":
        return <BlogsTab user={user} />;
      case "stories":
        return <StoriesTab user={user} />;
      case "advertise":
        return <AdvertiseTab user={user} />;
      case "subscription":
        return <SubscriptionTab user={user} />;
      case "referral":
        return <ReferralTab user={user} />;
      case "profile":
        return <ProfileTab user={user} />;
      default:
        return isSeller ? <OverviewTab user={user} onNavigate={setTab} /> : <ProfileTab user={user} />;
    }
  }

  return (
    <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 64 }}>
      {/* header strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <Avatar name={user.name} src={user.avatarUrl} size={44} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{user.name}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {user.sellerProfile?.companyName ||
              [user.city, user.state].filter(Boolean).join(", ") ||
              user.mobile}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", gap: 28, alignItems: "flex-start" }}>
        {tabs.length > 1 && nav}
        <div style={{ flex: 1, minWidth: 0, width: "100%" }}>{renderActive()}</div>
      </div>
    </div>
  );
}
