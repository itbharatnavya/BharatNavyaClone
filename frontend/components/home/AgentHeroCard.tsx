"use client";

// Homepage hero card: Bharat Agent as the suite's flagship experience, with
// Directory and Recruitment nested inside the same card as a stacked column
// to its right — one unified card rather than three separate equal tiles
// (v4's .home-modules-row). Bharat Agent's half (v5.3) is styled as its own
// card (`.agent-hero-main`, same `card card-flat` language as the Directory/
// Recruitment tiles beside it) rather than a mocked-up search bar, which
// read as an actual (non-functional) input rather than a product tile.
// It still has no live destination, so it deliberately stays `card-flat`
// (no hover-lift — that's reserved for things you can actually click, see
// frontend-design-guide.md) with a plain "Launching soon" status line,
// mirroring ModuleCard's own no-href convention. Directory and Recruitment
// are real links. See frontend-design-guide.md v5.3.

import React from "react";
import Link from "next/link";
import { AgentIcon, RecruitmentIcon } from "./icons";
import { DirectoryIcon, ArrowRightIcon } from "@/components/suite/products";
import { useConfig } from "@/lib/config";

interface NestedProduct {
  key: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  href: string;
  accentBg: string;
  accentColor: string;
  accentBorder: string;
  cta: string;
  ctaColor: string;
  badge?: string;
}

const PRODUCTS: NestedProduct[] = [
  {
    key: "directory",
    icon: <DirectoryIcon size={18} />,
    title: "Directory",
    tagline: "Discover and source from verified suppliers.",
    href: "/directory",
    accentBg: "var(--brand-tint)",
    accentColor: "var(--brand)",
    accentBorder: "#d3e2f7",
    cta: "Explore",
    ctaColor: "var(--brand)",
  },
  {
    key: "recruitment",
    icon: <RecruitmentIcon size={18} />,
    title: "Recruitment",
    tagline: "Post roles, connect with vetted candidates.",
    href: "/recruitment",
    accentBg: "var(--tricolor-green-tint)",
    accentColor: "var(--tricolor-green)",
    accentBorder: "#cdebd7",
    cta: "Notify me",
    ctaColor: "var(--faint)",
    badge: "Coming soon",
  },
];

export default function AgentHeroCard() {
  const { featureFlags } = useConfig();
  // Recruitment's tile drops the "Coming soon" badge and becomes a live entry point
  // once featureFlags.recruitmentLive is on (env RECRUITMENT_LIVE or admin Site Config)
  // — same flag SuiteNavMenu/Footer already track. See RECRUITMENT.md §5.
  const products = PRODUCTS.map((p) =>
    p.key === "recruitment" && featureFlags.recruitmentLive
      ? { ...p, badge: undefined, cta: "Explore", ctaColor: "var(--tricolor-green)" }
      : p
  );
  return (
    <div className="agent-hero-card">
      <div className="agent-hero-body">
        <div className="card card-flat agent-hero-main" aria-label="Bharat Agent (in development)">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <span
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--r-sm)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--action-tint)",
                color: "var(--action)",
                border: "1px solid #C4D3F7",
                flexShrink: 0,
              }}
            >
              <AgentIcon size={22} />
            </span>
            <span
              className="badge"
              style={{ background: "var(--action-tint)", color: "var(--action-hover)", borderColor: "#C4D3F7" }}
            >
              In development
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: "clamp(19px, 2.2vw, 23px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                lineHeight: 1.15,
              }}
            >
              Bharat Agent
            </h2>
            <p style={{ fontSize: "var(--fs-sm)", color: "rgba(255,255,255,0.78)", marginTop: 6, lineHeight: 1.55 }}>
              One assistant for the whole suite. Tell it what you need — sourcing or hiring — and it works out where to take you.
            </p>
          </div>

          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginTop: "auto", paddingTop: 4 }}>
            Launching soon
          </span>
        </div>

        <div className="agent-hero-side">
          <span className="agent-hero-side-label">Also in the suite</span>
          {products.map((p) => (
            <Link key={p.key} href={p.href} aria-label={`${p.title}${p.badge ? " (coming soon)" : ""}`} className="card agent-hero-product">
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--r-xs)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: p.accentBg,
                  color: p.accentColor,
                  border: `1px solid ${p.accentBorder}`,
                  flexShrink: 0,
                }}
              >
                {p.icon}
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>{p.title}</span>
                  {p.badge && (
                    <span className="badge badge-neutral" style={{ fontSize: "var(--fs-xs)" }}>
                      {p.badge}
                    </span>
                  )}
                </span>
                <span className="line-clamp-2" style={{ display: "block", fontSize: "var(--fs-xs)", color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>
                  {p.tagline}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--fs-xs)", fontWeight: 700, color: p.ctaColor, marginTop: 5 }}>
                  {p.cta}
                  <ArrowRightIcon size={12} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
