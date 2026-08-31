"use client";

// A single product tile for the suite homepage grid. Live products (Directory,
// Consultations) read as clickable with a brand "Explore →" CTA and hover lift;
// "soon" products (Credit Card, Mutual) are visibly a teaser — neutral icon, a
// "Coming soon" badge — but still link to their placeholder product page.
// No emoji; the product's distinct SVG glyph carries the identity.

import React from "react";
import Link from "next/link";
import { ArrowRightIcon, type SuiteProduct } from "./products";

export default function ProductCard({ product }: { product: SuiteProduct }) {
  const soon = product.status === "soon";
  const { Icon } = product;

  return (
    <Link
      href={product.href}
      aria-label={`${product.name}${soon ? " (coming soon)" : ""}`}
      className={soon ? "card card-flat" : "card"}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "clamp(20px, 3vw, 26px)",
        height: "100%",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <span
          aria-hidden
          style={{
            width: 52,
            height: 52,
            flexShrink: 0,
            borderRadius: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: soon ? "var(--bg-subtle)" : "var(--brand-tint)",
            color: soon ? "var(--faint)" : "var(--brand)",
            border: soon ? "1px solid var(--border)" : "1px solid #dbe6fb",
          }}
        >
          <Icon size={26} />
        </span>
        {soon && <span className="badge badge-neutral">Coming soon</span>}
      </div>

      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>
          {product.name}
        </h3>
        <p style={{ fontSize: 14.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>
          {product.tagline}
        </p>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 4 }}>
        {soon ? (
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--faint)" }}>
            Notify me →
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--brand)",
            }}
          >
            Explore
            <ArrowRightIcon size={15} />
          </span>
        )}
      </div>
    </Link>
  );
}
