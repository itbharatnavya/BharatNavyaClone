"use client";

// BharatSource — dashboard shared primitives.
// Small building blocks + formatters + a safe i18n helper used across every
// dashboard tab. Kept namespaced under components/dashboard/ per the page-builder
// contract (do NOT touch shared components/lib).

import React from "react";
import { useT } from "@/lib/i18n";

// ============================================================
// Tabs
// ============================================================
export type TabId =
  | "overview"
  | "listings"
  | "inbox"
  | "leads"
  | "reviews"
  | "blogs"
  | "stories"
  | "subscription"
  | "referral"
  | "profile";

// ============================================================
// Loose shapes for endpoints not yet in lib/types.ts
// (getNotifications / getReferralCode are added by the shared-additions wave)
// ============================================================
export interface DashNotification {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  read?: boolean;
  isRead?: boolean;
  link?: string;
  href?: string;
  createdAt?: string;
}

export interface ReferralInfo {
  code: string;
  credits?: number;
  referredCount?: number;
  shareUrl?: string;
  [key: string]: unknown;
}

// ============================================================
// i18n — honour useT() but never render a raw key.
// The i18n hook shape is a contract item; support both `t` and `{ t }`.
// ============================================================
export function useTr(): (key: string, fallback: string) => string {
  const raw = useT() as unknown;
  return React.useCallback(
    (key: string, fallback: string): string => {
      try {
        const fn =
          typeof raw === "function"
            ? (raw as (k: string) => unknown)
            : (raw as { t?: (k: string) => unknown } | null)?.t;
        if (typeof fn !== "function") return fallback;
        const v = fn(key);
        return typeof v === "string" && v && v !== key ? v : fallback;
      } catch {
        return fallback;
      }
    },
    [raw]
  );
}

// ============================================================
// Formatters
// ============================================================
export function formatINR(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 45) return "just now";
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function formatClock(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

// ============================================================
// Panel header
// ============================================================
export function PanelHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      <div>
        <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 4 }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

// ============================================================
// Stat card
// ============================================================
export function StatCard({
  label,
  value,
  hint,
  accent = "var(--brand)",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card card-flat" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>}
      </div>
      <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700, color: "var(--ink)", marginTop: 8, lineHeight: 1.1 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

// ============================================================
// Empty state
// ============================================================
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="card card-flat"
      style={{
        padding: "48px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {icon && (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "var(--r-md)",
            background: "var(--bg-subtle)",
            display: "grid",
            placeItems: "center",
            color: "var(--faint)",
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: "var(--fs-md)", fontWeight: 600, color: "var(--ink)" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", maxWidth: 420 }}>{subtitle}</div>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ============================================================
// Inline loader
// ============================================================
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "40px 0",
        color: "var(--muted)",
        fontSize: "var(--fs-sm)",
      }}
    >
      <span className="bs-spin" aria-hidden />
      {label}
      <style>{`.bs-spin{width:16px;height:16px;border-radius: var(--r-pill);border:2px solid var(--border);border-top-color:var(--brand);animation:bsspin .7s linear infinite}@keyframes bsspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ============================================================
// Icons — compact inline set keyed by name.
// ============================================================
const PATHS: Record<string, React.ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  listings: (
    <>
      <path d="M20.6 12.6 12 21.2 3.4 12.6a2 2 0 0 1 0-2.8L9 4.2a2 2 0 0 1 1.4-.6H15a2 2 0 0 1 2 2v4.6a2 2 0 0 1-.6 1.4Z" />
      <circle cx="13.5" cy="7.5" r="1.2" />
    </>
  ),
  inbox: (
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.7 8.7 0 0 1-4-.9L3 20l1-3.5a8.4 8.4 0 0 1-1-4A8.4 8.4 0 0 1 11.5 4h.5A8.4 8.4 0 0 1 21 11.5Z" />
  ),
  leads: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 6.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-5.5A2 2 0 0 0 16.8 5H7.2a2 2 0 0 0-1.7 1.5Z" />
    </>
  ),
  reviews: (
    <path d="m12 2.5 2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95Z" />
  ),
  blogs: (
    <>
      <path d="M4 20h16" />
      <path d="M14.5 4.5a2.1 2.1 0 0 1 3 3L8 17l-4 1 1-4Z" />
    </>
  ),
  stories: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  subscription: (
    <path d="m3 8 4.5 3L12 4l4.5 7L21 8l-1.6 10.4a1 1 0 0 1-1 .85H5.6a1 1 0 0 1-1-.85Z" />
  ),
  referral: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
      <path d="M12 8S10.5 4 8.3 4a2.3 2.3 0 0 0 0 4.6M12 8s1.5-4 3.7-4a2.3 2.3 0 0 1 0 4.6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  send: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
  external: (
    <>
      <path d="M15 3h6v6M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 7 3 3H7l3-3-1-7Z" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
  style,
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {PATHS[name] ?? PATHS.overview}
    </svg>
  );
}

// small random id for optimistic messages
export function newClientId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
