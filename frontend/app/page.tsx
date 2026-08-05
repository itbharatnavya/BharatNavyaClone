"use client";

// SUITE HOMEPAGE — the Zoho-style umbrella landing for BharatSource. The former
// marketplace home now lives at /directory; this page presents BharatSource as a
// product SUITE: a clean hero, the four-product grid (the centrepiece), a
// "one account, every product" band, a live trust strip and a final CTA. Kept
// premium and restrained — NOT a directory dump. No emojis (inline SVG only),
// responsive with zero horizontal overflow.

import React from "react";
import Link from "next/link";
import ProductGrid from "@/components/suite/ProductGrid";
import SuiteStats from "@/components/suite/SuiteStats";
import AISearchBar from "@/components/AISearchBar";
import { ArrowRightIcon, CONTACT_EMAIL } from "@/components/suite/products";

// Suite-level concierge examples — a deliberate mix of PRODUCT (Directory) and
// EXPERT (Consultations) intents so the AI routes across both products.
const SUITE_EXAMPLES = [
  "Stainless steel sheets in Mumbai",
  "CA in Pune for GST filing",
  "Corporate lawyer in Delhi",
  "Wheat flour (atta) wholesaler",
  "Birthday gift under ₹400",
];

function CheckShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="15" r="4.5" />
      <path d="M11.2 11.8L20 3" />
      <path d="M17 6l2.5 2.5" />
      <path d="M15 8l2.5 2.5" />
    </svg>
  );
}

const WHY = [
  { Icon: ShieldIcon, title: "Verified across India", body: "Every vendor and expert is checked, so you connect with businesses you can trust." },
  { Icon: KeyIcon, title: "One account, everywhere", body: "A single BharatSource login carries your profile, billing and trust across products." },
  { Icon: BoltIcon, title: "Built for Indian business", body: "Sourcing, expertise and money tools designed for how Indian companies actually work." },
];

const ONE_ACCOUNT_POINTS = [
  "Single sign-on for every product",
  "One profile, billing and support",
  "Shared verification and trust",
];

export default function SuiteHomePage() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Talk to BharatSource")}`;

  return (
    <div>
      {/* ---------------- 1 · HERO ---------------- */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
          background:
            // sarvam-style aurora: warm peach glow top-centre + cool blue on the
            // upper edges, all fading softly into white.
            "radial-gradient(52% 42% at 50% -6%, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0) 70%)," +
            "radial-gradient(46% 46% at 6% 0%, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0) 70%)," +
            "radial-gradient(46% 46% at 94% 0%, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)," +
            "radial-gradient(60% 50% at 50% 4%, rgba(124,58,237,0.07) 0%, rgba(124,58,237,0) 72%)," +
            "var(--canvas)",
        }}
      >
        <div
          className="container-bs"
          style={{ position: "relative", paddingTop: "clamp(52px, 8vw, 88px)", paddingBottom: "clamp(40px, 6vw, 60px)", textAlign: "center" }}
        >
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
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>BharatSource</span>
          </div>

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
            Everything your business needs, in one place
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
            Tell us what you need — source a product or hire an expert — and our AI concierge takes you to the right service.
          </p>

          {/* Suite-level AI concierge: routes the intent into the right product. */}
          <div style={{ maxWidth: 700, margin: "30px auto 0", textAlign: "left" }}>
            <AISearchBar
              size="hero"
              placeholder="What do you need? e.g. 'CA in Pune for GST' or 'stainless steel sheets'"
              examples={SUITE_EXAMPLES}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 22 }}>
            <Link href="/directory" className="btn btn-secondary btn-sm">
              Browse the Directory
              <ArrowRightIcon size={15} />
            </Link>
            <Link href="/consultations" className="btn btn-secondary btn-sm">
              Hire an expert
              <ArrowRightIcon size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- 2 · PRODUCT GRID (centrepiece) ---------------- */}
      <section className="container-bs section-pad">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>The suite</div>
          <h2 style={{ fontSize: "clamp(26px, 3.6vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Four products, one account
          </h2>
          <p style={{ fontSize: 16, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
            Pick a product to get started. Directory and Consultations are live today; more are on the way.
          </p>
        </div>
        <ProductGrid />
      </section>

      {/* ---------------- 3 · ONE ACCOUNT. EVERY PRODUCT. ---------------- */}
      <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-bs section-pad">
          <div
            style={{
              display: "grid",
              gap: "clamp(24px, 4vw, 48px)",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              alignItems: "center",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>BharatSource One</div>
              <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.12 }}>
                One account. Every product.
              </h2>
              <p style={{ fontSize: 16, color: "var(--muted)", marginTop: 14, lineHeight: 1.65, maxWidth: 520 }}>
                Sign in once and move freely across the whole suite. Your profile, billing and verified trust status follow you from the Directory to Consultations and every product we add next — no new logins, no duplicate paperwork.
              </p>
              <ul style={{ listStyle: "none", margin: "22px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {ONE_ACCOUNT_POINTS.map((p) => (
                  <li key={p} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "var(--ink)" }}>
                    <span style={{ color: "var(--success)", display: "inline-flex", flexShrink: 0 }}>
                      <CheckShield />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card card-flat" style={{ padding: "clamp(24px, 4vw, 36px)", minWidth: 0 }}>
              <span
                aria-hidden
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--brand-tint)",
                  color: "var(--brand)",
                }}
              >
                <KeyIcon />
              </span>
              <h3 style={{ fontSize: 19, fontWeight: 700, color: "var(--ink)", marginTop: 16 }}>
                Your BharatSource account
              </h3>
              <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
                Already spans every product in the suite. Nothing to migrate — the account you use in the Directory works everywhere.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
                <Link href="/register" className="btn btn-primary btn-sm">Create free account</Link>
                <Link href="/login" className="btn btn-secondary btn-sm">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 4 · TRUST / WHY-US ---------------- */}
      <section className="container-bs section-pad">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Why BharatSource</div>
          <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            A trusted foundation for every product
          </h2>
        </div>

        <SuiteStats />

        <div
          style={{
            display: "grid",
            gap: "clamp(16px, 2.4vw, 24px)",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            marginTop: 24,
          }}
        >
          {WHY.map(({ Icon, title, body }) => (
            <div key={title} className="card card-flat" style={{ padding: 24, minWidth: 0 }}>
              <span
                aria-hidden
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--brand-tint)",
                  color: "var(--brand)",
                }}
              >
                <Icon />
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginTop: 14 }}>{title}</h3>
              <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- 5 · FINAL CTA ---------------- */}
      <section className="container-bs" style={{ paddingBottom: "clamp(48px, 8vw, 80px)" }}>
        <div
          className="card card-flat"
          style={{
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
            padding: "clamp(36px, 7vw, 64px) clamp(20px, 5vw, 48px)",
            background:
              "radial-gradient(680px 320px at 50% -20%, var(--brand-tint) 0%, rgba(239,246,255,0) 70%)," +
              "linear-gradient(180deg, #ffffff 0%, var(--bg-subtle) 100%)",
            borderColor: "#dbe6fb",
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 14 }}>One login · Every service</div>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--ink)",
              maxWidth: 720,
              margin: "0 auto",
            }}
          >
            Start with the Directory today
          </h2>
          <p
            style={{
              fontSize: "clamp(15px, 2.2vw, 18px)",
              color: "var(--muted)",
              maxWidth: 560,
              margin: "16px auto 0",
              lineHeight: 1.6,
            }}
          >
            Source from verified vendors and hire trusted experts now — and unlock every new BharatSource product with the same account.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 28 }}>
            <Link href="/directory" className="btn btn-brand btn-lg">Explore the Directory</Link>
            <Link href="/consultations" className="btn btn-secondary btn-lg">Hire an expert</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
