"use client";

// app/admin/page.tsx — BharatSource Admin Control Center.
// Gated on useAuth().isAdmin. Two-level nav: a product SECTION switcher
// (Global / Directory / Recruitment / Credit Card / Mutual) and, within the
// active section, that section's tabs. See ADMIN-CONSOLE.md for the
// architecture decision and phase history behind this structure.

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import AdminLogin from "@/components/admin/AdminLogin";
import OverviewTab from "@/components/admin/OverviewTab";
import UsersTab from "@/components/admin/UsersTab";
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
import EmployersTab from "@/components/admin/EmployersTab";
import JobsAdminTab from "@/components/admin/JobsAdminTab";
import RecruitmentTaxonomyTab from "@/components/admin/RecruitmentTaxonomyTab";

type SectionKey = "global" | "directory" | "recruitment" | "creditcard" | "mutual";

type TabKey =
  | "overview"
  | "users"
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
  | "config"
  | "employers"
  | "jobsAdmin"
  | "taxonomy"
  | "recruitmentAds"
  | "recruitmentContent";

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

const ICONS: Record<TabKey, React.ReactNode> = {
  overview: icon("M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z"),
  users: icon("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"),
  sellers: icon("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"),
  reports: icon("M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v13ZM4 22v-7"),
  moderation: icon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
  verification: icon("M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"),
  listingVerification: icon("M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8"),
  plans: icon("M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82ZM7 7h.01"),
  ads: icon("M3 11l18-5v12L3 14v-3ZM11.6 16.8a3 3 0 1 1-5.8-1.6"),
  boosts: icon("M12 19V5M5 12l7-7 7 7"),
  payments: icon("M1 4h22v16H1V4Zm0 6h22"),
  categories: icon("M3 7h18M3 12h18M3 17h18"),
  collections: icon("M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5"),
  features: icon("M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"),
  entitlements: icon("M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"),
  config: icon("M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"),
  employers: icon("M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M9 15h.01M15 11h.01M15 15h.01"),
  jobsAdmin: icon("M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM10 5h4v2h-4V5Z"),
  taxonomy: icon("M4 6h16M4 12h10M4 18h16"),
  recruitmentAds: icon("M3 11l18-5v12L3 14v-3ZM11.6 16.8a3 3 0 1 1-5.8-1.6"),
  recruitmentContent: icon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"),
};

const nav = (key: TabKey, label: string): NavItem => ({ key, label, icon: ICONS[key] });

interface Section {
  key: SectionKey;
  label: string;
  tabs: NavItem[];
  defaultTab: TabKey | null;
}

// "sellers" is intentionally left out of the Directory section's visible tab
// list — its functionality (approve/reject/suspend + plan & monetization) now
// lives inside the Users tab's detail modal for seller accounts. The
// SellersTab component, its route, TabKey and TITLES entry are kept working
// (reachable via #directory:sellers) so nothing is deleted, just unlinked.
const SECTIONS: Section[] = [
  {
    key: "global",
    label: "Global",
    defaultTab: "overview",
    tabs: [
      nav("overview", "Overview"),
      nav("users", "Users"),
      nav("payments", "Payments"),
      nav("entitlements", "Entitlements"),
      nav("features", "Features"),
      nav("config", "Site Config"),
    ],
  },
  {
    key: "directory",
    label: "Directory",
    defaultTab: "categories",
    tabs: [
      nav("categories", "Categories"),
      nav("collections", "Collections"),
      nav("plans", "Plans"),
      nav("ads", "Ads"),
      nav("moderation", "Content"),
      nav("boosts", "Boosts"),
      nav("verification", "Verification"),
      nav("reports", "Reports"),
      nav("listingVerification", "Listing AI Check"),
    ],
  },
  {
    key: "recruitment",
    label: "Recruitment",
    defaultTab: "employers",
    tabs: [
      nav("employers", "Employers"),
      nav("jobsAdmin", "Jobs"),
      nav("taxonomy", "Taxonomy"),
      nav("recruitmentAds", "Ads"),
      nav("recruitmentContent", "Content"),
    ],
  },
  {
    key: "creditcard",
    label: "Credit Card",
    defaultTab: null,
    tabs: [],
  },
  {
    key: "mutual",
    label: "Mutual",
    defaultTab: null,
    tabs: [],
  },
];

const SECTION_LABEL: Record<SectionKey, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s.label])
) as Record<SectionKey, string>;

const ALL_TAB_KEYS = new Set<string>(SECTIONS.flatMap((s) => s.tabs.map((t) => t.key)).concat(["sellers"]));

function isSectionKey(v: string): v is SectionKey {
  return v === "global" || v === "directory" || v === "recruitment" || v === "creditcard" || v === "mutual";
}
function isTabKey(v: string): v is TabKey {
  return ALL_TAB_KEYS.has(v);
}

const TITLES: Record<TabKey, string> = {
  overview: "Overview",
  users: "Users",
  sellers: "Sellers",
  reports: "Reports",
  moderation: "Content",
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
  employers: "Employers",
  jobsAdmin: "Jobs",
  taxonomy: "Taxonomy",
  recruitmentAds: "Ads",
  recruitmentContent: "Content",
};

export default function AdminPage() {
  const { user, loading, isAdmin, logout } = useAuth();
  const [section, setSection] = useState<SectionKey>("global");
  const [tab, setTab] = useState<TabKey>("overview");

  // sync section+tab with URL hash (#section:tab) so refresh/deep-links keep the place
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    const [sPart, tPart] = h.split(":");
    if (sPart && isSectionKey(sPart)) setSection(sPart);
    if (tPart && isTabKey(tPart)) setTab(tPart);
    else if (sPart && isSectionKey(sPart)) {
      const found = SECTIONS.find((s) => s.key === sPart);
      if (found?.defaultTab) setTab(found.defaultTab);
    }
  }, []);
  function gotoSection(next: SectionKey) {
    setSection(next);
    const found = SECTIONS.find((s) => s.key === next);
    const nextTab = found?.defaultTab;
    if (nextTab) {
      setTab(nextTab);
      window.location.hash = `${next}:${nextTab}`;
    } else {
      window.location.hash = next;
    }
  }
  function goto(next: TabKey) {
    setTab(next);
    window.location.hash = `${section}:${next}`;
  }

  const activeSection = SECTIONS.find((s) => s.key === section) || SECTIONS[0];
  // "sellers" is reachable via #directory:sellers even though it's unlinked
  // from the visible Directory tab list (see the SECTIONS comment above).
  const tabInSection =
    activeSection.tabs.some((t) => t.key === tab) || (section === "directory" && tab === "sellers");

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

      {/* Product section switcher */}
      <div
        className="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-lg bg-bg-subtle p-1"
        role="tablist"
        aria-label="Admin product sections"
      >
        {SECTIONS.map((s) => {
          const active = section === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => gotoSection(s.key)}
              className={`flex-shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-white text-brand shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left nav — active section's tabs */}
        {activeSection.tabs.length > 0 && (
          <aside className="lg:w-56 lg:flex-shrink-0">
            <nav
              className="no-scrollbar flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible"
              aria-label={`${activeSection.label} sections`}
            >
              {activeSection.tabs.map((n) => {
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
        )}

        {/* Content */}
        <main className="min-w-0 flex-1">
          {activeSection.tabs.length === 0 && (
            <div className="card-flat flex min-h-[240px] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="font-medium text-ink">Nothing here yet</p>
              <p className="max-w-sm text-sm text-muted">
                {SECTION_LABEL[activeSection.key]} admin tools haven&apos;t been built out yet.
              </p>
            </div>
          )}
          {tabInSection && (
            <>
              {tab === "overview" && <OverviewTab />}
              {tab === "users" && <UsersTab />}
              {tab === "sellers" && <SellersTab />}
              {tab === "reports" && <ReportsTab />}
              {tab === "moderation" && <ModerationTab product="directory" />}
              {tab === "verification" && <VerificationTab />}
              {tab === "listingVerification" && <ListingVerificationTab />}
              {tab === "plans" && <PlansTab />}
              {tab === "ads" && <AdsTab product="directory" />}
              {tab === "boosts" && <BoostsTab />}
              {tab === "payments" && <PaymentsTab />}
              {tab === "categories" && <CategoriesTab />}
              {tab === "collections" && <CollectionsTab />}
              {tab === "features" && <FeaturesTab />}
              {tab === "entitlements" && <EntitlementsTab />}
              {tab === "config" && <SiteConfigTab />}
              {tab === "employers" && <EmployersTab />}
              {tab === "jobsAdmin" && <JobsAdminTab />}
              {tab === "taxonomy" && <RecruitmentTaxonomyTab />}
              {tab === "recruitmentAds" && <AdsTab product="recruitment" />}
              {tab === "recruitmentContent" && <ModerationTab product="recruitment" />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
