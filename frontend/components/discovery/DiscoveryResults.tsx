"use client";

// The shared faceted-results engine used by the category, city, and search
// pages: left Filters rail (a bottom-anchored drawer on mobile) · sort dropdown
// (incl. "Nearest"/distance) · results grid of ListingCard · Map view toggle
// (Leaflet/OSM, gated by caller) · pagination · results count + facets ·
// graceful empty/loading/error states.
//
// It also *seeds + displays* filters handed in from the AI hero search:
//   - `initialFilters` / `query` seed the removable filter state on mount
//   - the Filters rail renders those as active (Type chip, City control, price tier)
//   - a row of removable "active filter" pills is shown above the results
//   - when `syncUrl` is set, filter changes are reflected back into the URL

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import * as api from "@/lib/api";
import type { ListingQuery } from "@/lib/api";
import type { Listing, ListingsResponse, ListingType } from "@/lib/types";
import Filters, { ListingFilterState, FilterOption, SubcategoryItem } from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/Pagination";
import EmptyState from "./EmptyState";
import { useTr } from "./hooks";

// Map only renders in the browser (Leaflet references window on load).
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="skeleton" style={{ height: 480, width: "100%", borderRadius: 12 }} />
  ),
});

export type SortValue =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "distance";

// Extended query shape: the backend (per FRONTEND-PAGES-SPEC) also accepts
// near/radiusKm/condition and sort=distance, which the base ListingQuery type
// predates. We build this and cast at the call boundary.
interface ExtQuery {
  q?: string;
  type?: ListingType;
  category?: string;
  city?: string;
  state?: string;
  verified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortValue;
  page?: number;
  limit?: number;
  near?: string;
  radiusKm?: number;
  condition?: string;
}

export interface DiscoveryResultsProps {
  /** Fixed constraints merged into every fetch (category slug, path city…). */
  baseQuery: ExtQuery;
  /** Removable filter state to pre-apply on mount (from the AI hero search). */
  initialFilters?: ListingFilterState;
  /** Removable free-text query to pre-apply + display ("Showing results for…"). */
  query?: string;
  /** Reflect filter/sort state back into the URL query string. */
  syncUrl?: boolean;
  /** Reference city for the "Nearest" sort when no city filter is chosen. */
  near?: string;
  /** Show the category facet in the left rail (search page). */
  enableCategoryFilter?: boolean;
  /** Child categories to show as a drill-down section in the rail. */
  subcategories?: SubcategoryItem[];
  /** Render the Map view toggle (caller gates on featureFlags.mapView). */
  showMapToggle?: boolean;
  defaultSort?: SortValue;
  limit?: number;
  /** Copy for the no-results state. */
  emptyTitle?: string;
  emptyMessage?: string;
}

const SORT_OPTIONS: { value: SortValue; labelKey: string; label: string }[] = [
  { value: "relevance", labelKey: "sort.relevance", label: "Relevance" },
  { value: "newest", labelKey: "sort.newest", label: "Newest" },
  { value: "price_asc", labelKey: "sort.priceAsc", label: "Price: Low to High" },
  { value: "price_desc", labelKey: "sort.priceDesc", label: "Price: High to Low" },
  { value: "rating", labelKey: "sort.rating", label: "Top Rated" },
  { value: "distance", labelKey: "sort.distance", label: "Nearest" },
];

// Human labels for the price-tier ceilings used by the Filters rail.
const PRICE_TIER_DISPLAY: Record<number, string> = {
  500: "₹500",
  1000: "₹1k",
  2000: "₹2k",
  5000: "₹5k",
};

function facetsToOptions(opts?: { value: string; label?: string; count?: number }[]): FilterOption[] {
  return (opts || []).map((o) => ({ value: o.value, label: o.label || o.value, count: o.count }));
}

function prettify(v: string): string {
  return v.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Brand isn't a first-class typed field on ProductDetail, but the API populates
// product.brand for products — read it defensively.
function brandOf(l: Listing): string | undefined {
  const b = (l.product as unknown as { brand?: unknown } | null | undefined)?.brand;
  return typeof b === "string" && b.trim() ? b.trim() : undefined;
}

// Build the Brand facet (name → count) from the current result set.
function brandFacet(listings: Listing[]): FilterOption[] {
  const m = new Map<string, number>();
  for (const l of listings) {
    const b = brandOf(l);
    if (b) m.set(b, (m.get(b) || 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, label: value, count }));
}

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export default function DiscoveryResults({
  baseQuery,
  initialFilters,
  query,
  syncUrl = false,
  near,
  enableCategoryFilter = false,
  subcategories = [],
  showMapToggle = false,
  defaultSort = "relevance",
  limit = 12,
  emptyTitle,
  emptyMessage,
}: DiscoveryResultsProps) {
  const t = useTr();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<ListingFilterState>(initialFilters || {});
  const [q, setQ] = useState<string>(query || "");
  const [sort, setSort] = useState<SortValue>(defaultSort);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "map">("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseKey = JSON.stringify(baseQuery);
  // Server-relevant filters only. Brand + rating are applied client-side, so
  // toggling them must NOT trigger a network refetch (avoids a loading flash).
  const serverFiltersKey = JSON.stringify({
    type: filters.type,
    city: filters.city,
    verified: filters.verified,
    priceMax: filters.priceMax,
    category: filters.category,
  });

  // ---- fetch ----
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const query: ExtQuery = {
      ...baseQuery,
      q: q || baseQuery.q || undefined,
      type: (filters.type || baseQuery.type || undefined) as ListingType | undefined,
      city: filters.city ?? baseQuery.city,
      verified: filters.verified || baseQuery.verified || undefined,
      maxPrice: filters.priceMax ?? baseQuery.maxPrice,
      category: enableCategoryFilter
        ? filters.category ?? baseQuery.category
        : baseQuery.category,
      sort,
      page,
      limit,
    };
    if (sort === "distance") {
      query.near = near || filters.city || baseQuery.city || baseQuery.near;
    }

    api
      .getListings(query as unknown as ListingQuery)
      .then((r) => alive && setData(r))
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load listings");
        setData(null);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey, serverFiltersKey, q, sort, page, limit, near, enableCategoryFilter]);

  // ---- URL sync (write) — skip the first run so we never rewrite what we read ----
  const didMount = useRef(false);
  useEffect(() => {
    if (!syncUrl) return;
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (filters.type) usp.set("type", filters.type);
    if (filters.city) usp.set("city", filters.city);
    if (filters.priceMax) usp.set("maxPrice", String(filters.priceMax));
    if (filters.verified) usp.set("verified", "true");
    if (enableCategoryFilter && filters.category) usp.set("category", filters.category);
    if (sort && sort !== defaultSort) usp.set("sort", sort);
    const qs = usp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, serverFiltersKey, sort]);

  // ---- lock body scroll while the mobile filter drawer is open ----
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Ensure the *active* city / category always appears as an option so the rail
  // control reflects an AI-seeded value even when it's absent from the facets.
  const cityOptions = useMemo(() => {
    const opts = facetsToOptions(data?.facets?.cities);
    if (filters.city && !opts.some((o) => o.value === filters.city)) {
      opts.unshift({ value: filters.city, label: filters.city });
    }
    return opts;
  }, [data, filters.city]);
  const categoryOptions = useMemo(() => {
    if (!enableCategoryFilter) return [];
    const opts = facetsToOptions(data?.facets?.categories);
    if (filters.category && !opts.some((o) => o.value === filters.category)) {
      opts.unshift({ value: filters.category, label: prettify(filters.category) });
    }
    return opts;
  }, [data, enableCategoryFilter, filters.category]);

  const listings: Listing[] = data?.listings || [];
  const total = data?.total ?? 0;

  // Brand facet reflects the current result set (backend has no brand facet).
  const brandOptions = useMemo(() => brandFacet(listings), [listings]);

  // Brand + rating are applied client-side (not backend query params) over the
  // fetched page. Keep the "active" facets in sync with what's actually shown.
  const selectedBrands = filters.brands || [];
  const clientFiltered = selectedBrands.length > 0 || !!filters.minRating;
  const displayListings = useMemo(() => {
    let out = listings;
    if (selectedBrands.length > 0) {
      out = out.filter((l) => {
        const b = brandOf(l);
        return b ? selectedBrands.includes(b) : false;
      });
    }
    if (filters.minRating) {
      out = out.filter((l) => (l.rating || 0) >= (filters.minRating as number));
    }
    return out;
  }, [listings, selectedBrands, filters.minRating]);
  const shownTotal = clientFiltered ? displayListings.length : total;

  const onFiltersChange = (next: ListingFilterState) => {
    setFilters(next);
    setPage(1);
  };
  const onSortChange = (s: SortValue) => {
    setSort(s);
    setPage(1);
  };
  const onPageChange = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const clearAll = () => {
    setFilters({});
    setQ("");
    setPage(1);
  };

  // ---- active-filter pills (removable, visible confirmation of applied filters) ----
  const cityLabel = (v: string) => cityOptions.find((o) => o.value === v)?.label || v;
  const categoryLabel = (v: string) =>
    categoryOptions.find((o) => o.value === v)?.label || prettify(v);
  const priceLabel = (n: number) => {
    const disp =
      PRICE_TIER_DISPLAY[n] ||
      `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
    return `${t("filters.under", "Under")} ${disp}`;
  };

  type Pill = { key: string; label: string; node?: React.ReactNode; onRemove: () => void };
  const pills: Pill[] = [];
  if (q) pills.push({ key: "q", label: `“${q}”`, onRemove: () => { setQ(""); setPage(1); } });
  if (filters.type)
    pills.push({
      key: "type",
      label:
        filters.type === "service"
          ? t("common.services", "Services")
          : t("common.products", "Products"),
      onRemove: () => onFiltersChange({ ...filters, type: "" }),
    });
  if (filters.city)
    pills.push({
      key: "city",
      label: `${t("filters.city", "City")}: ${cityLabel(filters.city)}`,
      onRemove: () => onFiltersChange({ ...filters, city: undefined }),
    });
  if (filters.priceMax)
    pills.push({
      key: "price",
      label: priceLabel(filters.priceMax),
      onRemove: () => onFiltersChange({ ...filters, priceMax: undefined }),
    });
  if (filters.verified)
    pills.push({
      key: "verified",
      label: t("filters.verifiedOnly", "Verified sellers only"),
      onRemove: () => onFiltersChange({ ...filters, verified: undefined }),
    });
  selectedBrands.forEach((b) =>
    pills.push({
      key: `brand-${b}`,
      label: b,
      onRemove: () =>
        onFiltersChange({
          ...filters,
          brands: selectedBrands.filter((x) => x !== b).length
            ? selectedBrands.filter((x) => x !== b)
            : undefined,
        }),
    })
  );
  if (filters.minRating)
    pills.push({
      key: "rating",
      label: `${filters.minRating}-star ${t("filters.andUp", "& up")}`,
      node: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          {filters.minRating}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            style={{ display: "block" }}
          >
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
          </svg>
          {t("filters.andUp", "& up")}
        </span>
      ),
      onRemove: () => onFiltersChange({ ...filters, minRating: undefined }),
    });
  if (enableCategoryFilter && filters.category)
    pills.push({
      key: "category",
      label: `${t("filters.category", "Category")}: ${categoryLabel(filters.category)}`,
      onRemove: () => onFiltersChange({ ...filters, category: undefined }),
    });

  const filterCount = [
    filters.type,
    filters.city,
    filters.priceMax,
    filters.verified,
    filters.minRating,
    enableCategoryFilter ? filters.category : undefined,
  ].filter(Boolean).length + selectedBrands.length;

  const railFilters = (
    <Filters
      value={filters}
      onChange={onFiltersChange}
      categories={categoryOptions}
      cities={cityOptions}
      brands={brandOptions}
      subcategories={subcategories}
    />
  );

  return (
    <>
      <div className="dr-layout">
        {/* Left rail (desktop) */}
        <aside className="dr-rail">
          <div className="dr-rail-inner">
            <div className="card card-flat card-pad">{railFilters}</div>
          </div>
        </aside>

        {/* Results column */}
        <div style={{ minWidth: 0 }}>
          {/* Toolbar */}
          <div className="dr-toolbar">
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              {loading ? (
                <span className="skeleton" style={{ display: "inline-block", width: 90, height: 14 }} />
              ) : (
                <>
                  <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{shownTotal}</strong>{" "}
                  {shownTotal === 1 ? t("results.one", "result") : t("results.many", "results")}
                </>
              )}
            </div>

            <div className="dr-controls">
              {/* Mobile: open filters drawer */}
              <button
                type="button"
                className="chip dr-filter-btn"
                onClick={() => setDrawerOpen(true)}
                aria-haspopup="dialog"
              >
                <FilterIcon />
                {t("filters.title", "Filters")}
                {filterCount > 0 ? ` (${filterCount})` : ""}
              </button>

              {showMapToggle && (
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <button
                    type="button"
                    className={view === "list" ? "chip chip-active" : "chip"}
                    onClick={() => setView("list")}
                    aria-pressed={view === "list"}
                  >
                    {t("view.list", "List")}
                  </button>
                  <button
                    type="button"
                    className={view === "map" ? "chip chip-active" : "chip"}
                    onClick={() => setView("map")}
                    aria-pressed={view === "map"}
                  >
                    {t("view.map", "Map")}
                  </button>
                </div>
              )}

              <label className="dr-sort">
                <span style={{ fontSize: 13, color: "var(--faint)" }}>{t("sort.label", "Sort")}</span>
                <select
                  className="select"
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as SortValue)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey, o.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* "Showing results for …" */}
          {q && (
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>
              {t("results.showingFor", "Showing results for")}{" "}
              <strong style={{ color: "var(--ink)", fontWeight: 700 }}>“{q}”</strong>
            </div>
          )}

          {/* Active-filter pills */}
          {pills.length > 0 && (
            <div className="dr-pills">
              {pills.map((p) => (
                <span key={p.key} className="dr-pill">
                  {p.node ?? p.label}
                  <button
                    type="button"
                    className="dr-pill-x"
                    onClick={p.onRemove}
                    aria-label={`${t("filters.remove", "Remove")} ${p.label}`}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </span>
              ))}
              <button type="button" className="dr-pill-clear" onClick={clearAll}>
                {t("filters.clearAll", "Clear all")}
              </button>
            </div>
          )}

          {/* Body */}
          {error ? (
            <EmptyState title={t("results.errorTitle", "Something went wrong")} message={error} />
          ) : loading ? (
            <div className="dr-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card card-flat" style={{ overflow: "hidden" }}>
                  <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 0 }} />
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <span className="skeleton" style={{ height: 14, width: "90%" }} />
                    <span className="skeleton" style={{ height: 14, width: "55%" }} />
                    <span className="skeleton" style={{ height: 30, width: "100%", marginTop: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : displayListings.length === 0 ? (
            <EmptyState
              title={emptyTitle || t("results.emptyTitle", "No results found")}
              message={
                emptyMessage ||
                t(
                  "results.emptyMessage",
                  "Try removing a filter or broadening your search. New sellers join every day."
                )
              }
              actionLabel={t("results.emptyAction", "Post a requirement (RFQ)")}
              actionHref="/rfq"
            />
          ) : view === "map" && showMapToggle ? (
            <MapView listings={displayListings} />
          ) : (
            <>
              <div className="dr-grid">
                {displayListings.map((l) => (
                  <div
                    key={l.id}
                    style={
                      l.type === "service"
                        ? { gridColumn: "1 / -1", minWidth: 0 }
                        : { minWidth: 0 }
                    }
                  >
                    <ListingCard listing={l} />
                  </div>
                ))}
              </div>

              {/* Pagination is server-side; hide it while brand/rating narrow the page client-side. */}
              {!clientFiltered && data && data.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
                  <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div
        className={`dr-overlay${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <div
        className={`dr-drawer${drawerOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("filters.title", "Filters")}
      >
        <div className="dr-drawer-head">
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
            {t("filters.title", "Filters")}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label={t("common.close", "Close")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="dr-drawer-body">{railFilters}</div>
        <div className="dr-drawer-foot">
          <button type="button" className="btn btn-primary btn-block" onClick={() => setDrawerOpen(false)}>
            {t("results.showResults", "Show results")}
            {!loading ? ` (${shownTotal})` : ""}
          </button>
        </div>
      </div>

      <style jsx>{`
        .dr-layout {
          display: grid;
          grid-template-columns: 248px 1fr;
          gap: 32px;
          align-items: start;
        }
        .dr-rail-inner {
          position: sticky;
          top: 88px;
        }
        .dr-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .dr-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .dr-sort {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .dr-sort :global(.select) {
          width: auto;
          min-width: 176px;
        }
        .dr-filter-btn {
          display: none;
        }
        /* Product grid: 3–4 cols desktop · 2 tablet · 1 phone.
           minmax(0,1fr) keeps every card ≤ its column so nothing overflows. */
        .dr-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
        .dr-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 18px;
        }
        .dr-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 6px 6px 12px;
          border-radius: 999px;
          background: var(--brand-tint);
          color: var(--brand-hover);
          border: 1px solid #bfdbfe;
        }
        .dr-pill-x {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: var(--brand-hover);
          cursor: pointer;
          font-size: 10px;
          line-height: 1;
          padding: 0;
        }
        .dr-pill-x:hover {
          background: #dbeafe;
        }
        .dr-pill-clear {
          background: none;
          border: none;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 6px 8px;
        }
        .dr-pill-clear:hover {
          color: var(--ink);
        }

        /* Drawer + overlay (hidden on desktop) */
        .dr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 60;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .dr-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        /* Bottom-sheet drawer (mobile filters) */
        .dr-drawer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 100%;
          max-height: 85vh;
          background: var(--canvas);
          z-index: 61;
          border-radius: 18px 18px 0 0;
          transform: translateY(100%);
          transition: transform 0.28s ease;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-pop);
        }
        .dr-drawer.open {
          transform: translateY(0);
        }
        .dr-drawer-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .dr-drawer-body {
          overflow-y: auto;
          padding: 18px;
          flex: 1;
        }
        .dr-drawer-foot {
          padding: 14px 18px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        @media (max-width: 1024px) {
          .dr-layout {
            grid-template-columns: 1fr;
            gap: 0;
          }
          .dr-rail {
            display: none;
          }
          .dr-filter-btn {
            display: inline-flex;
          }
          .dr-controls {
            width: 100%;
          }
          .dr-sort {
            flex: 1;
            justify-content: flex-end;
          }
          .dr-sort :global(.select) {
            min-width: 0;
          }
        }
        @media (max-width: 760px) {
          .dr-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
        }
        @media (max-width: 480px) {
          .dr-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
