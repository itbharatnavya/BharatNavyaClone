"use client";

// components/dashboard/AnalyticsTab.tsx — SELLER ANALYTICS.
//
// A clean performance snapshot for the signed-in seller, computed server-side from
// their listings (views), the lead ledger, inquiries and approved reviews
// (GET /api/me/analytics). Top stat cards, a hand-drawn SVG "Views by listing" bar
// chart, a "Leads by listing" list, and an upsell nudge that deep-links to the
// Promote tab — the whole tab exists to show sellers where a boost would pay off.
//
// Charts are hand-drawn inline SVG (no chart library, no npm dep, no emoji).

import React, { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { getMyAnalytics, type SellerAnalytics } from "@/lib/api";
import Button from "@/components/Button";
import { PanelHeader, StatCard, EmptyState, Loading, Icon, useTr } from "./shared";

interface Props {
  user: User;
  // Deep-links used by the analytics nudges (both are real dashboard tabs).
  onNavigate: (tab: "promote" | "listings") => void;
}

// One-decimal, comma-grouped integer formatter for the big numbers.
function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n || 0));
}

// A single horizontal bar row: label + value + a hand-drawn SVG bar. Bars use
// percentage widths inside the SVG so they stay responsive with no overflow.
function BarRow({
  label,
  value,
  pct,
  suffix,
  accent = "var(--brand)",
}: {
  label: string;
  value: number;
  pct: number;
  suffix: string;
  accent?: string;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <span
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--ink)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", flexShrink: 0 }}>
          {fmt(value)} {suffix}
        </span>
      </div>
      <svg
        width="100%"
        height="12"
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: ${fmt(value)} ${suffix}`}
        style={{ display: "block", borderRadius: "var(--r-xs)", overflow: "hidden" }}
      >
        <rect x="0" y="0" width="100" height="12" rx="6" fill="var(--bg-subtle)" />
        {width > 0 && (
          <rect x="0" y="0" width={width} height="12" rx="6" fill={accent} />
        )}
      </svg>
    </div>
  );
}

export default function AnalyticsTab({ user, onNavigate }: Props) {
  const tr = useTr();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SellerAnalytics | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyAnalytics();
        if (alive) setData(res);
      } catch (e) {
        if (alive) setError((e as Error).message || "Failed to load analytics");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user.id]);

  if (loading) return <Loading />;

  if (error || !data) {
    return (
      <div>
        <PanelHeader
          title={tr("dashboard.analytics.title", "Analytics")}
          subtitle={tr(
            "dashboard.analytics.subtitle",
            "See how your listings are performing."
          )}
        />
        <EmptyState
          icon={<Icon name="overview" size={22} />}
          title={tr("dashboard.analytics.error", "Couldn't load analytics")}
          subtitle={error || undefined}
        />
      </div>
    );
  }

  const viewRows = data.listings.filter((l) => l.views > 0);
  const maxViews = viewRows.reduce((m, l) => Math.max(m, l.views), 0);
  const leadRows = [...data.listings]
    .filter((l) => l.leads > 0)
    .sort((a, b) => b.leads - a.leads);
  const maxLeads = leadRows.reduce((m, l) => Math.max(m, l.leads), 0);

  return (
    <div>
      <PanelHeader
        title={tr("dashboard.analytics.title", "Analytics")}
        subtitle={tr(
          "dashboard.analytics.subtitle",
          "How your listings are performing — views, leads and reputation."
        )}
        actions={
          <Button
            variant="primary"
            onClick={() => onNavigate("promote")}
            leftIcon={<Icon name="listings" size={16} />}
          >
            {tr("dashboard.analytics.promoteCta", "Promote a listing")}
          </Button>
        }
      />

      {/* Top stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label={tr("dashboard.analytics.listings", "Listings")}
          value={fmt(data.totalListings)}
          hint={tr(
            "dashboard.analytics.listingsHint",
            `${data.activeListings} active · ${data.featuredListings} featured`
          )}
          icon={<Icon name="listings" size={18} />}
        />
        <StatCard
          label={tr("dashboard.analytics.views", "Total views")}
          value={fmt(data.totalViews)}
          accent="var(--action)"
          hint={tr("dashboard.analytics.viewsHint", "Across all your listings")}
          icon={<Icon name="external" size={18} />}
        />
        <StatCard
          label={tr("dashboard.analytics.leads", "Leads")}
          value={fmt(data.totalLeads)}
          accent="var(--success)"
          hint={tr(
            "dashboard.analytics.leadsHint",
            `${data.openInquiries} open enquiries`
          )}
          icon={<Icon name="leads" size={18} />}
        />
        <StatCard
          label={tr("dashboard.analytics.rating", "Avg rating")}
          value={data.reviewCount > 0 ? data.avgRating.toFixed(1) : "—"}
          hint={tr(
            "dashboard.analytics.ratingHint",
            `${data.reviewCount} review${data.reviewCount === 1 ? "" : "s"} · ${Math.round(
              data.responseRate
            )}% response`
          )}
          icon={<Icon name="reviews" size={18} />}
        />
      </div>

      {/* Views by listing — hand-drawn SVG bar chart */}
      <div className="card card-flat" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icon name="overview" size={18} style={{ color: "var(--brand)" }} />
          <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
            {tr("dashboard.analytics.viewsByListing", "Views by listing")}
          </h2>
        </div>
        {viewRows.length === 0 ? (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            {tr(
              "dashboard.analytics.noViews",
              "No views yet. Share your listings or promote them to get seen."
            )}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {viewRows.map((l) => (
              <BarRow
                key={l.id}
                label={l.title}
                value={l.views}
                pct={maxViews > 0 ? (l.views / maxViews) * 100 : 0}
                suffix={tr("dashboard.analytics.viewsUnit", "views")}
                accent="var(--brand)"
              />
            ))}
          </div>
        )}
      </div>

      {/* Leads by listing */}
      <div className="card card-flat" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icon name="leads" size={18} style={{ color: "var(--success)" }} />
          <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
            {tr("dashboard.analytics.leadsByListing", "Leads by listing")}
          </h2>
        </div>
        {leadRows.length === 0 ? (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            {tr(
              "dashboard.analytics.noLeads",
              "No leads yet. A boosted listing shows higher and attracts more enquiries."
            )}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {leadRows.map((l) => (
              <BarRow
                key={l.id}
                label={l.title}
                value={l.leads}
                pct={maxLeads > 0 ? (l.leads / maxLeads) * 100 : 0}
                suffix={tr("dashboard.analytics.leadsUnit", "leads")}
                accent="var(--success)"
              />
            ))}
          </div>
        )}
      </div>

      {/* Upsell nudge → Promote tab */}
      <div
        className="card"
        style={{
          padding: 20,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          flexWrap: "wrap",
          borderColor: "var(--brand)",
          background: "var(--brand-tint)",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            width: 40,
            height: 40,
            borderRadius: "var(--r-sm)",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            color: "var(--brand)",
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
            {tr(
              "dashboard.analytics.upsellTitle",
              "Boost a listing to get more views"
            )}
          </h2>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 4 }}>
            {tr(
              "dashboard.analytics.upsell",
              "Feature a listing, pin it to the top of its category, or lift its search rank — more visibility means more leads."
            )}
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate("promote")}>
          {tr("dashboard.analytics.upsellCta", "Promote now")}
        </Button>
      </div>
    </div>
  );
}
