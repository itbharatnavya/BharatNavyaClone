"use client";

// PopularSearches — "Popular Searches": all-time ranked search terms
// (backend/routes/searchTrends.js GET /popular), same never-empty fallback
// as TrendingSearches. Cards use a full-bleed photo + colour-wash gradient
// (echoing PromoBanner's cycling brand/navy/action/green overlays) with the
// title and "Enquire Now" action overlaid directly on the image, rather than
// a separate solid-colour block underneath — keeps every card visually
// distinct instead of one repeated blue band. "Enquire Now" routes to real
// search results for that query — this app is lead/directory-only (no
// cart/checkout per CLAUDE.md), so "enquire" means "show me matching
// vendors," not a purchase action.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getPopularSearches } from "@/lib/api";
import type { SearchTrendItem } from "@/lib/types";
import { imgFor, imgForText } from "@/lib/categoryImages";
import Reveal from "@/components/Reveal";
import SectionHeading from "./SectionHeading";

function hrefFor(item: SearchTrendItem): string {
  return item.categorySlug ? `/${item.categorySlug}` : `/search?q=${encodeURIComponent(item.query)}`;
}

// Cycling colour wash per card — the same brand/action/green/navy palette
// PromoBanner already uses for its photo tiles, so the two "photo + colour
// overlay" moments on this page read as one deliberate pattern.
const WASHES = [
  "linear-gradient(175deg, rgba(26,79,174,0.04) 0%, rgba(26,79,174,0.5) 55%, rgba(18,59,135,0.94) 100%)",
  "linear-gradient(175deg, rgba(245,130,31,0.04) 0%, rgba(245,130,31,0.5) 55%, rgba(196,94,10,0.94) 100%)",
  "linear-gradient(175deg, rgba(30,158,82,0.04) 0%, rgba(30,158,82,0.5) 55%, rgba(19,110,58,0.94) 100%)",
  "linear-gradient(175deg, rgba(22,48,92,0.04) 0%, rgba(22,48,92,0.5) 55%, rgba(10,26,53,0.94) 100%)",
];

export default function PopularSearches({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<SearchTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPopularSearches({ limit: 8 })
      .then((rows) => alive && setItems(rows || []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={className}>
      <SectionHeading title="Popular Searches" subtitle="What buyers across India are asking for right now." />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {(loading ? Array.from({ length: 4 }) : items).map((item, i) =>
          loading ? (
            <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
              <span className="skeleton" style={{ display: "block", aspectRatio: "4 / 3" }} />
            </div>
          ) : (
            <Reveal key={(item as SearchTrendItem).query + i} delay={(i % 4) * 70}>
              <Link
                href={hrefFor(item as SearchTrendItem)}
                className="group"
                style={{
                  position: "relative",
                  display: "block",
                  overflow: "hidden",
                  borderRadius: 16,
                  aspectRatio: "4 / 3",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <img
                  src={`/demo/${
                    (item as SearchTrendItem).categorySlug
                      ? imgFor({ slug: (item as SearchTrendItem).categorySlug as string, name: (item as SearchTrendItem).query }, i)
                      : imgForText((item as SearchTrendItem).query, i)
                  }.jpg`}
                  alt=""
                  loading="lazy"
                  className="transition-transform duration-500 ease-out group-hover:scale-110"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <span aria-hidden style={{ position: "absolute", inset: 0, background: WASHES[i % WASHES.length] }} />
                <span style={{ position: "absolute", left: 14, right: 14, bottom: 14, zIndex: 1 }}>
                  <span className="line-clamp-2" style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: "#ffffff", lineHeight: 1.3 }}>
                    {(item as SearchTrendItem).query}
                  </span>
                  <span
                    className="btn btn-sm transition-transform duration-300 group-hover:translate-x-1"
                    style={{ marginTop: 10, background: "#ffffff", color: "var(--ink)", pointerEvents: "none" }}
                  >
                    Enquire Now →
                  </span>
                </span>
              </Link>
            </Reveal>
          )
        )}
      </div>
    </div>
  );
}
