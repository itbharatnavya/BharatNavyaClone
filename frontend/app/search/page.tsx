"use client";

// Search — reads ?q (+ optional filters) and renders the shared faceted results.
// If the query reads like a natural request, we also surface the AI concierge bar.

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AISearchBar from "@/components/AISearchBar";
import DiscoveryResults from "@/components/discovery/DiscoveryResults";
import { useTr, useFlag, parseDiscoverySeed } from "@/components/discovery/hooks";

function looksNatural(q: string): boolean {
  const words = q.trim().split(/\s+/).filter(Boolean);
  return (
    words.length >= 4 ||
    /\b(in|near|for|under|below|best|cheap|top|need|want|around)\b/i.test(q)
  );
}

function num(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function SearchInner() {
  const params = useSearchParams();
  const t = useTr();
  const mapView = useFlag("mapView");

  // q + city + type + budget + verified + category become *removable* seeded
  // filters; only minPrice (rare, no chip) stays a fixed base constraint.
  const seed = parseDiscoverySeed(params);
  const q = seed.query;

  const baseQuery = {
    minPrice: num(params.get("minPrice")),
  };

  const showAI = q ? looksNatural(q) : false;

  return (
    <div className="container-bs section-pad-sm">
      <div style={{ marginBottom: showAI ? 20 : 28 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          {t("search.eyebrow", "Search")}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          {q
            ? `${t("search.resultsFor", "Results for")} “${q}”`
            : t("search.title", "Browse the marketplace")}
        </h1>
      </div>

      {showAI && (
        <div style={{ maxWidth: 720, marginBottom: 30 }}>
          <AISearchBar size="compact" examples={[]} />
        </div>
      )}

      <DiscoveryResults
        baseQuery={baseQuery}
        initialFilters={seed.initialFilters}
        query={q}
        syncUrl
        enableCategoryFilter
        showMapToggle={mapView}
        defaultSort="relevance"
        emptyTitle={t("search.empty.title", "No matches found")}
        emptyMessage={t(
          "search.empty.message",
          "Try different keywords, remove a filter, or describe what you need in the AI search above."
        )}
      />
    </div>
  );
}

function SearchFallback() {
  return (
    <div className="container-bs section-pad-sm">
      <span className="skeleton" style={{ display: "block", height: 30, width: 280, marginBottom: 28 }} />
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
            <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 0 }} />
            <div style={{ padding: 16 }}>
              <span className="skeleton" style={{ display: "block", height: 14, width: "90%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchInner />
    </Suspense>
  );
}
