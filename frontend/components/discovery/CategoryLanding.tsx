"use client";

// Shared category / category-in-city landing. Breadcrumbs · sub-category chips ·
// faceted results (DiscoveryResults). Friendly empty state for unknown slugs.

import React, { useEffect, useState } from "react";
import { getCategory } from "@/lib/api";
import type { CategoryNode } from "@/lib/types";
import type { ListingFilterState } from "@/components/Filters";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import { CategoryIcon } from "@/components/CategoryMegaMenu";
import AdSlider from "@/components/AdSlider";
import { useSearchDock } from "@/lib/searchDock";
import { PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import DiscoveryResults from "./DiscoveryResults";
import SubcategoryChips from "./SubcategoryChips";
import SubcategoryTiles from "./SubcategoryTiles";
import BrandRail from "./BrandRail";
import EmptyState from "./EmptyState";
import { useTr } from "./hooks";

export interface CategoryLandingProps {
  slug: string;
  city?: string; // display name (already prettified)
  /** Removable filters/query seeded from the AI hero search (?city&type&budget&q). */
  initialFilters?: ListingFilterState;
  query?: string;
}

function HeaderBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="counter-category-hero">
      <div className="container-bs counter-category-hero-inner">
        {children}
      </div>
    </section>
  );
}

export default function CategoryLanding({ slug, city, initialFilters, query }: CategoryLandingProps) {
  const t = useTr();
  const {
    query: dockedQuery,
    setQuery: setDockedQuery,
    city: dockedCity,
    setCity: setDockedCity,
  } = useSearchDock();

  const [node, setNode] = useState<CategoryNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Hydrate the shared search-dock query/city from the URL on first mount —
  // a direct link or page refresh has no prior client-navigation to inherit
  // the dock's in-memory state from. Only fills in when the dock is still
  // empty, so it never clobbers something the user already typed elsewhere
  // in the same session.
  useEffect(() => {
    if (query && !dockedQuery) setDockedQuery(query);
    if (initialFilters?.city && dockedCity === PAN_INDIA_LABEL) setDockedCity(initialFilters.city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setNode(null);
    getCategory(slug)
      .then((n) => {
        if (!alive) return;
        setNode(n);
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  // NOTE: this page deliberately does NOT self-pin the search-bar chip to
  // whatever category it's showing. Landing here isn't necessarily a search —
  // a mega-menu click, subcategory tile, or direct link is just browsing.
  // The chip is only ever set by an actual search action (DirectorySearchBar
  // picking a category suggestion) — see lib/searchDock.tsx's markSearchNav.

  // ---- Unknown category ----
  if (!loading && (notFound || !node)) {
    return (
      <div className="container-bs section-pad">
        <EmptyState
          title={t("category.notFound.title", "We couldn't find that category")}
          message={t(
            "category.notFound.message",
            "The category may have moved or been renamed. Try searching or browse from the homepage."
          )}
          actionLabel={t("category.notFound.cta", "Back to home")}
          actionHref="/"
        />
      </div>
    );
  }

  // ---- Loading header ----
  if (loading || !node) {
    return (
      <div className="counter-public-page counter-category-page">
        <HeaderBand>
          <span className="skeleton" style={{ display: "block", height: 12, width: 220, marginBottom: 16 }} />
          <span className="skeleton" style={{ display: "block", height: 30, width: 320, marginBottom: 12 }} />
          <span className="skeleton" style={{ display: "block", height: 30, width: "60%", maxWidth: 420 }} />
        </HeaderBand>
        <div className="container-bs section-pad-sm">
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
      </div>
    );
  }

  const { category, children, ancestors } = node;

  const crumbs: Crumb[] = [
    { label: t("nav.directoryCrumb", "Directory"), href: "/directory" },
    ...(ancestors || []).map((a) => ({ label: a.name, href: `/${a.slug}` })),
    city ? { label: category.name, href: `/${category.slug}` } : { label: category.name },
  ];
  if (city) crumbs.push({ label: city });

  const heading = city ? `${category.name} in ${city}` : category.name;

  return (
    <div className="counter-public-page counter-category-page">
      <HeaderBand>
        <Breadcrumbs items={crumbs} />
        <div className="counter-category-title-row">
          <span className="counter-category-icon"><CategoryIcon slug={category.slug} name={category.name} size={52} /></span>
          <div>
            <p className="counter-category-eyebrow">Directory category</p>
            <h1>
              {heading}
            </h1>
            {/* Category-wide count (not city-scoped) — only shown when the heading
                itself isn't already narrowed to a city, so the number never implies
                more precision than it has. */}
            {!city && typeof category.listingCount === "number" && category.listingCount > 0 && (
              <span className="counter-category-count">
                {category.listingCount.toLocaleString("en-IN")} listings
              </span>
            )}
          </div>
        </div>
        {category.description && (
          <p className="counter-category-description">
            {category.description}
          </p>
        )}
        {children && children.length > 0 && (
          <div className="counter-category-chips">
            <SubcategoryChips items={children} />
          </div>
        )}
      </HeaderBand>

      {/* No embedded search bar here — the navbar's persistent copy (see
          Navbar.tsx) is the single search entry point on every Directory
          page, category pages included; a second bar here was redundant.
          The category chip it shows while you're here still comes from the
          self-pinning effect above. */}
      <div className="container-bs section-pad-sm counter-category-content">
        {/* Category-top ad slider (rotates all active bookings; hidden when none). */}
        <AdSlider placement="category_top" categorySlug={slug} />

        {/* Store sections: sub-category image tiles + a rail of the store's top brands.
            Each renders nothing when its data is absent. */}
        {children && children.length > 0 && <SubcategoryTiles items={children} />}
        <BrandRail slug={slug} />

        <DiscoveryResults
          baseQuery={
            city
              ? { category: slug, city, near: city }
              : { category: slug }
          }
          initialFilters={initialFilters}
          query={query}
          syncUrl
          near={city}
          adRail
          subcategories={(children || []).map((c) => ({
            slug: c.slug,
            name: c.name,
            count: c.listingCount,
          }))}
          defaultSort="newest"
          emptyTitle={t("category.empty.title", "No listings here yet")}
          emptyMessage={t(
            "category.empty.message",
            "Be the first to list in this category, or adjust your filters to see more."
          )}
        />
      </div>
    </div>
  );
}
