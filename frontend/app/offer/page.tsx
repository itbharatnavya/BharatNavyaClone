"use client";

// /offer — "What we offer": a single, always-current catalogue of everything
// sellable/available on BharatSource. Built for (a) the sales team to know what
// they're selling and (b) self-serve buyers/sellers to see the full offering.
//
// It stays current because it reads the LIVE entitlements surface at runtime:
//   getEntitlements() → { tiers, features }
//   - Section 2 (Platform capabilities) renders every feature grouped by `group`.
//   - Section 3 (Plans & tiers) renders each tier's price + limits from the same call.
//   - Section 4 (Ways to grow) interpolates live tier figures (featured credits,
//     per-lead price) into the paid-placement copy, so nothing goes stale.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getEntitlements,
  type Entitlements,
  type EntitlementTier,
  type EntitlementFeature,
} from "@/lib/api";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  GroupIcon,
  CheckIcon,
  ArrowRightIcon,
  MailIcon,
  SparkIcon,
  AdIcon,
  FeaturedIcon,
  BoostIcon,
  LeadsIcon,
  VerifiedIcon,
} from "@/components/offer/icons";

const SALES_EMAIL = "hello@bharatsource.in";
const TIER_ORDER = ["free", "silver", "gold"] as const;

const money = (n: number, currency = "INR") =>
  currency === "INR" ? `₹${n.toLocaleString("en-IN")}` : `${currency} ${n}`;

// Short "best for" positioning per tier (keyed by tier key, with a fallback).
const BEST_FOR: Record<string, string> = {
  free: "New sellers getting listed and discovered.",
  silver: "Growing sellers who want more reach, leads and a trust badge.",
  gold: "Established sellers who want to lead their category.",
};

function statusChip(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "live") return { cls: "badge-new", label: "Live" };
  if (s === "beta") return { cls: "badge-sponsored", label: "Beta" };
  if (s === "planned" || s === "soon")
    return { cls: "badge-neutral", label: "Planned" };
  return { cls: "badge-neutral", label: status || "—" };
}

// ---- small presentational helpers ----------------------------------------

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: align === "center" ? 680 : undefined,
        margin: align === "center" ? "0 auto" : undefined,
      }}
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2
        style={{
          fontSize: "var(--fs-xl)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 8,
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            color: "var(--muted)",
            marginTop: 8,
            fontSize: "var(--fs-md)",
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// The Free / Silver / Gold inclusion pills shown on each capability card.
function TierPills({
  plans,
  tiers,
}: {
  plans: string[];
  tiers: EntitlementTier[];
}) {
  const ordered = [...tiers].sort((a, b) => a.tierRank - b.tierRank);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
      {ordered.map((t) => {
        const included = plans.includes(t.key);
        return (
          <span
            key={t.key}
            title={
              included
                ? `Included in ${t.name}`
                : `Not included in ${t.name}`
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "var(--fs-xs)",
              fontWeight: 600,
              lineHeight: 1,
              padding: "4px 8px",
              borderRadius: "var(--r-pill)",
              border: "1px solid",
              borderColor: included ? "#bfdbfe" : "var(--border)",
              background: included ? "var(--brand-tint)" : "var(--bg-subtle)",
              color: included ? "var(--brand-hover)" : "var(--faint)",
              whiteSpace: "nowrap",
            }}
          >
            {included && (
              <span style={{ display: "inline-flex" }}>
                <CheckIcon size={11} />
              </span>
            )}
            {t.name}
          </span>
        );
      })}
    </div>
  );
}

// A single row inside a plan card's limits list.
function LimitRow({
  label,
  value,
  yes,
}: {
  label: string;
  value?: React.ReactNode;
  yes?: boolean;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderBottom: "1px solid var(--border)",
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", minWidth: 0 }}>
        {label}
      </span>
      {value !== undefined ? (
        <span
          style={{
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            color: "var(--ink)",
            textAlign: "right",
          }}
        >
          {value}
        </span>
      ) : yes ? (
        <span style={{ color: "var(--success)", display: "inline-flex" }}>
          <CheckIcon size={16} />
        </span>
      ) : (
        <span style={{ color: "var(--faint)", fontSize: "var(--fs-sm)" }} aria-label="Not included">
          –
        </span>
      )}
    </li>
  );
}

export default function OfferPage() {
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    getEntitlements()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) =>
        active &&
        setError(e instanceof Error ? e.message : "Failed to load offering")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const tiers = useMemo<EntitlementTier[]>(() => {
    if (!data) return [];
    return [...data.tiers].sort((a, b) => a.tierRank - b.tierRank);
  }, [data]);

  // Features grouped by `group`, in first-appearance order, filtered by the
  // selected plan (native <select>). Reads straight from live data.
  const grouped = useMemo<[string, EntitlementFeature[]][]>(() => {
    if (!data) return [];
    const map = new Map<string, EntitlementFeature[]>();
    data.features
      .filter((f) => planFilter === "all" || f.plans.includes(planFilter))
      .forEach((f) => {
        const g = f.group || "Other";
        const arr = map.get(g) || [];
        arr.push(f);
        map.set(g, arr);
      });
    return Array.from(map.entries());
  }, [data, planFilter]);

  const featureCount = data?.features.length ?? 0;
  const topTier = tiers[tiers.length - 1];

  // Live figures reused in the "Ways to grow" copy so paid-placement cards
  // never drift from the plan configuration.
  const silver = tiers.find((t) => t.key === "silver");
  const gold = tiers.find((t) => t.key === "gold");
  const featuredHint =
    silver && gold
      ? `Included with plans — Silver ${silver.limits.featuredCreditsPerCycle ?? 0} credits/cycle, Gold ${gold.limits.featuredCreditsPerCycle ?? 0}/cycle`
      : "Included with paid plans";
  const perLead = gold?.limits.perLeadPrice ?? null;
  const leadHint =
    perLead && perLead > 0
      ? `From ${money(perLead)} / lead beyond your plan quota`
      : "Pay only for leads delivered beyond your quota";

  const products = [
    {
      key: "ads",
      title: "Top-of-list & Category-top Ads",
      Icon: AdIcon,
      what:
        "Place your listing or brand at the very top of a category, a search result, or the homepage hero — exactly where buyers look first.",
      who: "Sellers who want maximum visibility in a chosen category or city.",
      priceHint: "From ₹499 / placement (example) · admin-configured",
      selfServe: "/dashboard#advertise",
    },
    {
      key: "featured",
      title: "Featured Seller & Featured Listing",
      Icon: FeaturedIcon,
      what:
        "Spend boost credits to feature your business or a specific listing across relevant pages, shown as a highlighted result.",
      who: "Sellers on paid plans with monthly credits, or anyone buying a one-off boost.",
      priceHint: featuredHint,
      selfServe: "/dashboard#advertise",
    },
    {
      key: "boost",
      title: "Rank Boost (priority placement)",
      Icon: BoostIcon,
      what:
        "Lift your listings above standard results for your chosen keywords and categories with priority ranking.",
      who: "Sellers competing in busy categories who need an edge on discovery.",
      priceHint: "Admin-configured · talk to sales",
      selfServe: null,
    },
    {
      key: "leads",
      title: "Lead Packs (pay-per-lead)",
      Icon: LeadsIcon,
      what:
        "Buy verified buyer enquiries beyond your monthly quota — you only pay for real leads delivered to your inbox.",
      who: "Active sellers who exhaust their plan's lead quota and want more.",
      priceHint: leadHint,
      selfServe: null,
    },
    {
      key: "verified",
      title: "Verified & TrustSEAL Badge",
      Icon: VerifiedIcon,
      what:
        "Earn an admin-granted Verified or TrustSEAL badge that signals a genuine, vetted business — trusted sellers convert more buyers.",
      who: "Sellers who want to stand out. Included on Silver & Gold, or apply for verification.",
      priceHint: "Included on Silver & Gold · verification on request",
      selfServe: null,
    },
  ];

  return (
    <div className="counter-public-page counter-support-page counter-offer-page">
      {/* ============================================================
          1. Hero band
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container-bs section-pad-sm">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "What we offer" }]}
          />
          <div style={{ maxWidth: 720, marginTop: 18 }}>
            <span className="eyebrow">What we offer</span>
            <h1
              style={{
                fontSize: "var(--fs-2xl)",
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginTop: 12,
                color: "var(--ink)",
              }}
            >
              Everything on Bharat Navya, in one place
            </h1>
            <p
              style={{
                color: "var(--muted)",
                marginTop: 14,
                fontSize: "var(--fs-md)",
                lineHeight: 1.6,
              }}
            >
              A single, always-current guide to what Bharat Navya does — every
              platform capability, every plan, and every way to grow. Built so our
              sales team knows exactly what they're selling and buyers can see the
              full offering at a glance.
            </p>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link href="/login?next=/offer" className="btn btn-primary btn-lg is-on-blue">
                Start selling free
              </Link>
              <a href={`mailto:${SALES_EMAIL}`} className="btn btn-secondary btn-lg">
                Talk to our team
              </a>
            </div>

            {/* live headline counts */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {[
                { n: loading ? "—" : String(featureCount), l: "platform capabilities" },
                { n: loading ? "—" : String(tiers.length), l: "subscription plans" },
                { n: String(products.length), l: "ways to grow" },
              ].map((s) => (
                <span
                  key={s.l}
                  className="chip"
                  style={{ cursor: "default", background: "#fff" }}
                >
                  <strong style={{ color: "var(--ink)", fontWeight: 700 }}>
                    {s.n}
                  </strong>
                  <span style={{ color: "var(--muted)" }}>{s.l}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="container-bs" style={{ paddingTop: 20 }}>
          <p style={{ color: "var(--error)", fontSize: "var(--fs-sm)" }}>{error}</p>
        </div>
      )}

      {/* ============================================================
          2. Platform capabilities (live feature catalogue)
          ============================================================ */}
      <section className="container-bs section-pad-sm">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <SectionHeading
            eyebrow="Platform capabilities"
            title="What sellers and buyers can do"
            subtitle="Every capability live on the platform, grouped by area. This list is read straight from our entitlements engine, so it always reflects what's actually shipped."
          />

          {/* native <select> plan filter */}
          <div style={{ minWidth: 0 }}>
            <label
              htmlFor="plan-filter"
              className="field-label"
              style={{ marginBottom: 6 }}
            >
              Show what's in
            </label>
            <select
              id="plan-filter"
              className="select"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="all">All plans</option>
              {tiers.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name} plan
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 130 }} />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>
              No capabilities match this plan yet.
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} style={{ marginBottom: 34 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 38,
                      height: 38,
                      borderRadius: "var(--r-sm)",
                      background: "var(--brand-tint)",
                      color: "var(--brand)",
                      flexShrink: 0,
                    }}
                  >
                    <GroupIcon group={group} size={20} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "var(--fs-md)",
                        fontWeight: 700,
                        color: "var(--ink)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {group}
                    </h3>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>
                      {items.length}{" "}
                      {items.length === 1 ? "capability" : "capabilities"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(288px, 1fr))",
                    gap: 16,
                  }}
                >
                  {items.map((f) => {
                    const sc = statusChip(f.status);
                    return (
                      <div
                        key={f.id}
                        className="card card-pad"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <h4
                            style={{
                              fontSize: "var(--fs-sm)",
                              fontWeight: 600,
                              color: "var(--ink)",
                              minWidth: 0,
                            }}
                          >
                            {f.name}
                          </h4>
                          <span
                            className={`badge ${sc.cls}`}
                            style={{ flexShrink: 0 }}
                          >
                            {sc.label}
                          </span>
                        </div>
                        {f.description && (
                          <p
                            style={{
                              fontSize: "var(--fs-sm)",
                              color: "var(--muted)",
                              lineHeight: 1.55,
                              margin: 0,
                            }}
                          >
                            {f.description}
                          </p>
                        )}
                        <div style={{ marginTop: "auto", paddingTop: 4 }}>
                          <TierPills plans={f.plans} tiers={tiers} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ============================================================
          3. Plans & tiers
          ============================================================ */}
      <section
        style={{
          background: "var(--bg-subtle)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container-bs section-pad-sm">
          <SectionHeading
            eyebrow="Plans & tiers"
            title="Simple subscription plans"
            subtitle="Start free and upgrade for more reach, leads and placement. Paid plans are activated by our team, and there is no checkout."
            align="center"
          />

          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                maxWidth: 960,
                margin: "28px auto 0",
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 380 }} />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                maxWidth: 960,
                margin: "28px auto 0",
              }}
            >
              {tiers.map((t) => {
                const highlight = topTier && t.key === topTier.key;
                const p = t.limits.priceInfo;
                const priceLabel =
                  p?.label ||
                  (typeof p?.monthly === "number"
                    ? p.monthly === 0
                      ? "Free"
                      : `${money(p.monthly, p.currency)} / mo`
                    : "—");
                return (
                  <div
                    key={t.key}
                    className="card card-flat"
                    style={{
                      padding: 22,
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                      borderColor: highlight ? "var(--brand)" : "var(--border)",
                      outline: highlight ? "2px solid var(--brand)" : "none",
                      position: "relative",
                    }}
                  >
                    {highlight && (
                      <span
                        className="badge badge-verified"
                        style={{ position: "absolute", top: 16, right: 16 }}
                      >
                        Most popular
                      </span>
                    )}
                    <div
                      style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fs-xs)",
                        color: "var(--muted)",
                        marginTop: 4,
                        minHeight: 36,
                        lineHeight: 1.45,
                      }}
                    >
                      {BEST_FOR[t.key] || "Flexible plan for your business."}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: "var(--fs-xl)",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                      }}
                    >
                      {priceLabel}
                    </div>

                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "16px 0 0",
                      }}
                    >
                      <LimitRow
                        label="Active listings"
                        value={
                          t.limits.listingLimit === null
                            ? "Unlimited"
                            : t.limits.listingLimit.toLocaleString("en-IN")
                        }
                      />
                      <LimitRow
                        label="Leads / cycle"
                        value={
                          t.limits.leadQuotaPerCycle === null
                            ? "Unlimited"
                            : (t.limits.leadQuotaPerCycle ?? 0).toLocaleString(
                                "en-IN"
                              )
                        }
                      />
                      <LimitRow
                        label="Featured credits / cycle"
                        value={
                          t.limits.featuredCreditsPerCycle
                            ? t.limits.featuredCreditsPerCycle.toLocaleString(
                                "en-IN"
                              )
                            : "—"
                        }
                      />
                      <LimitRow
                        label="Verified badge"
                        yes={t.limits.verifiedBadgeIncluded}
                      />
                      <LimitRow
                        label="Analytics"
                        yes={t.limits.analyticsEnabled}
                      />
                      <LimitRow
                        label="Extra leads"
                        value={
                          t.limits.perLeadPrice
                            ? `${money(t.limits.perLeadPrice)} / lead`
                            : "—"
                        }
                      />
                    </ul>

                    <div style={{ marginTop: 18 }}>
                      <Link
                        href={t.key === "free" ? "/register" : "/dashboard?tab=subscription"}
                        className={`btn btn-block ${
                          highlight ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {t.key === "free" ? "Start free" : `Choose ${t.name}`}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* ============================================================
          4. Ways to grow (paid placements)
          ============================================================ */}
      <section className="container-bs section-pad-sm">
        <SectionHeading
          eyebrow="Ways to grow"
          title="Paid placements & add-ons"
          subtitle="Beyond subscriptions, these are the ways sellers invest to reach more buyers. Every option is a directory / lead product — visibility and enquiries, never a shopping cart."
        />

        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {products.map((pr) => {
            const Icon = pr.Icon;
            return (
              <div
                key={pr.key}
                className="card card-pad"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: "var(--r-sm)",
                    background: "var(--action-tint)",
                    color: "var(--action)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} />
                </span>

                <h3
                  style={{
                    fontSize: "var(--fs-md)",
                    fontWeight: 700,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {pr.title}
                </h3>

                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--muted)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {pr.what}
                </p>

                <div
                  style={{
                    fontSize: "var(--fs-xs)",
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      color: "var(--faint)",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Who:
                  </span>
                  <span>{pr.who}</span>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 8,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--fs-xs)",
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginBottom: 12,
                    }}
                  >
                    {pr.priceHint}
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                  >
                    <a
                      href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
                        pr.title
                      )}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <MailIcon size={15} />
                      Talk to sales
                    </a>
                    {pr.selfServe && (
                      <Link
                        href={pr.selfServe}
                        className="btn btn-ghost btn-sm"
                      >
                        Self-serve
                        <ArrowRightIcon size={15} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          5. Closing CTA band
          ============================================================ */}
      <section
        style={{
          background:
            "linear-gradient(180deg, var(--brand-tint), var(--bg-subtle))",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          className="container-bs section-pad-sm"
          style={{ textAlign: "center" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "var(--r-md)",
              background: "#fff",
              border: "1px solid var(--border)",
              color: "var(--brand)",
              marginBottom: 16,
            }}
          >
            <SparkIcon size={24} />
          </span>
          <h2
            style={{
              fontSize: "var(--fs-xl)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Ready to put Bharat Navya to work?
          </h2>
          <p
            style={{
              color: "var(--muted)",
              marginTop: 10,
              fontSize: "var(--fs-md)",
              maxWidth: 560,
              margin: "10px auto 0",
              lineHeight: 1.6,
            }}
          >
            List your first product or service in minutes — free. Want a walkthrough
            of plans and placements? Our team is happy to help.
          </p>
          <div
            style={{
              marginTop: 22,
              display: "inline-flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Link href="/login?next=/offer" className="btn btn-primary btn-lg is-on-blue">
              Start selling free
            </Link>
            <a
              href={`mailto:${SALES_EMAIL}`}
              className="btn btn-secondary btn-lg"
            >
              <MailIcon size={16} />
              Talk to our team
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
