"use client";

// TrendingSearches — "Trending Searches Near You". Real data: ranked by
// actual search-event volume from the last 14 days
// (backend/routes/searchTrends.js), city-aware, padded with a curated
// fallback list so the rail is never empty on a fresh install — see
// frontend-design-guide.md v8. A horizontal-scroll row of bordered tiles,
// each linking to real search results for that query/category.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getTrendingSearches } from "@/lib/api";
import type { SearchTrendItem } from "@/lib/types";
import { useSearchDock } from "@/lib/searchDock";
import { PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { imgFor, imgForText } from "@/lib/categoryImages";

function hrefFor(item: SearchTrendItem): string {
  return item.categorySlug ? `/${item.categorySlug}` : `/search?q=${encodeURIComponent(item.query)}`;
}

export default function TrendingSearches({ className = "" }: { className?: string }) {
  // City is used only to scope which trend rows the backend returns (still
  // geolocation-aware via the search dock) — the heading itself never names
  // a specific city, since that read as showing the wrong place to signed-in
  // users whose stored profile city != where they actually are.
  const { city: dockedCity } = useSearchDock();
  const city = dockedCity && dockedCity !== PAN_INDIA_LABEL ? dockedCity : undefined;

  const [items, setItems] = useState<SearchTrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTrendingSearches({ city, limit: 8 })
      .then((rows) => alive && setItems(rows || []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [city]);

  return (
    <div className={["card card-flat", className].join(" ")} style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--ink)" }}>
          Trending Searches Near You
        </h3>
        <span className="badge badge-new">NEW</span>
      </div>
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginTop: 4 }}>
        Stay updated with the latest local trends.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 16,
          overflowX: "auto",
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {(loading ? Array.from({ length: 4 }) : items).map((item, i) => (
          <div
            key={loading ? i : (item as SearchTrendItem).query + i}
            className="card"
            style={{ flexShrink: 0, width: 220, display: "flex", alignItems: "center", gap: 10, padding: 10, minWidth: 0 }}
          >
            {loading ? (
              <>
                <span className="skeleton" style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", flexShrink: 0 }} />
                <span className="skeleton" style={{ height: 14, width: "70%" }} />
              </>
            ) : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", overflow: "hidden", flexShrink: 0, background: "var(--bg-subtle)" }}>
                  <img
                    src={`/demo/${
                      (item as SearchTrendItem).categorySlug
                        ? imgFor({ slug: (item as SearchTrendItem).categorySlug as string, name: (item as SearchTrendItem).query }, i)
                        : imgForText((item as SearchTrendItem).query, i)
                    }.jpg`}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <span style={{ minWidth: 0 }}>
                  <span className="line-clamp-1" style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
                    {(item as SearchTrendItem).query}
                  </span>
                  <Link
                    href={hrefFor(item as SearchTrendItem)}
                    className=""
                    style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--brand)" }}
                  >
                    Explore →
                  </Link>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
