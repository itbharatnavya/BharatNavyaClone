"use client";

// components/admin/OverviewTab.tsx — platform snapshot.
// adminAnalytics(): totals, sellers-by-tier, activePaidSellers, 6-month inquiry buckets.

import React, { useEffect, useState } from "react";
import { getAnalytics, type AdminAnalyticsData } from "./adminApi";
import {
  SectionHeader,
  StatCard,
  Panel,
  Pill,
  LoadingState,
  ErrorState,
} from "./ui";

export default function OverviewTab() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalytics());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingState label="Loading analytics…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const { totals, sellersByTier, activePaidSellersByTier, monthlyInquiries } = data;
  const maxInquiry = Math.max(1, ...monthlyInquiries.map((m) => m.count));
  const tierRows = Object.entries(sellersByTier);

  return (
    <div>
      <SectionHeader
        title="Overview"
        subtitle="Live snapshot of the marketplace."
      />

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Users" value={totals.users} accent="ink" />
        <StatCard label="Sellers" value={totals.sellers} accent="brand" />
        <StatCard label="Listings" value={totals.listings} accent="ink" />
        <StatCard label="Inquiries" value={totals.inquiries} accent="ink" />
        <StatCard
          label="Pending sellers"
          value={totals.pendingSellers}
          accent="action"
          hint="Awaiting approval"
        />
        <StatCard
          label="Active paid sellers"
          value={totals.activePaidSellers}
          accent="success"
          hint="Silver + Gold"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Sellers by tier */}
        <Panel title="Sellers by plan tier">
          <div className="space-y-3">
            {tierRows.map(([tier, count]) => {
              const total = tierRows.reduce((a, [, c]) => a + c, 0) || 1;
              const pct = Math.round((count / total) * 100);
              const paid = activePaidSellersByTier[tier];
              return (
                <div key={tier}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Pill status={tier}>{tier}</Pill>
                      <span className="font-semibold text-ink">{count}</span>
                      {typeof paid === "number" && (
                        <span className="text-xs text-muted">
                          ({paid} active paid)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-faint">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-pill bg-bg-subtle">
                    <div
                      className="h-full rounded-pill"
                      style={{
                        width: `${pct}%`,
                        background:
                          tier === "gold"
                            ? "var(--action)"
                            : tier === "silver"
                            ? "var(--brand)"
                            : "#cbd5e1",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 6-month inquiry buckets — simple bar chart with divs */}
        <Panel
          title="Inquiries — last 6 months"
          desc="Monthly inquiry volume"
        >
          <div className="flex h-44 items-end justify-between gap-2 pt-2">
            {monthlyInquiries.map((m, i) => {
              const h = Math.round((m.count / maxInquiry) * 100);
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${m.month} ${m.year}: ${m.count}`}
                >
                  <span className="text-xs font-semibold text-ink">
                    {m.count}
                  </span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(h, 3)}%`,
                      minHeight: 4,
                      background:
                        "linear-gradient(180deg, var(--brand) 0%, #60a5fa 100%)",
                    }}
                  />
                  <span className="text-xs text-muted">{m.month}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
