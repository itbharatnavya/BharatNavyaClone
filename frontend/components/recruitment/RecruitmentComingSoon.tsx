"use client";

// Recruitment's own "Coming soon" teaser — shown by RecruitmentGate whenever
// featureFlags.recruitmentLive is off. Visually mirrors components/suite/ComingSoon.tsx
// (same layout/copy shape) but standalone rather than driven by SuiteProduct, since
// Recruitment was deliberately never added to components/suite/products.tsx (that
// lookup table is only for the still-placeholder Credit Card / Mutual pages — see
// CLAUDE.md).

import React from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { RecruitmentIcon } from "@/components/home/icons";

const CONTACT_EMAIL = "hello@bharatsource.in";

export default function RecruitmentComingSoon() {
  const subject = encodeURIComponent("Notify me about Bharat Navya Recruitment");
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}`;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(1000px 440px at 50% -10%, var(--tricolor-green-tint) 0%, rgba(240,253,244,0) 60%)," +
          "var(--canvas)",
      }}
    >
      <div className="container-bs" style={{ paddingTop: 28 }}>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Recruitment" }]} />
      </div>

      <div
        className="container-bs"
        style={{
          textAlign: "center",
          paddingTop: "clamp(36px, 6vw, 60px)",
          paddingBottom: "clamp(56px, 9vw, 96px)",
          maxWidth: 760,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 72,
            height: 72,
            margin: "0 auto",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
            color: "var(--tricolor-green)",
          }}
        >
          <RecruitmentIcon size={34} />
        </span>

        <div style={{ marginTop: 22 }}>
          <span className="badge badge-neutral" style={{ fontSize: 12 }}>
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
          Bharat Navya Recruitment
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
          Post roles and connect with vetted candidates. We&apos;re building it as part of the
          Bharat Navya platform — leave your details and we&apos;ll tell you the moment it goes live.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 30 }}>
          <a href={mailto} className="btn btn-brand btn-lg">
            Notify me / Talk to us
          </a>
          <Link href="/" className="btn btn-secondary btn-lg">
            Back to all products
          </Link>
        </div>

        <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 18 }}>
          One Bharat Navya account will connect the available products.
        </p>
      </div>
    </div>
  );
}
