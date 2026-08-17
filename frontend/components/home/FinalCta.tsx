"use client";

// FinalCta — the closing conversion band. Bold navy gradient with soft
// orange/green radial accents, matching the suite homepage's closing "Ready
// when you are" band (app/page.tsx) so the two products feel like one
// family instead of Directory ending on a flat white note. No emojis, fully
// responsive.

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
          "radial-gradient(600px 280px at 90% -15%, rgba(245,130,31,0.38) 0%, rgba(245,130,31,0) 65%)," +
          "radial-gradient(520px 260px at 5% 115%, rgba(30,158,82,0.32) 0%, rgba(30,158,82,0) 65%)," +
          "linear-gradient(135deg, var(--navy-mid) 0%, var(--navy) 55%, var(--navy-deep) 100%)",
        borderColor: "var(--navy-deep)",
      }}
    >
      <div className="home-eyebrow" style={{ marginBottom: 14, justifyContent: "center", color: "rgba(255,255,255,0.88)" }}>
        One account · Buy and sell
      </div>
      <h2
        style={{
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "#ffffff",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        Join thousands of businesses growing on BharatSource
      </h2>
      <p
        style={{
          fontSize: "clamp(15px, 2.2vw, 18px)",
          color: "rgba(255,255,255,0.75)",
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
        <Link href="/categories" className="btn btn-lg" style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.28)" }}>
          Explore the marketplace
        </Link>
      </div>
    </div>
  );
}
