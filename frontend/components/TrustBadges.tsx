"use client";

import React from "react";

export interface TrustBadgesProps {
  verified?: boolean; // Verified seller
  trustSeal?: boolean; // Trust seal verified
  gst?: boolean; // GST registered
  years?: number | null; // years in business
  responseRate?: number | null; // 0..100
  size?: "sm" | "md";
  className?: string;
}

function Pill({
  children,
  tone = "brand",
  size = "md",
}: {
  children: React.ReactNode;
  tone?: "brand" | "neutral" | "success";
  size?: "sm" | "md";
}) {
  const tones: Record<string, React.CSSProperties> = {
    brand: { background: "var(--brand-tint)", color: "var(--brand-hover)", borderColor: "#BFDBFE" },
    success: { background: "#ECFDF5", color: "#15803D", borderColor: "#BBF7D0" },
    neutral: { background: "var(--bg-subtle)", color: "var(--muted)", borderColor: "var(--border)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: size === "sm" ? 11 : 12,
        fontWeight: 600,
        padding: size === "sm" ? "3px 8px" : "4px 10px",
        borderRadius: 999,
        border: "1px solid transparent",
        whiteSpace: "nowrap",
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function TrustBadges({
  verified,
  trustSeal,
  gst,
  years,
  responseRate,
  size = "md",
  className = "",
}: TrustBadgesProps) {
  const items: React.ReactNode[] = [];
  if (verified || trustSeal) {
    items.push(
      <Pill key="verified" tone="brand" size={size}>
        <CheckIcon /> Verified
      </Pill>
    );
  }
  if (gst) {
    items.push(
      <Pill key="gst" tone="neutral" size={size}>
        GST
      </Pill>
    );
  }
  if (typeof years === "number" && years > 0) {
    items.push(
      <Pill key="years" tone="neutral" size={size}>
        {years} {years === 1 ? "yr" : "yrs"}
      </Pill>
    );
  }
  if (typeof responseRate === "number" && responseRate > 0) {
    items.push(
      <Pill key="rr" tone="success" size={size}>
        {Math.round(responseRate)}% response
      </Pill>
    );
  }

  if (items.length === 0) return null;

  return (
    <div
      className={className}
      style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
    >
      {items}
    </div>
  );
}
