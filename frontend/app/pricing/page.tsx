"use client";

// /pricing — public Free / Silver / Gold comparison.
// Plan headers come from adminPlans() when available (it's auth-gated, so we
// fall back to sensible defaults). The capability matrix is always built from
// the public getFeatures(), checking each feature's `plans` for the tier.

import React, { useEffect, useMemo, useState } from "react";
import { adminPlans, getFeatures, type Feature } from "@/lib/api";
import type { SubscriptionPlan, PlanTier } from "@/lib/types";
import Button from "@/components/Button";
import { useTr } from "@/components/discovery/hooks";

interface TierMeta {
  tier: PlanTier;
  name: string;
  price: number;
  currency: string;
  cycle: string;
  tagline: string;
  highlight: boolean;
}

const DEFAULT_TIERS: TierMeta[] = [
  {
    tier: "free",
    name: "Free",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    tagline: "Get discovered",
    highlight: false,
  },
  {
    tier: "silver",
    name: "Silver",
    price: 999,
    currency: "INR",
    cycle: "monthly",
    tagline: "Grow your reach",
    highlight: false,
  },
  {
    tier: "gold",
    name: "Gold",
    price: 2999,
    currency: "INR",
    cycle: "monthly",
    tagline: "Lead your market",
    highlight: true,
  },
];

const money = (n: number, currency = "INR") =>
  currency === "INR" ? `₹${n.toLocaleString("en-IN")}` : `${currency} ${n}`;

export default function PricingPage() {
  const tr = useTr();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getFeatures(), adminPlans()]).then((res) => {
      if (!active) return;
      if (res[0].status === "fulfilled") setFeatures(res[0].value);
      if (res[1].status === "fulfilled") setPlans(res[1].value);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Merge admin plan data over defaults, keyed by tier.
  const tiers: TierMeta[] = useMemo(() => {
    return DEFAULT_TIERS.map((d) => {
      const p = plans.find((pl) => pl.tier === d.tier);
      if (!p) return d;
      return {
        ...d,
        name: p.name || d.name,
        price: typeof p.price === "number" ? p.price : d.price,
        currency: p.currency || d.currency,
        cycle: p.billingCycle || d.cycle,
        highlight: p.highlighted ?? d.highlight,
      };
    });
  }, [plans]);

  // Features grouped by `group`, ordered by first appearance.
  const grouped = useMemo(() => {
    const map = new Map<string, Feature[]>();
    features.forEach((f) => {
      const g = f.group || "Other";
      const arr = map.get(g) || [];
      arr.push(f);
      map.set(g, arr);
    });
    return Array.from(map.entries());
  }, [features]);

  const hasTier = (f: Feature, tier: PlanTier) =>
    Array.isArray(f.plans) && (f.plans as string[]).includes(tier);

  const TIER_KEYS: PlanTier[] = ["free", "silver", "gold"];

  return (
    <div className="container-bs section-pad-sm">
      {/* Hero */}
      <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 8px" }}>
        <span className="eyebrow">{tr("pricing.eyebrow", "Pricing")}</span>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginTop: 10,
          }}
        >
          {tr("pricing.title", "Simple, honest pricing")}
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 16 }}>
          {tr(
            "pricing.subtitle",
            "Start free and get found. Upgrade for more reach, leads and placement. Paid plans are activated by our team — no card needed."
          )}
        </p>
      </div>

      {/* Plan cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          maxWidth: 900,
          margin: "36px auto 0",
        }}
      >
        {tiers.map((t) => (
          <div
            key={t.tier}
            className="card card-flat"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              borderColor: t.highlight ? "var(--brand)" : "var(--border)",
              outline: t.highlight ? "2px solid var(--brand)" : "none",
              position: "relative",
            }}
          >
            {t.highlight && (
              <span
                className="badge badge-verified"
                style={{ position: "absolute", top: 16, right: 16 }}
              >
                {tr("pricing.mostPopular", "Most popular")}
              </span>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
              {t.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {t.tagline}
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {t.price === 0 ? tr("pricing.free", "Free") : money(t.price, t.currency)}
              </span>
              {t.price > 0 && (
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  /{t.cycle === "yearly" ? "yr" : t.cycle === "quarterly" ? "qtr" : "mo"}
                </span>
              )}
            </div>
            <div style={{ marginTop: 20 }}>
              <Button
                block
                href="/register"
                variant={t.highlight ? "primary" : "secondary"}
              >
                {t.tier === "free" ? tr("pricing.startFree", "Start free") : `${tr("pricing.choose", "Choose")} ${t.name}`}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison matrix */}
      <div style={{ maxWidth: 900, margin: "48px auto 0" }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          {tr("pricing.compare", "Compare capabilities")}
        </h2>

        {loading ? (
          <div className="skeleton" style={{ height: 280, width: "100%" }} />
        ) : grouped.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            {tr("pricing.catalogSetup", "Feature catalog is being set up.")}
          </p>
        ) : (
          <div className="card card-flat" style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 560,
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 18px",
                      fontWeight: 600,
                      color: "var(--muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {tr("pricing.capability", "Capability")}
                  </th>
                  {tiers.map((t) => (
                    <th
                      key={t.tier}
                      style={{
                        padding: "14px 18px",
                        fontWeight: 700,
                        textAlign: "center",
                        color: t.highlight ? "var(--brand)" : "var(--ink)",
                        borderBottom: "1px solid var(--border)",
                        minWidth: 96,
                      }}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(([group, items]) => (
                  <React.Fragment key={group}>
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: "14px 18px 6px",
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--brand)",
                          background: "var(--bg-subtle)",
                        }}
                      >
                        {group}
                      </td>
                    </tr>
                    {items.map((f) => (
                      <tr key={f.id}>
                        <td
                          style={{
                            padding: "12px 18px",
                            borderBottom: "1px solid var(--border)",
                            color: "var(--ink)",
                          }}
                        >
                          {f.name}
                        </td>
                        {TIER_KEYS.map((tier) => (
                          <td
                            key={tier}
                            style={{
                              padding: "12px 18px",
                              textAlign: "center",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            {hasTier(f, tier) ? (
                              <span
                                aria-label="Included"
                                style={{ color: "var(--success)", display: "inline-flex" }}
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : (
                              <span aria-label="Not included" style={{ color: "var(--faint)" }}>
                                –
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", marginTop: 48 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700 }}>{tr("pricing.readyToSell", "Ready to sell?")}</h3>
        <p style={{ color: "var(--muted)", marginTop: 6, marginBottom: 18 }}>
          {tr("pricing.readySubtitle", "List your first product or service in minutes.")}
        </p>
        <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Button href="/sell" variant="primary" size="lg">
            {tr("cta.startSelling", "Start selling")}
          </Button>
          <Button href="/features" variant="secondary" size="lg">
            {tr("pricing.exploreFeatures", "Explore features")}
          </Button>
        </div>
      </div>
    </div>
  );
}
