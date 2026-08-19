"use client";

// Search — two views, switched on whether the visitor did a genuine
// free-text search:
//   - `?q=` present (and not `&view=all`): GlobalSearchResults, a unified
//     Category + Company + Product/Service list — see that file for why.
//   - Everything else (no typed query, filter/category browsing, or the
//     explicit `&view=all` escape hatch): the plain faceted DiscoveryResults
//     grid/list, backed by ONE API call (getListings) — unchanged, same as
//     every other Directory browse surface (category pages, brand pages).
// A grouped Companies/Products/Categories overview briefly existed here
// before being reverted back to single-query-only (see git history); this
// reintroduces the same idea deliberately scoped to genuine text search only,
// with each source resolving independently rather than gating on all three.

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DiscoveryResults from "@/components/discovery/DiscoveryResults";
import GlobalSearchResults from "@/components/discovery/GlobalSearchResults";
import { useTr, useFlag, parseDiscoverySeed } from "@/components/discovery/hooks";
import { useSearchDock } from "@/lib/searchDock";
import { PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useCategories, flattenCategories } from "@/lib/catalog";

function num(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function SearchInner() {
  const params = useSearchParams();
  const t = useTr();
  const mapView = useFlag("mapView");
  const {
    query: dockedQuery,
    setQuery: setDockedQuery,
    city: dockedCity,
    setCity: setDockedCity,
    selectedCategory: dockedCategory,
    setSelectedCategory: setDockedCategory,
  } = useSearchDock();

  // q + city + type + budget + verified + category become *removable* seeded
  // filters; only minPrice (rare, no chip) stays a fixed base constraint.
  const seed = parseDiscoverySeed(params);
  const q = seed.query;
  // A genuine free-text search shows the unified Category/Company/Product
  // list by default; `&view=all` (from that view's own "View all N results"
  // link) drops back into the plain filtered/paginated list for the same
  // query. Deliberately keyed on `q` alone, not `initialFilters.category` or
  // anything else — picking a suggestion never lands here with `?q=` set (it
  // navigates straight to the specific category/listing instead), so this
  // can't misfire for a plain category-filter-only browse.
  const showUnified = !!q && params.get("view") !== "all";

  const baseQuery = {
    minPrice: num(params.get("minPrice")),
  };

  // The Navbar's search bar is the only one on this page (no embedded copy),
  // so it needs to reflect this page's own URL on a direct link / refresh,
  // when there's no prior client-navigation commit for it to already be
  // showing. Only fills in when the dock is still empty, so it never
  // clobbers a value DirectorySearchBar itself just committed a moment
  // before pushing here.
  useEffect(() => {
    if (q && !dockedQuery) setDockedQuery(q);
    if (seed.initialFilters.city && dockedCity === PAN_INDIA_LABEL) setDockedCity(seed.initialFilters.city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Category chip in the docked search bar needs the flattened category list
  // (for its display name), which loads asynchronously — sync the dock's
  // chip once available, but don't clobber a chip that already matches (e.g.
  // set by DirectorySearchBar's own commit just before it navigated here).
  const { categories: catalogCategories, loading: categoriesLoading } = useCategories();
  const allCategories = flattenCategories(catalogCategories);
  const categoriesLoaded = !categoriesLoading;
  const urlCategorySlug = seed.initialFilters.category;
  useEffect(() => {
    if (!urlCategorySlug || !categoriesLoaded) return;
    if (dockedCategory?.slug === urlCategorySlug) return;
    const match = allCategories.find((c) => c.slug === urlCategorySlug);
    setDockedCategory({ slug: urlCategorySlug, name: match ? match.name : urlCategorySlug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategorySlug, categoriesLoaded, allCategories]);

  return (
    <div className="container-bs section-pad-sm">
      <div style={{ marginBottom: 28 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          {t("search.eyebrow", "Search")}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          {q
            ? `${t("search.resultsFor", "Results for")} "${q}"`
            : t("search.title", "Browse the marketplace")}
        </h1>
      </div>

      {showUnified ? (
        <GlobalSearchResults query={q} />
      ) : (
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
            "Try different keywords or remove a filter, or post a requirement and let sellers come to you."
          )}
        />
      )}
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
