"use client";

// Consultations' own "Coming soon" teaser — shown by ConsultationsGate whenever
// featureFlags.consultationsLive is off. Mirrors RecruitmentComingSoon.tsx
// exactly (same reasoning as that file: deliberately standalone rather than
// built on components/suite/products.tsx, which CLAUDE.md flags as unused
// legacy code with zero importers — not something to add a new dependency on).

import React from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

const CONTACT_EMAIL = "hello@bharatsource.in";

function ConsultationsIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 10h8M8 14h5" />
      <path d="M21 12a8 8 0 1 1-3.4-6.55" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export default function ConsultationsComingSoon() {
  const subject = encodeURIComponent("Notify me about Bharat Navya Consultations");
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}`;

  return (
    <div
      className="counter-public-page counter-coming-soon"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(1000px 440px at 50% -10%, var(--brand-tint) 0%, rgba(239,246,255,0) 60%)," +
          "var(--canvas)",
      }}
    >
      <div className="container-bs counter-coming-soon-crumbs" style={{ paddingTop: 28 }}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Consultations" }]} />
      </div>

      <div
        className="container-bs counter-coming-soon-content"
        style={{
          textAlign: "center",
          paddingTop: "clamp(36px, 6vw, 60px)",
          paddingBottom: "clamp(56px, 9vw, 96px)",
          maxWidth: 760,
        }}
      >
        <span
          className="counter-coming-soon-icon"
          aria-hidden
          style={{
            width: 72,
            height: 72,
            margin: "0 auto",
            borderRadius: "var(--r-lg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
            color: "var(--brand)",
          }}
        >
          <ConsultationsIcon size={34} />
        </span>

        <div style={{ marginTop: 22 }}>
          <span className="badge badge-neutral" style={{ fontSize: "var(--fs-xs)" }}>
            Coming soon
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.06,
            color: "var(--ink)",
            marginTop: 16,
          }}
        >
          Bharat Navya Consultations
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2.2vw, 19px)",
            color: "var(--muted)",
            maxWidth: 560,
            margin: "18px auto 0",
            lineHeight: 1.6,
          }}
        >
          Book time with verified experts. This service is being prepared as part of
          Bharat Navya. Leave your details and we will tell you when it is ready.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 30 }}>
          <a href={mailto} className="btn btn-brand btn-lg">
            Notify me / Talk to us
          </a>
          <Link href="/" className="btn btn-secondary btn-lg">
            Back to all products
          </Link>
        </div>

        <p style={{ fontSize: "var(--fs-xs)", color: "var(--faint)", marginTop: 18 }}>
          One Bharat Navya account will connect the available products.
        </p>
      </div>
    </div>
  );
}
