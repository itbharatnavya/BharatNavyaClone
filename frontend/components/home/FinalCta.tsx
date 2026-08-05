"use client";

// FinalCta — the closing conversion band. Bold headline, one primary (orange)
// action to start selling and one secondary route to explore the marketplace.
// Brand-tinted background, no emojis, fully responsive.

import React from "react";
import Link from "next/link";

export default function FinalCta() {
  return (
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
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        One account · Buy and sell
      </div>
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
        Join thousands of businesses growing on BharatSource
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
        List free in minutes, get discovered by buyers across India, and turn enquiries into orders — with no commission on your deals.
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
          marginTop: 28,
        }}
      >
        <Link href="/register" className="btn btn-primary btn-lg">
          Start selling — free
        </Link>
        <Link href="/categories" className="btn btn-secondary btn-lg">
          Explore the marketplace
        </Link>
      </div>
    </div>
  );
}
