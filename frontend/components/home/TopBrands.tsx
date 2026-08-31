"use client";

// TopBrands — a "Top brands" social-proof strip. Self-fetches the aggregated
// brands (from product listings) and renders monogram chips linking to each
// brand landing (/brand/<slug>). Renders the entire section (heading + strip)
// only when brands exist, so it never leaves an empty heading behind.

import React from "react";
import Link from "next/link";
import { Monogram } from "@/components/brand/BrandCard";
import SectionHeading from "@/components/home/SectionHeading";
import { useBrands } from "@/lib/catalog";

export interface TopBrandsProps {
  max?: number;
}

export default function TopBrands({ max = 12 }: TopBrandsProps) {
  const { brands, loading } = useBrands();

  if (loading || brands.length === 0) return null;

  return (
    <section className="container-bs section-pad-sm">
      <SectionHeading
        eyebrow="Trusted names"
        title="Top brands on BharatSource"
        subtitle="Genuine products from brands buyers know — sourced through verified sellers."
        actionLabel="View all brands"
        actionHref="/brands"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {brands.slice(0, max).map((b) => (
          <Link
            key={b.slug}
            href={`/brand/${b.slug}`}
            className="card group"
            style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 10px", minWidth: 0 }}
          >
            <Monogram name={b.name} size={40} />
            <span style={{ minWidth: 0 }}>
              <span
                className="line-clamp-1"
                style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}
              >
                {b.name}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--faint)" }}>
                {b.count} {b.count === 1 ? "product" : "products"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
