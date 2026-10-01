"use client";

// Module tile, formerly used for the homepage's three-in-a-row module grid.
// Currently unused (superseded by AgentHeroCard.tsx, v5) but left in place
// as a reference pattern — see frontend-design-guide.md. Each module carries
// its own identity color (`accent`) drawn from the BharatNavya wordmark —
// orange for Bharat Agent, blue for Directory, green for Recruitment —
// independent of live/soon status; status only changes the badge and CTA
// copy, not the module's color. `href` is optional: omit it for a module
// with no live destination yet and the card renders as a plain,
// non-interactive panel instead of a `<Link>`.

import React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/suite/products";

export interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  href?: string;
  status: "live" | "soon";
  accent?: "brand" | "green" | "orange";
  badgeLabel?: string;
}

const ACCENT = {
  brand: { bg: "var(--brand-tint)", color: "var(--brand)", border: "#d3e2f7" },
  green: { bg: "var(--tricolor-green-tint)", color: "var(--tricolor-green)", border: "#cdebd7" },
  orange: { bg: "var(--action-tint)", color: "var(--action)", border: "#C4D3F7" },
} as const;

export default function ModuleCard({ icon, title, tagline, href, status, accent = "brand", badgeLabel }: ModuleCardProps) {
  const soon = status === "soon";
  const a = ACCENT[accent];

  const body = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: a.bg,
            color: a.color,
            border: `1px solid ${a.border}`,
          }}
        >
          {icon}
        </span>
        {soon && <span className="badge badge-neutral">{badgeLabel || "Coming soon"}</span>}
      </div>

      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>{title}</h3>
        <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.55 }}>{tagline}</p>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 2 }}>
        {!href ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--faint)" }}>Launching soon</span>
        ) : soon ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--faint)" }}>Notify me →</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: a.color }}>
            Explore
            <ArrowRightIcon size={14} />
          </span>
        )}
      </div>
    </>
  );

  const style: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14, padding: "clamp(18px, 2.6vw, 22px)", height: "100%", minWidth: 0 };

  if (!href) {
    return (
      <div className="card card-flat" style={style} aria-label={`${title} (in development)`}>
        {body}
      </div>
    );
  }

  return (
    <Link href={href} aria-label={`${title}${soon ? " (coming soon)" : ""}`} className={soon ? "card card-flat" : "card"} style={style}>
      {body}
    </Link>
  );
}
