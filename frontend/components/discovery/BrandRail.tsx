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
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>Top brands</h2>
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
