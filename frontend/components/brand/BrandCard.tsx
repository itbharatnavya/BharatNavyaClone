"use client";

// BrandCard — a directory tile for a single brand. A tinted MONOGRAM (first 1-2
// letters, never a logo or emoji) + the brand name + product count, linking to
// the brand landing page. Used by the /brands directory grid.

import React from "react";
import Link from "next/link";

export interface BrandCardBrand {
  name: string;
  slug: string;
  count: number;
}

/** First 1-2 letters of a brand name for the monogram tile (e.g. "Havells" → "Ha"). */
export function brandMonogram(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "?";
  const two = clean.slice(0, 2);
  return two.charAt(0).toUpperCase() + two.slice(1);
}

// Signature colours for the demo brands → a branded, logo-like badge. (Real brand
// logos aren't reliably fetchable here, so we render a clean brand-coloured wordmark
// badge — recognisable, consistent, and IP-safe.) Unmapped brands get a stable
// colour derived from the name.
const BRAND_COLORS: Record<string, string> = {
  havells: "#E4002B", tata: "#1A5DAD", ultratech: "#E11B22", polycab: "#00539F",
  bosch: "#EA0016", mrf: "#003DA5", kajaria: "#B01E28", exide: "#E01F26",
  supreme: "#0067B1", iffco: "#2E7D32", jindal: "#12356B", agripure: "#2E9E4F",
  packright: "#EA580C",
};
const FALLBACK_PALETTE = ["#2563EB", "#0F766E", "#1B3FA0", "#1B3FA0", "#BE185D", "#0891B2", "#4D7C0F"];
export function brandColor(name: string): string {
  const key = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const k of Object.keys(BRAND_COLORS)) if (key.startsWith(k)) return BRAND_COLORS[k];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

export function Monogram({ name, size = 56 }: { name: string; size?: number }) {
  const c = brandColor(name);
  return (
    <span
      aria-hidden
      title={name}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.max(10, Math.round(size * 0.22)),
        background: `linear-gradient(135deg, ${c}, ${c}cc)`,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.round(size * 0.4),
        letterSpacing: "-0.02em",
        lineHeight: 1,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      {brandMonogram(name)}
    </span>
  );
}

export default function BrandCard({ brand }: { brand: BrandCardBrand }) {
  return (
    <Link
      href={`/brand/${brand.slug}`}
      className="card group"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        minWidth: 0,
        textAlign: "left",
      }}
    >
      <Monogram name={brand.name} />
      <span style={{ minWidth: 0 }}>
        <span
          className="line-clamp-1"
          style={{
            display: "block",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--ink)",
            transition: "color 120ms ease",
          }}
        >
          {brand.name}
        </span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          {brand.count} {brand.count === 1 ? "product" : "products"}
        </span>
      </span>
    </Link>
  );
}
