"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getFeatures, type Feature } from "@/lib/api";
import type { PlanTier } from "@/lib/types";
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
  { tier: "free", name: "Free", price: 0, currency: "INR", cycle: "monthly", tagline: "Create a visible company record", highlight: false },
  { tier: "silver", name: "Silver", price: 999, currency: "INR", cycle: "monthly", tagline: "Extend your reach", highlight: false },
  { tier: "gold", name: "Gold", price: 2999, currency: "INR", cycle: "monthly", tagline: "Lead your market", highlight: true },
];

const TIER_KEYS: PlanTier[] = ["free", "silver", "gold"];
const money = (value: number, currency = "INR") => currency === "INR" ? `₹${value.toLocaleString("en-IN")}` : `${currency} ${value}`;

export default function PricingPage() {
  const tr = useTr();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getFeatures().then((result) => {
      if (!active) return;
      setFeatures(result);
    }).catch(() => {
      if (active) setFeatures([]);
    }).finally(() => {
      if (!active) return;
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const tiers = DEFAULT_TIERS;

  const grouped = useMemo(() => {
    const groups = new Map<string, Feature[]>();
    features.forEach((feature) => {
      const group = feature.group || "Other";
      groups.set(group, [...(groups.get(group) || []), feature]);
    });
    return Array.from(groups.entries());
  }, [features]);

  const hasTier = (feature: Feature, tier: PlanTier) => Array.isArray(feature.plans) && (feature.plans as string[]).includes(tier);

  return (
    <div className="counter-public-page counter-pricing">
      <section className="counter-support-hero is-indigo">
        <div className="counter-support-shell counter-pricing-hero">
          <h1>{tr("pricing.title", "More visibility. More business possibilities.")}</h1>
          <div className="counter-pricing-hero-copy">
            <p>{tr("pricing.subtitle", "Build your business profile for free, then explore added visibility, premium placement, and promotional opportunities with an upgraded plan.")}</p>
            <Button href="#pricing-plans" variant="primary">{tr("pricing.explorePlans", "Explore upgrade plans")}</Button>
          </div>
        </div>
      </section>

      <section className="counter-pricing-body">
        <div className="counter-support-shell">
          <div className="counter-pricing-plans" id="pricing-plans">
            {tiers.map((tier) => (
              <article className={`counter-price-plan ${tier.highlight ? "is-highlighted" : ""}`} key={tier.tier}>
                <header>
                  <div>
                    <h2>{tier.name}</h2>
                    <p>{tier.tagline}</p>
                  </div>
                  {tier.highlight && <span>{tr("pricing.mostPopular", "Most popular")}</span>}
                </header>
                <div className="counter-price-value">
                  <strong>{tier.price === 0 ? tr("pricing.free", "Free") : money(tier.price, tier.currency)}</strong>
                  {tier.price > 0 && <small>/{tier.cycle === "yearly" ? "yr" : tier.cycle === "quarterly" ? "qtr" : "mo"}</small>}
                </div>
                <Button block href="/login?next=/pricing" variant={tier.highlight ? "primary" : "secondary"}>
                  {tier.tier === "free" ? tr("pricing.startFree", "Start free") : `${tr("pricing.choose", "Choose")} ${tier.name}`}
                </Button>
              </article>
            ))}
          </div>

          <section className="counter-pricing-comparison" aria-labelledby="pricing-comparison-title">
            <header className="counter-support-heading">
              <h2 id="pricing-comparison-title">{tr("pricing.compare", "Compare capabilities")}</h2>
              <p>See what each company plan makes available before choosing.</p>
            </header>

            {loading ? (
              <div className="counter-pricing-loading" aria-label="Loading plan capabilities" />
            ) : grouped.length === 0 ? (
              <p className="counter-public-state">{tr("pricing.catalogSetup", "Feature catalog is being set up.")}</p>
            ) : (
              <div className="counter-pricing-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{tr("pricing.capability", "Capability")}</th>
                      {tiers.map((tier) => <th scope="col" key={tier.tier}>{tier.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(([group, items]) => (
                      <React.Fragment key={group}>
                        <tr className="counter-pricing-group"><th colSpan={4} scope="colgroup">{group}</th></tr>
                        {items.map((feature) => (
                          <tr key={feature.id}>
                            <th scope="row">{feature.name}</th>
                            {TIER_KEYS.map((tier) => (
                              <td key={tier}>
                                {hasTier(feature, tier) ? <span className="is-included" aria-label="Included">✓</span> : <span className="is-excluded" aria-label="Not included">—</span>}
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
          </section>
        </div>
      </section>

      <section className="counter-pricing-close">
        <div className="counter-support-shell">
          <div><h2>{tr("pricing.readyToSell", "Ready to represent your company?")}</h2><p>{tr("pricing.readySubtitle", "Create the public record your customers and applicants should see.")}</p></div>
          <div className="counter-support-actions">
            <Button href="/sell" variant="primary" size="lg">{tr("cta.startSelling", "Start your company record")}</Button>
            <Button href="/features" variant="secondary" size="lg">{tr("pricing.exploreFeatures", "Explore features")}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
