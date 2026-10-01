"use client";

// The shared faceted-results engine used by the category, city, and search
// pages: top filter-pill bar (Type/Category/City/Price pills + Verified toggle
// + a "More filters" drawer for Brand/Rating/Subcategories) · sort dropdown
// (incl. "Nearest"/distance) · Grid/List view toggle (List is the default —
// one-by-one rows, closer to a familiar B2B marketplace listing page than a
// product grid) · pagination · results count + facets · graceful
// empty/loading/error states.
//
// It also *seeds + displays* filters handed in from the AI hero search:
//   - `initialFilters` / `query` seed the removable filter state on mount
//   - the pill bar + drawer render those as active (Type pill, City pill, price tier)
//   - a row of removable "active filter" pills is shown above the results
//   - when `syncUrl` is set, filter changes are reflected back into the URL

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as api from "@/lib/api";
import type { ListingQuery } from "@/lib/api";
import type { Listing, ListingsResponse, ListingType } from "@/lib/types";
import Filters, { ListingFilterState, FilterOption, SubcategoryItem } from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/Pagination";
import EmptyState from "./EmptyState";
import { useTr } from "./hooks";

export type SortValue =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "distance";

type ViewValue = "list" | "grid";

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
  featured?: boolean;
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
  /** Show the category facet in the top filter bar (search page). */
  enableCategoryFilter?: boolean;
  /** Hide the type selector when the parent surface fixes one listing type. */
  showTypeFilter?: boolean;
  /** Child categories to show as a drill-down section in the "More filters" drawer. */
  subcategories?: SubcategoryItem[];
  /** Show a sticky right-hand "post a requirement" rail alongside the results,
   *  desktop-only. Sponsored inventory belongs in the page's single dedicated
   *  placement, outside this reusable results engine. Off by default — opt in per
   *  page (currently just /search) rather than changing every DiscoveryResults
   *  consumer at once. */
  adRail?: boolean;
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

// Human labels for the price-tier ceilings used by the filter pill + rail.
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
function VerifiedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function FeaturedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}
// Right-hand rail card shown alongside results (adRail=true, desktop only).
// Evergreen — doesn't depend on any sponsored ad existing — so the rail is
// never an empty box while ad inventory is still being sold.
function AsideRfqCard({ t }: { t: (key: string, fallback: string) => string }) {
  return (
    <Link href="/rfq" className="card card-pad" style={{ display: "block", textDecoration: "none" }}>
      <div
        style={{
          fontSize: "var(--fs-xs)",
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--brand)",
        }}
      >
        {t("results.asideEyebrow", "Can't find it?")}
      </div>
      <p style={{ margin: "6px 0 14px", fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)", lineHeight: 1.35 }}>
        {t("results.asideTitle", "Post a requirement and let sellers quote you")}
      </p>
      <span className="btn btn-primary btn-sm btn-block" style={{ pointerEvents: "none" }}>
        {t("results.emptyAction", "Post a requirement (RFQ)")}
      </span>
    </Link>
  );
}

export default function DiscoveryResults({
  baseQuery,
  initialFilters,
  query,
  syncUrl = false,
  near,
  enableCategoryFilter = false,
  showTypeFilter = true,
  subcategories = [],
  adRail = false,
  defaultSort = "relevance",
  limit = 12,
  emptyTitle,
  emptyMessage,
}: DiscoveryResultsProps) {
  const t = useTr();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ListingFilterState>(initialFilters || {});
  const [q, setQ] = useState<string>(query || "");
  // `query` only seeds `q` on first mount by default — but a new search bar
  // submission now does an in-place `router.push` to this same route with a
  // different `?q=`, which Next doesn't remount for. Re-sync whenever the
  // prop actually changes so "search again from this page" refetches.
  useEffect(() => {
    setQ(query || "");
  }, [query]);
  const [sort, setSort] = useState<SortValue>(defaultSort);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewValue>("list");
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
    featured: filters.featured,
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
      featured: filters.featured || baseQuery.featured || undefined,
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
    // Start from whatever's already in the URL (e.g. /search page's own
    // ?scope=/?page=, unrelated to this component) so this only ever
    // overwrites the keys it actually manages, rather than wiping every
    // other param the caller (or this same page) put there.
    const usp = new URLSearchParams(searchParams.toString());
    ["q", "type", "city", "maxPrice", "verified", "featured", "category", "sort"].forEach((k) => usp.delete(k));
    if (q) usp.set("q", q);
    if (filters.type) usp.set("type", filters.type);
    if (filters.city) usp.set("city", filters.city);
    if (filters.priceMax) usp.set("maxPrice", String(filters.priceMax));
    if (filters.verified) usp.set("verified", "true");
    if (filters.featured) usp.set("featured", "true");
    if (enableCategoryFilter && filters.category) usp.set("category", filters.category);
    if (sort && sort !== defaultSort) usp.set("sort", sort);
    const qs = usp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, serverFiltersKey, sort]);

  // ---- lock body scroll while the filter drawer is open ----
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
      // Rating is the seller's real aggregate, not a per-listing number.
      out = out.filter((l) => (l.seller?.rating || 0) >= (filters.minRating as number));
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
  if (filters.featured)
    pills.push({
      key: "featured",
      label: t("filters.featuredOnly", "Featured listings only"),
      onRemove: () => onFiltersChange({ ...filters, featured: undefined }),
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
    filters.featured,
    filters.minRating,
    enableCategoryFilter ? filters.category : undefined,
  ].filter(Boolean).length + selectedBrands.length;

  const drawerFilters = (
    <Filters
      value={filters}
      onChange={onFiltersChange}
      categories={categoryOptions}
      cities={cityOptions}
      brands={brandOptions}
      subcategories={subcategories}
      hideType
      hideCategory
      hideCity
      hidePrice
      hideVerified
      hideFeatured
    />
  );

  const viewOptions: { value: ViewValue; label: string; icon: React.ReactNode }[] = [
    { value: "list", label: t("view.list", "List"), icon: <ListIcon /> },
    { value: "grid", label: t("view.grid", "Grid"), icon: <GridIcon /> },
  ];
  const activeViewIndex = Math.max(0, viewOptions.findIndex((o) => o.value === view));

  return (
    <>
      {/* Top filter bar — pill selects for the common facets + a "More filters"
          drawer trigger for everything else (Brand/Rating/Subcategories). */}
      <div className="dr-pillbar">
        <div className="dr-pillbar-scroll no-scrollbar">
          {showTypeFilter && <select
            className={filters.type ? "select dr-pill-select dr-pill-active" : "select dr-pill-select"}
            value={filters.type || ""}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as ListingType | "" })}
            aria-label={t("filters.type", "Type")}
          >
            <option value="">{t("filters.allTypes", "All types")}</option>
            <option value="product">{t("common.products", "Products")}</option>
            <option value="service">{t("common.services", "Services")}</option>
          </select>}

          {enableCategoryFilter && categoryOptions.length > 0 && (
            <select
              className={filters.category ? "select dr-pill-select dr-pill-active" : "select dr-pill-select"}
              value={filters.category || ""}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || undefined })}
              aria-label={t("filters.category", "Category")}
            >
              <option value="">{t("filters.allCategories", "All categories")}</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                  {typeof c.count === "number" ? ` (${c.count})` : ""}
                </option>
              ))}
            </select>
          )}

          {cityOptions.length > 0 && (
            <select
              className={filters.city ? "select dr-pill-select dr-pill-active" : "select dr-pill-select"}
              value={filters.city || ""}
              onChange={(e) => onFiltersChange({ ...filters, city: e.target.value || undefined })}
              aria-label={t("filters.city", "City")}
            >
              <option value="">{t("filters.allCities", "All cities")}</option>
              {cityOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                  {typeof c.count === "number" ? ` (${c.count})` : ""}
                </option>
              ))}
            </select>
          )}

          <select
            className={filters.priceMax ? "select dr-pill-select dr-pill-active" : "select dr-pill-select"}
            value={filters.priceMax ? String(filters.priceMax) : ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, priceMax: e.target.value ? Number(e.target.value) : undefined })
            }
            aria-label={t("filters.price", "Price")}
          >
            <option value="">{t("filters.anyPrice", "Any price")}</option>
            {Object.entries(PRICE_TIER_DISPLAY).map(([v, label]) => (
              <option key={v} value={v}>
                {t("filters.under", "Under")} {label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={filters.verified ? "chip chip-active dr-pill-chip" : "chip dr-pill-chip"}
            aria-pressed={!!filters.verified}
            onClick={() => onFiltersChange({ ...filters, verified: filters.verified ? undefined : true })}
          >
            <VerifiedIcon />
            {t("filters.verifiedOnly", "Verified sellers only")}
          </button>

          <button
            type="button"
            className={filters.featured ? "chip chip-active dr-pill-chip" : "chip dr-pill-chip"}
            aria-pressed={!!filters.featured}
            onClick={() => onFiltersChange({ ...filters, featured: filters.featured ? undefined : true })}
          >
            <FeaturedIcon />
            {t("filters.featuredOnly", "Featured listings only")}
          </button>

          <button
            type="button"
            className="chip dr-pill-chip"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
          >
            <FilterIcon />
            {t("filters.more", "More filters")}
            {filterCount > 0 ? ` (${filterCount})` : ""}
          </button>
        </div>
      </div>

      <div className={adRail ? "dr-layout" : undefined}>
      <div className={adRail ? "dr-main" : undefined}>
        {/* Toolbar */}
        <div className="dr-toolbar">
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--muted)" }}>
            {loading ? (
              <span className="skeleton" style={{ display: "inline-block", width: 90, height: 14 }} />
            ) : (
              <>
                <strong style={{ color: "var(--brand)", fontWeight: 800 }}>{shownTotal}</strong>{" "}
                {shownTotal === 1 ? t("results.one", "result") : t("results.many", "results")}
              </>
            )}
          </div>

          <div className="dr-controls">
            <div className="dr-view-toggle" style={{ ["--seg-count" as string]: viewOptions.length } as React.CSSProperties}>
              <span
                className="dr-view-indicator"
                style={{ transform: `translateX(${activeViewIndex * 100}%)` }}
                aria-hidden
              />
              {viewOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={view === o.value ? "dr-view-btn active" : "dr-view-btn"}
                  onClick={() => setView(o.value)}
                  aria-pressed={view === o.value}
                >
                  {o.icon}
                  <span className="dr-view-label">{o.label}</span>
                </button>
              ))}
            </div>

            <label className="dr-sort">
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>{t("sort.label", "Sort")}</span>
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
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", marginBottom: 12 }}>
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

        {/* Narrow-screen counterpart to the .dr-aside RFQ card, which hides
            below 1024px — keeps a "post a requirement" option available in
            both List and Grid on every screen size, not just desktop. */}
        {adRail && (
          <Link href="/rfq" className="dr-rfq-inline">
            <strong className="dr-rfq-inline-text">
              {t("results.asideTitle", "Post a requirement and let sellers quote you")}
            </strong>
            <span className="btn btn-primary btn-sm" style={{ pointerEvents: "none", flexShrink: 0 }}>
              {t("results.emptyAction", "Post a requirement (RFQ)")}
            </span>
          </Link>
        )}

        {/* Body */}
        {error ? (
          <EmptyState title={t("results.errorTitle", "Something went wrong")} message={error} />
        ) : loading ? (
          view === "list" ? (
            <div className="dr-list">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card" style={{ display: "flex", gap: 16, padding: 16 }}>
                  <div className="skeleton" style={{ width: 148, height: 148, borderRadius: "var(--r-sm)", flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
                    <span className="skeleton" style={{ height: 16, width: "70%" }} />
                    <span className="skeleton" style={{ height: 13, width: "45%" }} />
                    <span className="skeleton" style={{ height: 13, width: "90%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )
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
            actionHref={`/rfq${q ? `?need=${encodeURIComponent(q)}` : ""}`}
          />
        ) : view === "list" ? (
          <>
            <div className="dr-list">
              {displayListings.map((entry, i) => (
                <div key={entry.id} className="dr-enter" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <ListingCard listing={entry} layout="row" />
                </div>
              ))}
            </div>
            {!clientFiltered && data && data.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
                <Pagination page={data.page} totalPages={data.totalPages} onChange={onPageChange} />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="dr-grid">
              {displayListings.map((entry, i) => (
                <div
                  key={entry.id}
                  className="dr-enter"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, minWidth: 0 }}
                >
                  <ListingCard listing={entry} />
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

      {adRail && (
        <aside className="dr-aside">
          <AsideRfqCard t={t} />
        </aside>
      )}
      </div>

      {/* "More filters" drawer — bottom sheet on phones, right-side slide-in panel
          from tablet width up. Holds Brand / Rating / Subcategories (everything
          not already surfaced as a top pill). */}
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
          <span style={{ fontSize: "var(--fs-md)", fontWeight: 700, color: "var(--ink)" }}>
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
        <div className="dr-drawer-body">{drawerFilters}</div>
        <div className="dr-drawer-foot">
          <button type="button" className="btn btn-primary btn-block" onClick={() => setDrawerOpen(false)}>
            {t("results.showResults", "Show results")}
            {!loading ? ` (${shownTotal})` : ""}
          </button>
        </div>
      </div>

      <style jsx>{`
        /* Top filter-pill bar: a soft blue/orange gradient "shelf" (echoing the
           homepage's restrained dual-tone wash) rather than a flat white strip —
           the pills themselves pop blue when active, so the bar visually answers
           "more than just white and orange." */
        .dr-pillbar {
          position: relative;
          border-radius: var(--r-md);
          border: 1px solid var(--border);
          background: radial-gradient(120% 180% at 0% 0%, rgba(26, 79, 174, 0.07), transparent 55%),
            radial-gradient(120% 180% at 100% 100%, rgba(245, 130, 31, 0.08), transparent 55%),
            var(--canvas);
          padding: 12px 14px;
          margin-bottom: 16px;
        }
        .dr-pillbar-scroll {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 2px;
        }
        .dr-pillbar-scroll :global(.dr-pill-select) {
          width: auto;
          min-width: 124px;
          flex-shrink: 0;
          border-radius: var(--r-pill);
          padding: 8px 34px 8px 14px;
          font-size: var(--fs-xs);
          font-weight: 500;
        }
        .dr-pillbar-scroll :global(.dr-pill-active) {
          background-color: var(--brand-tint);
          border-color: var(--brand);
          color: var(--brand-hover);
          font-weight: 600;
        }
        .dr-pillbar-scroll :global(.dr-pill-chip) {
          flex-shrink: 0;
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
          gap: 12px;
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

        /* Segmented Grid/List toggle — a sliding brand-blue indicator behind
           the active label, the one deliberately "alive" control on the toolbar. */
        .dr-view-toggle {
          position: relative;
          display: inline-flex;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: var(--r-pill);
          padding: 3px;
        }
        .dr-view-indicator {
          position: absolute;
          top: 3px;
          bottom: 3px;
          left: 3px;
          width: calc(100% / var(--seg-count, 2) - 3px);
          border-radius: var(--r-pill);
          background: var(--brand);
          box-shadow: 0 1px 4px rgba(26, 79, 174, 0.35);
          transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dr-view-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: none;
          cursor: pointer;
          padding: 7px 14px;
          font-size: var(--fs-xs);
          font-weight: 600;
          color: var(--muted);
          border-radius: var(--r-pill);
          transition: color 200ms ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .dr-view-btn.active {
          color: #ffffff;
        }

        /* adRail layout: results column + a sticky sponsored/RFQ rail — desktop
           only, the rail hides below 1024px rather than pushing below the list
           (it's supplementary, never blocks the results). */
        .dr-layout {
          display: flex;
          align-items: flex-start;
          gap: 24px;
        }
        .dr-main {
          flex: 1;
          min-width: 0;
        }
        .dr-aside {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          /* Navbar (0-64) + the sticky category strip below it (64-108) —
             108px plus a visible 16px gap, so the card doesn't tuck up flush
             against the nav strip when scrolled. */
          top: 124px;
        }
        @media (max-width: 1023px) {
          .dr-aside {
            display: none;
          }
        }
        .dr-ad-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        /* In-feed ads are the mobile/tablet counterpart to the sidebar's ad
           stack, which hides below 1024px — never both at once. */
        .dr-infeed-ad {
          display: none;
        }
        @media (max-width: 1023px) {
          .dr-infeed-ad {
            display: block;
          }
        }
        /* :global() — the Link this targets never receives styled-jsx's
           auto-injected scope class (styled-jsx only scopes intrinsic/lowercase
           JSX elements, not custom components like next/link's Link), so a
           scoped selector here would silently never match. */
        :global(.dr-rfq-inline) {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 14px 16px;
          margin-bottom: 16px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border);
          background: var(--brand-tint);
          text-decoration: none;
        }
        :global(.dr-rfq-inline-text) {
          font-size: var(--fs-sm);
          color: var(--ink);
          flex: 1;
          min-width: 200px;
        }
        @media (max-width: 1023px) {
          :global(.dr-rfq-inline) {
            display: flex;
          }
        }

        /* Product grid: 3–4 cols desktop · 2 tablet · 1 phone.
           minmax(0,1fr) keeps every card ≤ its column so nothing overflows. */
        .dr-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
        /* One-by-one list view — the default. */
        .dr-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        /* Result entrance — mount-triggered (not scroll-gated like Reveal, which
           would leave below-the-fold rows invisible until scrolled to on a dense
           results list). Fires once per render, small capped stagger. */
        .dr-enter {
          animation: drEnter 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes drEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dr-enter {
            animation: none;
          }
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
          font-size: var(--fs-xs);
          font-weight: 500;
          padding: 6px 6px 6px 12px;
          border-radius: var(--r-pill);
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
          border-radius: var(--r-pill);
          border: none;
          background: transparent;
          color: var(--brand-hover);
          cursor: pointer;
          font-size: var(--fs-xs);
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
          font-size: var(--fs-xs);
          font-weight: 500;
          cursor: pointer;
          padding: 6px 8px;
        }
        .dr-pill-clear:hover {
          color: var(--ink);
        }

        /* Drawer + overlay — above FloatingRfqButton/ChatAssistant (z-119/120):
           an open filter drawer is a modal and should sit on top of both
           floating widgets, not be covered by them. */
        .dr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 130;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .dr-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        /* Bottom-sheet drawer on phones */
        .dr-drawer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 100%;
          max-height: 85vh;
          background: var(--canvas);
          z-index: 131;
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
        /* Right-side slide-in panel from tablet width up. */
        @media (min-width: 640px) {
          .dr-drawer {
            left: auto;
            right: 0;
            top: 0;
            bottom: 0;
            width: 400px;
            max-width: 400px;
            max-height: 100vh;
            border-radius: 0;
            transform: translateX(100%);
            transition: transform 0.28s ease;
          }
          .dr-drawer.open {
            transform: translateX(0);
          }
        }

        @media (max-width: 760px) {
          .dr-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
          .dr-view-label {
            display: none;
          }
        }
        @media (max-width: 480px) {
          .dr-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dr-view-indicator {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}
