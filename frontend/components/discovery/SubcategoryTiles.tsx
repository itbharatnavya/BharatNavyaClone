"use client";

// SubcategoryTiles — the "Shop by category" section on a store (category) page.
// Each child category is an image tile (themed local /demo image, else a tinted
// tile with the shared category icon) linking to that sub-store. Renders nothing
// when there are no children.

import React from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "@/components/CategoryMegaMenu";

// Keyword → pool of local demo images (never external URLs). The first theme whose
// keyword appears in the slug/name wins; an image is picked deterministically from
// the pool so sibling tiles vary instead of repeating one photo.
const THEMES: { keys: string[]; images: string[] }[] = [
  { keys: ["textile", "fabric", "yarn"], images: ["textile-1", "textile-2", "textile-3", "textile-4", "textile-5"] },
  { keys: ["apparel", "cloth", "garment", "wear"], images: ["apparel-1", "apparel-2", "apparel-3", "apparel-4"] },
  { keys: ["metal", "steel", "alloy", "iron"], images: ["steel-1", "steel-2", "steel-3", "metal-1", "metal-2"] },
  { keys: ["machin", "equipment", "industrial"], images: ["machinery-1", "machinery-2", "machinery-3", "machinery-4"] },
  { keys: ["chemical", "dye", "solvent"], images: ["chemical-1", "chemical-2", "chemical-3"] },
  { keys: ["electronic", "electric"], images: ["electronics-1", "electronics-2", "electronics-3", "electronics-4", "electronics-5"] },
  { keys: ["pack", "print"], images: ["packaging-1", "packaging-2", "packaging-3", "packaging-4"] },
  { keys: ["construct", "building", "cement"], images: ["construction-1", "construction-2", "construction-3", "construction-4", "construction-5"] },
  { keys: ["auto", "vehicle", "tyre", "tire"], images: ["automotive-1", "automotive-2", "automotive-3", "automotive-4"] },
  { keys: ["agri", "farm", "crop"], images: ["agriculture-1", "agriculture-2", "agriculture-3", "agriculture-4", "agriculture-5"] },
  { keys: ["pharma", "lab"], images: ["medical-2", "medical-3", "medical-4"] },
  { keys: ["medical", "health"], images: ["medical-1", "medical-2", "medical-3", "medical-4"] },
  { keys: ["food", "beverage", "grocery"], images: ["food-1", "food-2", "food-3", "food-4"] },
  { keys: ["home", "furniture", "furnishing"], images: ["home-1", "home-2", "home-3", "home-4"] },
  { keys: ["plastic", "polymer", "rubber"], images: ["industry-3", "industry-4"] },
  { keys: ["tool"], images: ["industry-1", "industry-2"] },
  { keys: ["office", "stationery"], images: ["business-3", "business-4"] },
  { keys: ["beauty", "personal", "wellness", "gift", "craft", "sport", "retail"], images: ["retail-1", "retail-2", "retail-3", "retail-4"] },
  { keys: ["logistic", "transport", "warehous"], images: ["logistics-1", "logistics-2"] },
  { keys: ["account", "consult", "service", "education", "training", "event"], images: ["business-1", "business-2", "business-5"] },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function themeImage(cat: Category): string | null {
  const hay = `${cat.slug} ${cat.name}`.toLowerCase();
  for (const theme of THEMES) {
    if (theme.keys.some((k) => hay.includes(k))) {
      const pick = theme.images[hash(cat.slug) % theme.images.length];
      return `/demo/${pick}.jpg`;
    }
  }
  return null;
}

export default function SubcategoryTiles({ items }: { items: Category[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
        Shop by category
      </h2>
      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        }}
      >
        {items.map((c) => {
          const img = themeImage(c);
          return (
            <Link
              key={c.id || c.slug}
              href={`/${c.slug}`}
              className="card group"
              style={{ overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}
            >
              <div
                style={{
                  aspectRatio: "4 / 3",
                  background: img ? undefined : "var(--brand-tint)",
                  backgroundImage: img ? `url(${img})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!img && <CategoryIcon slug={c.slug} name={c.name} size={40} />}
              </div>
              <div style={{ padding: "10px 12px", minWidth: 0 }}>
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
                  {c.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
