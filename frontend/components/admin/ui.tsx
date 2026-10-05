"use client";

// components/admin/ui.tsx — small shared building blocks for the Admin Control Center.
// Data-dense but clean: hairline tables, section headers, stat cards, status pills,
// on/off switches. Light theme, semantic tokens.

import React from "react";

// ---------------------------------------------------------------- SectionHeader
export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ------------------------------------------------------------------- StatCard
export function StatCard({
  label,
  value,
  hint,
  accent = "ink",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "ink" | "brand" | "action" | "success";
}) {
  const color =
    accent === "brand"
      ? "text-brand"
      : accent === "action"
      ? "text-action"
      : accent === "success"
      ? "text-success"
      : "text-ink";
  return (
    <div className="card card-flat card-pad">
      <div className="text-xs font-semibold uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold leading-none ${color}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ FilterTabs
export interface FilterTab {
  value: string;
  label: string;
  count?: number;
}
export function FilterTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: FilterTab[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
          className={`chip ${value === t.value ? "chip-active" : ""}`}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={
                value === t.value
                  ? "text-white/80"
                  : "text-faint"
              }
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- Data table
export function AdminTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="admin-table overflow-x-auto rounded-xl border border-border bg-white"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <thead>
          <tr className="bg-bg-subtle">
            {columns.map((c, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-border px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className = "",
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`border-b border-border px-3.5 py-2.5 align-middle text-ink ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="transition-colors hover:bg-bg-subtle">{children}</tr>;
}

// -------------------------------------------------------------------- Pill
type Tone = "green" | "blue" | "amber" | "red" | "gray" | "purple";
const TONE: Record<Tone, { bg: string; color: string; border: string }> = {
  green: { bg: "#ecfdf5", color: "#15803d", border: "#bbf7d0" },
  blue: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  amber: { bg: "#E3EBFF", color: "#1B3FA0", border: "#C4D3F7" },
  red: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  gray: { bg: "#f7f8fa", color: "#475569", border: "#e5e7eb" },
  purple: { bg: "#DBE4FB", color: "#1B3FA0", border: "#C4D3F7" },
};

const STATUS_TONE: Record<string, Tone> = {
  // seller status
  approved: "green",
  pending: "amber",
  rejected: "red",
  suspended: "gray",
  // reports
  open: "amber",
  resolved: "green",
  dismissed: "gray",
  // payments
  paid: "green",
  waived: "blue",
  refunded: "gray",
  failed: "red",
  // ad bookings
  booked: "blue",
  active: "green",
  expired: "gray",
  cancelled: "red",
  // features
  live: "green",
  beta: "amber",
  planned: "gray",
  // plan tiers
  free: "gray",
  silver: "blue",
  gold: "amber",
  // priority tiers
  none: "gray",
  premium: "purple",
  star: "blue",
  leader: "amber",
  // booleans
  yes: "green",
  no: "gray",
  on: "green",
  off: "gray",
};

export function Pill({
  children,
  tone,
  status,
}: {
  children: React.ReactNode;
  tone?: Tone;
  status?: string;
}) {
  const t: Tone =
    tone || (status ? STATUS_TONE[status.toLowerCase()] || "gray" : "gray");
  const s = TONE[t];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
}

// -------------------------------------------------------------------- Toggle
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-canvas px-3 py-2.5">
      <span className="min-w-0">
        {label && (
          <span className="block truncate text-sm font-medium text-ink">
            {label}
          </span>
        )}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-[22px] w-[38px] flex-shrink-0 items-center rounded-pill transition-colors"
        style={{ background: checked ? "var(--brand)" : "#cbd5e1" }}
      >
        <span
          className="inline-block h-[16px] w-[16px] rounded-pill bg-white transition-transform"
          style={{
            transform: checked ? "translateX(19px)" : "translateX(3px)",
            boxShadow: "0 1px 2px rgba(16,24,40,.25)",
          }}
        />
      </button>
    </label>
  );
}

// --------------------------------------------------------------- states
export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-bg-subtle px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-10 text-sm text-muted">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border"
        style={{ borderTopColor: "var(--brand)" }}
      />
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-canvas px-6 py-10 text-center">
      <p className="text-sm font-semibold text-error">Couldn’t load data</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary btn-sm mt-4"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Panel — a flat card section wrapper.
export function Panel({
  title,
  desc,
  children,
  right,
  className = "",
}: {
  title?: string;
  desc?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card card-flat p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-ink">{title}</h3>
            )}
            {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// Small helper to format ISO dates compactly.
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function money(n?: number | null, currency = "₹"): string {
  if (n == null) return "—";
  return `${currency}${Number(n).toLocaleString("en-IN")}`;
}
