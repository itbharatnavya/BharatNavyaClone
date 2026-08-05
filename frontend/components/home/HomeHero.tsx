"use client";

// HomeHero — the #1 appeal surface. Confident, benefit-led headline, the AI
// concierge search front-and-centre (existing AISearchBar, size="hero") with
// example chips, and two clear CTAs (Find suppliers → focus search, Start
// selling free → /register). Soft brand/action-tint gradient on white; clean,
// not busy. Light theme only, no emojis — inline SVG icons.

import React, { useRef } from "react";
import Link from "next/link";
import AISearchBar from "@/components/AISearchBar";

export interface HomeHeroProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  examples: string[];
}

// India-market defaults so the search always shows tangible suggestion chips
// even when the admin config supplies none.
const DEFAULT_EXAMPLES = [
  "CA in Pune for GST filing",
  "Stainless steel sheets, 2mm, Mumbai",
  "Bulk cotton fabric suppliers",
  "Wedding photographer in Jaipur",
];

function CheckShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function StoreIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9l1-5h14l1 5" />
      <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
      <path d="M4 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
    </svg>
  );
}

const TRUST_POINTS = ["Verified sellers", "Direct quotes", "No commission"];

export default function HomeHero({ eyebrow, title, subtitle, examples }: HomeHeroProps) {
  const searchRef = useRef<HTMLDivElement>(null);
  const chips = examples && examples.length ? examples : DEFAULT_EXAMPLES;

  function focusSearch() {
    const el = searchRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = el.querySelector("input");
    if (input) window.setTimeout(() => (input as HTMLInputElement).focus(), 320);
  }

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--border)",
        background:
          "radial-gradient(1100px 460px at 50% -8%, var(--brand-tint) 0%, rgba(239,246,255,0) 62%)," +
          "radial-gradient(760px 380px at 88% 8%, var(--action-tint) 0%, rgba(255,247,237,0) 58%)," +
          "var(--canvas)",
      }}
    >
      <div
        className="container-bs"
        style={{
          position: "relative",
          paddingTop: "clamp(48px, 8vw, 84px)",
          paddingBottom: "clamp(40px, 7vw, 68px)",
          textAlign: "center",
        }}
      >
        {eyebrow && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
              marginBottom: 22,
            }}
          >
            <span style={{ color: "var(--brand)", display: "inline-flex" }}>
              <CheckShield />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{eyebrow}</span>
          </div>
        )}

        <h1
          style={{
            fontSize: "clamp(34px, 5.4vw, 58px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            color: "var(--ink)",
            maxWidth: 880,
            margin: "0 auto",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2.2vw, 19px)",
            color: "var(--muted)",
            maxWidth: 640,
            margin: "20px auto 0",
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>

        {/* AI concierge search — the centrepiece */}
        <div ref={searchRef} style={{ maxWidth: 720, margin: "34px auto 0", scrollMarginTop: 96 }}>
          <AISearchBar size="hero" examples={chips} />
        </div>

        {/* Two clear CTAs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            marginTop: 26,
          }}
        >
          <button type="button" className="btn btn-brand btn-lg" onClick={focusSearch}>
            <SearchIcon />
            Find suppliers
          </button>
          <Link href="/register" className="btn btn-primary btn-lg">
            <StoreIcon />
            Start selling — free
          </Link>
        </div>

        {/* Trust microcopy */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px 20px",
            marginTop: 22,
          }}
        >
          {TRUST_POINTS.map((p) => (
            <span
              key={p}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--muted)" }}
            >
              <span style={{ color: "var(--success)", display: "inline-flex" }}>
                <CheckShield />
              </span>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
