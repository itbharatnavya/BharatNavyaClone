"use client";

// About us — a suite-level informational page (linked from the home/suite nav).
// Deliberately reuses the homepage's Reveal + card-flat + home-eyebrow patterns
// (see frontend-design-guide.md) rather than inventing a new visual language.

import React from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
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
function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

const VALUES = [
  { Icon: ShieldIcon, title: "Verification first", body: "Every seller, candidate and expert on BharatSource is checked before they go live — trust is the product, not an afterthought." },
  { Icon: ConnectIcon, title: "A mediator, not a middleman", body: "We never process payments or take a cut of your deal. We make the introduction; you keep the relationship." },
  { Icon: BoltIcon, title: "Built for how India works", body: "Mobile-first, plain language, no jargon — sourcing and hiring the way Indian businesses actually operate day to day." },
];

export default function AboutPage() {
  return (
    <div>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid var(--border)",
          background:
            "radial-gradient(52% 42% at 50% -6%, rgba(245,130,31,0.14) 0%, rgba(245,130,31,0) 70%)," +
            "radial-gradient(46% 46% at 6% 0%, rgba(26,79,174,0.12) 0%, rgba(26,79,174,0) 70%)," +
            "var(--canvas)",
        }}
      >
        <div className="container-bs" style={{ paddingTop: "clamp(48px, 7vw, 76px)", paddingBottom: "clamp(40px, 6vw, 60px)", textAlign: "center" }}>
          <Reveal>
            <div className="home-eyebrow" style={{ marginBottom: 14, justifyContent: "center" }}>About us</div>
          </Reveal>
          <Reveal delay={60}>
            <h1 style={{ fontSize: "clamp(30px, 4.6vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08, color: "var(--ink)", maxWidth: 720, margin: "0 auto" }}>
              Sourcing and hiring in India run on phone calls and broker networks. We&apos;re building the alternative.
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--muted)", maxWidth: 620, margin: "18px auto 0", lineHeight: 1.6 }}>
              BharatSource is a suite of tools for Indian businesses — starting with a verified supplier directory, with hiring and an AI assistant on the way. One account, no payment processing, no lock-in.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="container-bs section-pad">
        <Reveal>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
            <div className="home-eyebrow" style={{ marginBottom: 10, justifyContent: "center" }}>What we believe</div>
            <h2 style={{ fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Principles behind the product
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gap: "clamp(16px, 2.4vw, 24px)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {VALUES.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
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
                    background: "var(--brand-tint)",
                    color: "var(--brand)",
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

      <section className="container-bs" style={{ paddingBottom: "clamp(48px, 8vw, 80px)" }}>
        <Reveal>
          <div
            className="card card-flat"
            style={{
              textAlign: "center",
              padding: "clamp(36px, 7vw, 56px) clamp(20px, 5vw, 48px)",
              background: "linear-gradient(180deg, #ffffff 0%, var(--bg-subtle) 100%)",
              borderColor: "#d3e2f7",
            }}
          >
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Want to see it in action?
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 22 }}>
              <Link href="/directory" className="btn btn-brand btn-lg">Explore the Directory</Link>
              <Link href="/" className="btn btn-secondary btn-lg">Back to home</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
