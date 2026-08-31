"use client";

// components/admin/OverviewTab.tsx — platform snapshot across BOTH products.
// getAnalytics(): Directory totals + sellers-by-tier + 6-month inquiries, and a
// `recruitment` block (employers/candidates/jobs/applications + apps-by-stage +
// 6-month applications). Laid out as an Accounts strip, then a Directory section
// and a Recruitment section, each with its own stat row + two panels.

import React, { useEffect, useState } from "react";
import { getAnalytics, type AdminAnalyticsData, type MonthCount } from "./adminApi";
import { SectionHeader, StatCard, Panel, Pill, LoadingState, ErrorState } from "./ui";

const DIRECTORY = "var(--brand)";
const RECRUITMENT = "var(--tricolor-green)";

// Left-rule product label above each section.
function SectionLabel({ text, color }: { text: string; color: string }) {
  return (
    <div className="mb-3 mt-8 flex items-center gap-2 first:mt-0">
      <span className="h-4 w-1 rounded-pill" style={{ background: color }} />
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{text}</span>
    </div>
  );
}

// Horizontal proportion bars — [label, count] rows, width by share of total.
function ProportionBars({
  rows,
  colorFor,
  note,
}: {
  rows: [string, number][];
  colorFor: (label: string) => string;
  note?: (label: string) => string | null;
}) {
  const total = rows.reduce((a, [, c]) => a + c, 0) || 1;
  if (rows.length === 0) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <div className="space-y-3">
      {rows.map(([label, count]) => {
        const pct = Math.round((count / total) * 100);
        const extra = note?.(label);
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Pill status={label}>{label}</Pill>
                <span className="font-semibold text-ink">{count}</span>
                {extra && <span className="text-xs text-muted">{extra}</span>}
              </span>
              <span className="text-xs text-faint">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-pill bg-bg-subtle">
              <div
                className="h-full rounded-pill"
                style={{ width: `${pct}%`, background: colorFor(label) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 6-month volume — simple div bar chart. Each column is full-height so the bar's
// `height: %` resolves against the chart height, not the column's content box;
// the bar sits in its own flex-1 track above the month label.
function MonthBars({ data, from, to }: { data: MonthCount[]; from: string; to: string }) {
  const max = Math.max(1, ...data.map((m) => m.count));
  return (
    <div className="flex h-full min-h-[176px] items-stretch justify-between gap-2 pt-2">
      {data.map((m, i) => {
        const h = m.count === 0 ? 0 : Math.max(Math.round((m.count / max) * 100), 4);
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center gap-1.5"
            title={`${m.month} ${m.year}: ${m.count}`}
          >
            <span className="text-xs font-semibold text-ink">{m.count}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
                }}
              />
            </div>
            <span className="text-xs text-muted">{m.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// Fixed display order + colour for application stages.
const STAGE_ORDER = ["applied", "viewed", "shortlisted", "interview", "hired", "rejected", "withdrawn"];
const STAGE_COLOR: Record<string, string> = {
  applied: "#3b82f6",
  viewed: "#94a3b8",
  shortlisted: "var(--brand)",
  interview: "var(--action)",
  hired: "#16a34a",
  rejected: "#dc2626",
  withdrawn: "#cbd5e1",
};

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

  const { totals, sellersByTier, activePaidSellersByTier, monthlyInquiries, recruitment } = data;
  const tierRows = Object.entries(sellersByTier) as [string, number][];
  const rec = recruitment;
  const stageRows: [string, number][] = rec
    ? STAGE_ORDER.filter((s) => rec.applicationsByStatus[s]).map((s) => [s, rec.applicationsByStatus[s]])
    : [];

  return (
    <div>
      <SectionHeader title="Overview" subtitle="Live snapshot across Directory and Recruitment." />

      {/* Accounts — cross-product headcount */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Users" value={totals.users} accent="ink" />
        <StatCard label="Sellers" value={totals.sellers} accent="brand" />
        <StatCard label="Employers" value={rec?.totals.employers ?? 0} accent="ink" />
        <StatCard label="Candidates" value={rec?.totals.candidates ?? 0} accent="ink" />
        <StatCard label="Listings" value={totals.listings} accent="ink" />
        <StatCard label="Jobs" value={rec?.totals.jobs ?? 0} accent="ink" />
      </div>

      {/* ---------------------------------------------------------- Directory */}
      <SectionLabel text="Directory" color={DIRECTORY} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Sellers" value={totals.sellers} accent="brand" />
        <StatCard label="Listings" value={totals.listings} accent="ink" />
        <StatCard label="Inquiries" value={totals.inquiries} accent="ink" />
        <StatCard label="Pending sellers" value={totals.pendingSellers} accent="action" hint="Awaiting approval" />
        <StatCard label="Active paid sellers" value={totals.activePaidSellers} accent="success" hint="Silver + Gold" />
      </div>

      <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-2">
        <Panel title="Sellers by plan tier" className="flex flex-col">
          <div className="flex flex-1 flex-col justify-center">
            <ProportionBars
              rows={tierRows}
              colorFor={(t) =>
                t === "gold" ? "var(--action)" : t === "silver" ? "var(--brand)" : "#cbd5e1"
              }
              note={(t) =>
                typeof activePaidSellersByTier[t] === "number"
                  ? `(${activePaidSellersByTier[t]} active paid)`
                  : null
              }
            />
          </div>
        </Panel>
        <Panel title="Inquiries — last 6 months" desc="Monthly inquiry volume" className="flex flex-col">
          <div className="flex flex-1 flex-col justify-end">
            <MonthBars data={monthlyInquiries} from="var(--brand)" to="#60a5fa" />
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------- Recruitment */}
      <SectionLabel text="Recruitment" color={RECRUITMENT} />
      {rec ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Employers" value={rec.totals.employers} accent="ink" />
            <StatCard label="Candidates" value={rec.totals.candidates} accent="ink" />
            <StatCard label="Active jobs" value={rec.totals.activeJobs} accent="success" hint={`${rec.totals.jobs} total`} />
            <StatCard label="Openings" value={rec.totals.openings} accent="ink" />
            <StatCard label="Applications" value={rec.totals.applications} accent="ink" />
            <StatCard label="Pending employers" value={rec.totals.pendingEmployers} accent="action" hint="Awaiting approval" />
          </div>

          <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-2">
            <Panel title="Applications by stage" desc={`${rec.totals.hires} hired`} className="flex flex-col">
              <div className="flex flex-1 flex-col justify-center">
                <ProportionBars rows={stageRows} colorFor={(s) => STAGE_COLOR[s] || "#cbd5e1"} />
              </div>
            </Panel>
            <Panel title="Applications — last 6 months" desc="Monthly application volume" className="flex flex-col">
              <div className="flex flex-1 flex-col justify-end">
                <MonthBars data={rec.monthlyApplications} from="var(--tricolor-green)" to="#6ee7b7" />
              </div>
            </Panel>
          </div>
        </>
      ) : (
        <Panel title="Recruitment">
          <p className="text-sm text-muted">No recruitment data available.</p>
        </Panel>
      )}
    </div>
  );
}
