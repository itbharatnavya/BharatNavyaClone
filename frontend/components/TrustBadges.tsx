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
    brand: { background: "#dbe4fb", color: "#1b3fa0", borderColor: "#b9c9f2" },
    success: { background: "#e3ebff", color: "#2556c8", borderColor: "#c4d3f7" },
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

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
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
  // Two distinct signals, two distinct pills — "verified" (admin-approved
  // business) and "trust seal" (admin-granted seal) are different facts and
  // shouldn't collapse into one badge that always just says "Verified".
  if (verified) {
    items.push(
      <Pill key="verified" tone="brand" size={size}>
        <CheckIcon /> Verified
      </Pill>
    );
  }
  if (trustSeal) {
    items.push(
      <Pill key="trustSeal" tone="success" size={size}>
        <ShieldIcon /> Trust Seal
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
