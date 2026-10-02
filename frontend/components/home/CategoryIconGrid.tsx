"use client";

// CategoryIconGrid — a compact row of category tiles
// shown right after the hero search: a handful of large category cards
// (icon chip from components/home/CategoryBadge.tsx + label), each a
// proper `.card` tile with the app's own hover-lift, rather than bare
// floating icons — plus a trailing "More categories" tile. Deliberately few
// and large rather than the mega-menu's dense list of small glyphs, so the
// row reads at a glance. Takes the same curated, admin-prioritised category
// list as the "Explore top categories" section further down the page
// (app/directory/page.tsx computes it once, from admin
// `featuredCategorySlugs` or `order`) — what shows here is admin-controlled,
// not a hardcoded pick.
//
// Grid, not flex-wrap: `repeat(auto-fit, minmax(..., 1fr))` collapses any
// unused trailing track and stretches the placed tiles to fill the row
// edge-to-edge (so there's no dead gap after "More categories"), while still
// wrapping to fewer, larger columns on narrower screens instead of
// overflowing.

import React from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import CategoryBadge from "./CategoryBadge";

export interface CategoryIconGridProps {
  categories: Category[];
}

const MAX_TILES = 9;
const BADGE_SIZE = 60;

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="5" cy="12" r="1.7" fill="#fff" />
      <circle cx="12" cy="12" r="1.7" fill="#fff" />
      <circle cx="19" cy="12" r="1.7" fill="#fff" />
    </svg>
  );
}

const tileStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
  textAlign: "center",
  minWidth: 0,
  padding: "18px 10px",
  borderRadius: "var(--r-md)",
};

export default function CategoryIconGrid({ categories }: CategoryIconGridProps) {
  if (!categories || categories.length === 0) return null;
  const tiles = categories.slice(0, MAX_TILES);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 12 }}>
      {tiles.map((c) => (
        <Link key={c.id || c.slug} href={`/${c.slug}`} className="card" style={tileStyle}>
          <CategoryBadge slug={c.slug} name={c.name} size={BADGE_SIZE} />
          <span className="line-clamp-2" style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>
            {c.name}
          </span>
        </Link>
      ))}

      <Link href="/categories" className="card" style={tileStyle}>
        <span
          style={{
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: Math.round(BADGE_SIZE * 0.28),
            background: "var(--navy)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MoreIcon />
        </span>
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--brand)", lineHeight: 1.3 }}>
          More categories
        </span>
      </Link>
    </div>
  );
}
