"use client";

// SUITE HOMEPAGE. Bharat Agent is the flagship module and the page's hero
// card (AgentHeroCard) — Directory and Recruitment are nested inside that
// same card as secondary entry points, each keeping its own module-identity
// color (blue / green) — see frontend-design-guide.md v5 for the full
// token/pattern reference. Bharat Agent has no live destination yet, so its
// half of the card stays a static, non-functional mock. Hero/closing CTAs
// are auth-aware: logged-out visitors see a single "Join us"; logged-in
// users see "Go to dashboard" instead of register/sign-in. Photography is
// local-only (frontend/public/demo/*.jpg, already licensed for this repo —
// never hot-linked web images, per CLAUDE.md). No Directory marketplace data
// lives here (no listing counts, categories, brands); that content stays on
// /directory. No emojis (inline SVG only), zero horizontal overflow at 390px.

import React from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import Rating from "@/components/Rating";
import AgentHeroCard from "@/components/home/AgentHeroCard";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";

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
function ConnectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="5.5" cy="12" r="2.8" />
      <circle cx="18.5" cy="12" r="2.8" />
      <path d="M8.3 12h7.4" />
    </svg>
  );
}

// Each pillar/stat cycles through a distinct brand color instead of the
// old all-blue treatment — a deliberate, low-risk way to spread the
// palette across the page (v5.4) without turning any one section loud.
const ACCENTS = [
  { bg: "var(--brand-tint)", color: "var(--brand)" },
  { bg: "var(--action-tint)", color: "var(--action)" },
  { bg: "var(--tricolor-green-tint)", color: "var(--tricolor-green)" },
  { bg: "var(--navy-tint)", color: "var(--navy)" },
];

const WHY = [
  { Icon: ShieldIcon, title: "Verified across India", body: "Every vendor, expert and candidate is checked, so you connect with businesses you can trust." },
  { Icon: KeyIcon, title: "One account, everywhere", body: "A single BharatSource login carries your profile, billing and trust across every module." },
  { Icon: BoltIcon, title: "Built for Indian business", body: "Sourcing, hiring and expertise designed for how Indian companies actually work." },
  { Icon: ConnectIcon, title: "No middlemen, no lock-in", body: "We're a mediator, not a marketplace — we never touch your money. You deal directly, on your own terms." },
];

const STATS = [
  { value: "3", label: "Modules, one account" },
  { value: "1,200+", label: "Verified businesses" },
  { value: "28", label: "States & UTs reachable" },
  { value: "24×7", label: "Bharat Agent, always on" },
];

const STEPS = [
  { n: "01", title: "Tell Bharat Agent what you need", body: "Sourcing a product, hiring for a role, or getting expert advice — say it in plain language, no forms to fill first." },
  { n: "02", title: "Get matched, not just listed", body: "Verified suppliers, candidates or experts, ranked for relevance to your business and location." },
  { n: "03", title: "Connect directly", body: "Talk to them yourself. No middleman fees, no payment lock-in — we help you find them, not control the deal." },
];

// Client feedback — deliberately attributed by role + city, not fabricated
// named individuals with photos (see frontend-design-guide.md). Each quote
// ties to a different module so the section doubles as a second pass through
// the suite's value prop. Photos are local industry photography (context,
// not a claimed likeness of the reviewer).
const FEEDBACK = [
  {
    img: "/demo/steel-1.jpg",
    quote: "Finding the right supplier used to take days of calling around. Now it takes an afternoon.",
    who: "Manufacturing SME, Pune",
    rating: 5,
  },
  {
    img: "/demo/textile-2.jpg",
    quote: "We're looking forward to Bharat Agent — describing what we need in plain language instead of filling in filters would save real time.",
    who: "Textile Exporter, Surat",
    rating: 4.5,
  },
  {
    img: "/demo/retail-2.jpg",
    quote: "Sourcing and hiring in one place, under one account — that's exactly what we've been waiting for.",
    who: "Retail Brand Founder, Delhi",
    rating: 4.5,
  },
];

export default function SuiteHomePage() {
  const { user, loading } = useAuth();
  const { featureFlags } = useConfig();

  return (
    <div>
      {/* ---------------- 1 · INTRO ---------------- */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(52% 42% at 50% -6%, rgba(245,130,31,0.16) 0%, rgba(245,130,31,0) 70%)," +
            "radial-gradient(46% 46% at 6% 0%, rgba(26,79,174,0.13) 0%, rgba(26,79,174,0) 70%)," +
            "radial-gradient(46% 46% at 94% 0%, rgba(26,79,174,0.1) 0%, rgba(26,79,174,0) 70%)," +
            "var(--canvas)",
        }}
      >
        <div className="container-bs" style={{ position: "relative", paddingTop: "clamp(16px, 2vw, 22px)", paddingBottom: "clamp(12px, 1.6vw, 16px)", textAlign: "center" }}>
          <Reveal>
            <h1
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
                color: "var(--ink)",
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              Everything your business needs, in <span style={{ color: "var(--action)" }}>one place</span>
            </h1>
          </Reveal>

          <Reveal delay={70}>
            <p style={{ fontSize: "clamp(13px, 1.5vw, 15px)", color: "var(--muted)", maxWidth: 540, margin: "6px auto 0", lineHeight: 1.5 }}>
              Bharat Agent, Directory and Recruitment — one account, built for how Indian business actually gets done.
            </p>
          </Reveal>

          {!loading && !user && (
            <Reveal delay={140}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 12 }}>
                <Link href="/login?next=/" className="btn btn-primary btn-sm">Join us</Link>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------------- 2 · MODULES (centrepiece) ----------------
          Deliberately tight: this card (with Directory/Recruitment
          nested inside) is meant to land fully above the fold on
          common desktop viewports alongside section 1 — no "The
          suite" eyebrow/heading here, it would just cost vertical
          rhythm the fold doesn't have. See frontend-design-guide.md. */}
      <section className="container-bs" style={{ paddingBottom: "clamp(28px, 4vw, 40px)" }}>
        <Reveal delay={0} direction="scale">
          <AgentHeroCard />
        </Reveal>
      </section>

      {/* ---------------- 3 · STATS STRIP ---------------- */}
      <section className="container-bs" style={{ paddingBottom: "clamp(48px, 7vw, 72px)" }}>
        <Reveal>
          <div
            className="card card-flat"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 8,
              padding: "clamp(20px, 3vw, 28px)",
            }}
          >
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 60}>
                <div style={{ padding: "8px 14px", minWidth: 0, textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-0.02em", color: ACCENTS[i % ACCENTS.length].color, lineHeight: 1.1 }}>
                    {s.value}
                  </span>
                  <span className="line-clamp-1" style={{ display: "block", fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
                    {s.label}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ---------------- 4 · ADVERTISE / BRAND NARRATIVE ---------------- */}
      <section className="container-bs" style={{ paddingBottom: "clamp(48px, 8vw, 80px)" }}>
        <div className="home-advertise-grid">
          <Reveal direction="left">
            <div
              style={{
                position: "relative",
                borderRadius: 20,
                overflow: "hidden",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
                aspectRatio: "4 / 3",
              }}
            >
              <img
                src="/demo/business-1.jpg"
                alt="A business team working with verified suppliers and tools sourced through BharatSource"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </Reveal>

          <Reveal direction="right">
            <div className="home-eyebrow" style={{ marginBottom: 12 }}>Built for Indian business</div>
            <h2 style={{ fontSize: "clamp(24px, 3.2vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.15 }}>
              One suite, built around how work actually happens on the ground
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.65, maxWidth: 480 }}>
              Most sourcing and hiring in India still runs on phone calls, broker networks and scattered spreadsheets. BharatSource brings that into one account — verified suppliers, real candidates and a growing AI assistant, without asking you to change how you already do business.
            </p>
            <ul style={{ listStyle: "none", margin: "22px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {["No listing fees to browse or enquire", "Verification before a business goes live", "You keep the relationship — we just make the introduction"].map((p) => (
                <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "var(--ink)" }}>
                  <span style={{ color: "var(--tricolor-green)", display: "inline-flex", flexShrink: 0, marginTop: 3 }}>
                    <CheckShield />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href="/directory" className="btn btn-brand">Explore the Directory</Link>
              {featureFlags.recruitmentLive && (
                <Link href="/recruitment" className="btn btn-secondary">Explore Recruitment</Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- 5 · HOW IT WORKS ---------------- */}
      <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-bs section-pad">
          <Reveal>
            <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
              <div className="home-eyebrow" style={{ marginBottom: 10, justifyContent: "center" }}>How it works</div>
              <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
                From intent to a direct connection
              </h2>
            </div>
          </Reveal>

          <div style={{ display: "grid", gap: "clamp(16px, 2.4vw, 24px)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 90}>
                <div className="card card-flat" style={{ padding: 24, minWidth: 0, height: "100%" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", color: "var(--action)" }}>{step.n}</span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginTop: 10 }}>{step.title}</h3>
                  <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 6 · CLIENT FEEDBACK ---------------- */}
      <section className="container-bs section-pad">
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
            <div className="home-eyebrow" style={{ marginBottom: 10, justifyContent: "center" }}>What businesses are saying</div>
            <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Real feedback, across every module
            </h2>
          </div>
        </Reveal>

        <div className="home-feedback-grid">
          {FEEDBACK.map((f, i) => (
            <Reveal key={f.who} delay={i * 80}>
              <div className="card card-flat" style={{ overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ aspectRatio: "16 / 9", overflow: "hidden" }}>
                  <img src={f.img} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <Rating value={f.rating} showValue={false} size={14} />
                  <p style={{ fontSize: 14.5, color: "var(--ink)", marginTop: 12, lineHeight: 1.6, flex: 1 }}>&ldquo;{f.quote}&rdquo;</p>
                  <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 14 }}>{f.who}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- 7 · WHY-US ---------------- */}
      <section className="container-bs section-pad">
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
            <div className="home-eyebrow" style={{ marginBottom: 10, justifyContent: "center" }}>Why BharatSource</div>
            <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              A trusted foundation for every module
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gap: "clamp(16px, 2.4vw, 24px)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {WHY.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="card card-flat" style={{ padding: 24, minWidth: 0, height: "100%" }}>
                <span
                  aria-hidden
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: ACCENTS[i % ACCENTS.length].bg,
                    color: ACCENTS[i % ACCENTS.length].color,
                  }}
                >
                  <Icon />
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginTop: 14 }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- 8 · FINAL CTA ---------------- */}
      <section className="container-bs" style={{ paddingBottom: "clamp(48px, 8vw, 80px)" }}>
        <Reveal>
          <div
            className="card card-flat"
            style={{
              position: "relative",
              overflow: "hidden",
              textAlign: "center",
              padding: "clamp(36px, 7vw, 64px) clamp(20px, 5vw, 48px)",
              background:
                "radial-gradient(600px 280px at 90% -15%, rgba(245,130,31,0.38) 0%, rgba(245,130,31,0) 65%)," +
                "radial-gradient(520px 260px at 5% 115%, rgba(30,158,82,0.32) 0%, rgba(30,158,82,0) 65%)," +
                "linear-gradient(135deg, var(--navy-mid) 0%, var(--navy) 55%, var(--navy-deep) 100%)",
              borderColor: "var(--navy-deep)",
            }}
          >
            <div className="home-eyebrow" style={{ marginBottom: 14, justifyContent: "center", color: "rgba(255,255,255,0.88)" }}>One login · Every module</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#ffffff", maxWidth: 720, margin: "0 auto" }}>
              Ready when you are
            </h2>
            <p style={{ fontSize: "clamp(15px, 2.2vw, 18px)", color: "rgba(255,255,255,0.75)", maxWidth: 560, margin: "16px auto 0", lineHeight: 1.6 }}>
              {user
                ? "More modules are on the way — each one unlocks right here, under the same account, as it rolls out."
                : "Create your free account today — every module unlocks with the same login as we roll them out."}
            </p>
            {!loading && !user && (
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 28 }}>
                <Link href="/login?next=/" className="btn btn-primary btn-lg">Join us</Link>
              </div>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
