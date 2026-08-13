"use client";

// app/admin/page.tsx — BharatSource Admin Control Center.
// Gated on useAuth().isAdmin. Left-nav tabbed sections for running the whole
// platform no-code: Overview, Sellers, Reports, Plans, Ads, Payments,
// Categories, Features and Site Config.

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import AdminLogin from "@/components/admin/AdminLogin";
import OverviewTab from "@/components/admin/OverviewTab";
import SellersTab from "@/components/admin/SellersTab";
import ReportsTab from "@/components/admin/ReportsTab";
import ModerationTab from "@/components/admin/ModerationTab";
import VerificationTab from "@/components/admin/VerificationTab";
import ListingVerificationTab from "@/components/admin/ListingVerificationTab";
import PlansTab from "@/components/admin/PlansTab";
import AdsTab from "@/components/admin/AdsTab";
import BoostsTab from "@/components/admin/BoostsTab";
import PaymentsTab from "@/components/admin/PaymentsTab";
import CategoriesTab from "@/components/admin/CategoriesTab";
import CollectionsTab from "@/components/admin/CollectionsTab";
import FeaturesTab from "@/components/admin/FeaturesTab";
import EntitlementsTab from "@/components/admin/EntitlementsTab";
import SiteConfigTab from "@/components/admin/SiteConfigTab";

type TabKey =
  | "overview"
  | "sellers"
  | "reports"
  | "moderation"
  | "verification"
  | "listingVerification"
  | "plans"
  | "ads"
  | "boosts"
  | "payments"
  | "categories"
  | "collections"
  | "features"
  | "entitlements"
  | "config";

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const icon = (d: string) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: icon("M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z") },
  { key: "sellers", label: "Sellers", icon: icon("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75") },
  { key: "reports", label: "Reports", icon: icon("M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v13ZM4 22v-7") },
  { key: "moderation", label: "Moderation", icon: icon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z") },
  { key: "verification", label: "Verification", icon: icon("M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z") },
  { key: "listingVerification", label: "Listing AI Check", icon: icon("M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8") },
  { key: "plans", label: "Plans", icon: icon("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82ZM7 7h.01") },
  { key: "ads", label: "Ads", icon: icon("M3 11l18-5v12L3 14v-3ZM11.6 16.8a3 3 0 1 1-5.8-1.6") },
  { key: "boosts", label: "Boosts", icon: icon("M12 19V5M5 12l7-7 7 7") },
  { key: "payments", label: "Payments", icon: icon("M1 4h22v16H1V4Zm0 6h22") },
  { key: "categories", label: "Categories", icon: icon("M3 7h18M3 12h18M3 17h18") },
  { key: "collections", label: "Collections", icon: icon("M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5") },
  { key: "features", label: "Features", icon: icon("M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11") },
  { key: "entitlements", label: "Entitlements", icon: icon("M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z") },
  { key: "config", label: "Site Config", icon: icon("M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6") },
];

const TITLES: Record<TabKey, string> = {
  overview: "Overview",
  sellers: "Sellers",
  reports: "Reports",
  moderation: "Moderation",
  verification: "Verification",
  listingVerification: "Listing AI Check",
  plans: "Plans",
  ads: "Ads",
  boosts: "Boosts",
  payments: "Payments",
  categories: "Categories",
  collections: "Collections",
  features: "Features",
  entitlements: "Entitlements",
  config: "Site Config",
};

function isTabKey(v: string): v is TabKey {
  return v in TITLES;
}

export default function AdminPage() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState<TabKey>("overview");

  // sync tab with URL hash so refresh/deep-links keep the section
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && isTabKey(h)) setTab(h);
  }, []);
  function goto(next: TabKey) {
    setTab(next);
    window.location.hash = next;
  }

  if (loading) {
    return (
      <div className="container-bs flex min-h-[60vh] items-center justify-center">
        <span
          className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border"
          style={{ borderTopColor: "var(--brand)" }}
        />
      </div>
    );
  }

  if (!user) return <AdminLogin />;
  if (!isAdmin) return <AdminLogin notAllowed />;

  return (
    <div className="container-bs py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Admin</div>
          <h1 className="text-h2 font-bold tracking-tight text-ink">
            Control Center
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">
            Signed in as <b className="text-ink">{user.name}</b>
          </span>
          <button
            type="button"
            onClick={logout}
            className="btn btn-secondary btn-sm"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left nav */}
        <aside className="lg:w-56 lg:flex-shrink-0">
          <nav
            className="no-scrollbar flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible"
            aria-label="Admin sections"
          >
            {NAV.map((n) => {
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => goto(n.key)}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-tint text-brand"
                      : "text-muted hover:bg-bg-subtle hover:text-ink"
                  }`}
                  style={active ? { fontWeight: 600 } : undefined}
                >
                  <span className={active ? "text-brand" : "text-faint"}>
                    {n.icon}
                  </span>
                  {n.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {tab === "overview" && <OverviewTab />}
          {tab === "sellers" && <SellersTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "moderation" && <ModerationTab />}
          {tab === "verification" && <VerificationTab />}
          {tab === "listingVerification" && <ListingVerificationTab />}
          {tab === "plans" && <PlansTab />}
          {tab === "ads" && <AdsTab />}
          {tab === "boosts" && <BoostsTab />}
          {tab === "payments" && <PaymentsTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "collections" && <CollectionsTab />}
          {tab === "features" && <FeaturesTab />}
          {tab === "entitlements" && <EntitlementsTab />}
          {tab === "config" && <SiteConfigTab />}
        </main>
      </div>
    </div>
  );
}
