"use client";

// BrandRail — the "Top brands" section on a store (category) page. Self-fetches
// the category's brands, renders a wrapping rail of monogram mini-cards linking
// to each brand landing, plus a "View all brands" link. Renders nothing when the
// category has no brands.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getBrands } from "@/lib/api";
import type { Brand } from "@/lib/api";
import { Monogram } from "@/components/brand/BrandCard";

function TagGlyphIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4h8a2 2 0 011.4.6l8.4 8.4a2 2 0 010 2.8z" />
      <circle cx="7" cy="8" r="1.4" />
    </svg>
  );
}

export default function BrandRail({ slug, max = 10 }: { slug: string; max?: number }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setReady(false);
    getBrands(slug)
      .then((rows) => alive && setBrands(Array.isArray(rows) ? rows : []))
      .catch(() => alive && setBrands([]))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  // Nothing to show (and no layout shift) until we know there are brands.
  if (!ready || brands.length === 0) return null;

  return (
    <section className="card card-flat card-pad" style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--action-tint)",
              color: "var(--action-hover)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TagGlyphIcon />
          </span>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            Top brands
          </h2>
        </div>
        <Link
          href="/brands"
          className="hover:text-brand-hover"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--brand)",
            whiteSpace: "nowrap",
          }}
        >
          View all brands
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {brands.slice(0, max).map((b) => (
          <Link
            key={b.slug}
            href={`/brand/${b.slug}`}
            className="card group"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px 8px 8px",
              minWidth: 0,
            }}
          >
            <Monogram name={b.name} size={38} />
            <span style={{ minWidth: 0 }}>
              <span
                className="line-clamp-1 group-hover:text-brand"
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink)",
                  transition: "color 120ms ease",
                }}
              >
                {b.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--faint)" }}>
                {b.count} {b.count === 1 ? "product" : "products"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
