"use client";

// ValueProps — the "why come on board" answer, split cleanly into two columns:
// For buyers and For sellers. Each is a card with a benefit list (SVG check
// icons) and a single clear CTA. Blue accent for the buyer/trust side, orange
// action accent for the seller/conversion side.

import React from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";

function Check({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: "var(--r-pill)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: color === "brand" ? "var(--brand-tint)" : "var(--action-tint)",
        color: color === "brand" ? "var(--brand)" : "var(--action)",
        marginTop: 1,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

function BuyerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function SellerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3h2l2.4 12.4a2 2 0 002 1.6h7.7a2 2 0 002-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

interface Column {
  accent: "brand" | "action";
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  points: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaClass: string;
}

const COLUMNS: Column[] = [
  {
    accent: "brand",
    eyebrow: "For buyers",
    icon: <BuyerIcon />,
    title: "Source anything, from one place",
    subtitle: "Products and services across every Indian industry — matched to you by AI.",
    points: [
      "Describe your need in plain words — AI finds the right supplier",
      "Compare verified vendors by rating, location and response time",
      "Post one requirement (RFQ) and receive multiple quotes",
      "Deal direct with sellers — no commission, no middlemen",
    ],
    ctaLabel: "Find suppliers",
    ctaHref: "/categories",
    ctaClass: "btn btn-brand",
  },
  {
    accent: "action",
    eyebrow: "For sellers",
    icon: <SellerIcon />,
    title: "Reach buyers across India",
    subtitle: "List free, get discovered, and turn enquiries into business — one account to buy and sell.",
    points: [
      "List your products and services free — no setup cost",
      "Get discovered by buyers in every state, in your language",
      "Receive qualified leads and enquiries straight to you",
      "Grow faster with boosts, ads and a verified badge",
    ],
    ctaLabel: "Start selling — free",
    ctaHref: "/register",
    ctaClass: "btn btn-primary",
  },
];

export default function ValueProps() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {COLUMNS.map((col, i) => (
        <Reveal key={col.eyebrow} delay={i * 90}>
        <div
          className="card card-flat"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "clamp(24px, 4vw, 34px)",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span
              aria-hidden
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                borderRadius: "var(--r-sm)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: col.accent === "brand" ? "var(--brand-tint)" : "var(--action-tint)",
                color: col.accent === "brand" ? "var(--brand)" : "var(--action)",
              }}
            >
              {col.icon}
            </span>
            <span
              className="eyebrow"
              style={{ color: col.accent === "brand" ? "var(--brand)" : "var(--action)" }}
            >
              {col.eyebrow}
            </span>
          </div>

          <h3 style={{ fontSize: "clamp(20px, 2.6vw, 24px)", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            {col.title}
          </h3>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>{col.subtitle}</p>

          <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {col.points.map((p) => (
              <li key={p} style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <Check color={col.accent} />
                <span style={{ fontSize: "var(--fs-sm)", color: "var(--ink)", lineHeight: 1.5 }}>{p}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 26, paddingTop: 4 }}>
            <Link href={col.ctaHref} className={col.ctaClass}>
              {col.ctaLabel}
            </Link>
          </div>
        </div>
        </Reveal>
      ))}
    </div>
  );
}
