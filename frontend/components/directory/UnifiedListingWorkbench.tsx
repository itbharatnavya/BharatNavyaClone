"use client";

import { scrollToExpanded } from "@/lib/scrollToExpanded";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Filters, { type FilterOption, type ListingFilterState } from "@/components/Filters";
import Pagination from "@/components/Pagination";
import ListingCard from "@/components/ListingCard";
import { getListings, type ListingQuery } from "@/lib/api";
import { flattenCategories, useCategories } from "@/lib/catalog";
import type { Listing, ListingsResponse } from "@/lib/types";

type ListingSort = NonNullable<ListingFilterState["sort"]>;

const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function Arrow() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function sellerName(listing: Listing) {
  return listing.seller?.companyName || listing.seller?.name || listing.sellerName || "Listed company";
}

function listingImage(listing: Listing) {
  return listing.media?.find((item) => item.type !== "video") || listing.media?.[0];
}

function locationLabel(listing: Listing) {
  if (listing.panIndia || listing.location?.panIndia) return "PAN India";
  return [listing.location?.city, listing.location?.state].filter(Boolean).join(", ") || "Location on request";
}

function formatMoney(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

function priceLabel(listing: Listing) {
  if (listing.type === "product") {
    const price = listing.product?.price ?? listing.product?.priceTiers?.[0]?.price;
    return price != null ? `${formatMoney(price)}${listing.product?.unitOfMeasure ? ` / ${listing.product.unitOfMeasure}` : ""}` : "Ask price";
  }
  const rate = listing.service?.rateCard?.find((item) => item.price > 0);
  if (rate) return `${formatMoney(rate.price)}${rate.unit ? ` / ${rate.unit.replace(/^\s*\/?\s*/, "")}` : ""}`;
  return listing.service?.pricingModel === "quote" ? "Quote based" : "Rate on request";
}

function termsLabel(listing: Listing) {
  if (listing.type === "product") {
    return listing.product?.moq != null
      ? `${listing.product.moq} ${listing.product.unitOfMeasure || "units"} minimum`
      : "Minimum order on request";
  }
  return listing.service?.pricingModel ? `${listing.service.pricingModel} pricing` : "Terms on request";
}

function deliveryLabel(listing: Listing) {
  if (listing.type === "product") return listing.product?.leadTime || listing.product?.availability || "Availability on request";
  return listing.service?.timeline || listing.service?.serviceMode || "Delivery plan on request";
}

function facetOptions(values?: { value: string; label?: string; count?: number }[]): FilterOption[] {
  return (values || []).map((item) => ({ value: item.value, label: item.label || item.value, count: item.count }));
}

function brandOf(listing: Listing) {
  const brand = (listing.product as unknown as { brand?: unknown } | null)?.brand;
  return typeof brand === "string" && brand.trim() ? brand.trim() : undefined;
}

function brandOptions(listings: Listing[]): FilterOption[] {
  const counts = new Map<string, number>();
  listings.forEach((listing) => {
    const brand = brandOf(listing);
    if (brand) counts.set(brand, (counts.get(brand) || 0) + 1);
  });
  return [...counts.entries()].map(([value, count]) => ({ value, label: value, count }));
}

function ListingPreview({ listing, onClose }: { listing?: Listing; onClose?: () => void }) {
  if (!listing) {
    return <section className="directory-listing-preview is-empty" aria-live="polite"><strong>Select a listing</strong><p>Its scope, terms and company context will appear here.</p></section>;
  }
  const media = listingImage(listing);
  const company = sellerName(listing);
  const verified = listing.isVerifiedSeller || listing.seller?.isVerified;
  const rating = listing.seller?.rating;
  const facts: [string, string][] = [
    ["Terms", termsLabel(listing)],
    ["Delivery", deliveryLabel(listing).replace(/_/g, " ")],
    ["Location", locationLabel(listing)],
  ];
  return <section className="directory-listing-preview lp" aria-label={`${listing.title} preview`}>
    <div className="lp-media">
      {media ? <img src={media.url} alt={media.alt || `${listing.title} preview`} loading="lazy" decoding="async" /> : <span>{listing.type === "service" ? "Service" : "Product"}</span>}
      <b className="lp-type">{listing.type === "service" ? "Service" : "Product"}</b>
      {onClose && <button className="lp-close" type="button" onClick={onClose} aria-label="Close selected listing"><svg aria-hidden viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
    </div>
    <div className="lp-body">
      <h2>{listing.title}</h2>
      <p className="lp-price"><strong>{priceLabel(listing)}</strong>{rating ? <span className="lp-rating"><svg aria-hidden viewBox="0 0 24 24"><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" /></svg>{rating.toFixed(1)}</span> : null}</p>
      <div className="lp-company">
        <Avatar src={listing.seller?.logo} name={company} size={40} />
        <span><strong>{company}</strong><small>{verified ? "Identity verified" : "Company record"}</small></span>
      </div>
      {listing.description && <p className="lp-about">{listing.description}</p>}
      <ul className="lp-facts">{facts.map(([label, value]) => <li key={label}><span>{label}</span><strong>{value}</strong></li>)}</ul>
      <Link className="lp-open" href={`/listing/${listing.id}`}>Open complete listing <Arrow /></Link>
    </div>
  </section>;
}

const INFEED_AFTER = 4;

export default function UnifiedListingWorkbench({
  query,
  initialFilters,
  fixedCategory,
  railAd,
  infeedAd,
}: {
  query: string;
  initialFilters: ListingFilterState;
  fixedCategory?: string;
  /** Optional small ad shown under the filter panel (desktop only). */
  railAd?: React.ReactNode;
  /** Optional ad dropped between listings on phones, where a bottom-of-page slot is rarely seen. */
  infeedAd?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialKey = JSON.stringify(initialFilters);
  const [filters, setFilters] = useState<ListingFilterState>(initialFilters);
  const [sort, setSort] = useState<ListingSort>(initialFilters.sort || "relevance");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const didMount = useRef(false);

  const seededKey = useRef(initialKey);
  useEffect(() => {
    // Keyed on the serialized filters only: parents rebuild `initialFilters` as a new
    // object every render, and the URL-sync below re-renders them on each page click,
    // which used to reset `page` to 1 straight after the click. Comparing against the
    // key seen last (a ref, so dev StrictMode's double effect run is harmless) keeps the
    // page read from the URL on first load and resets it only when the filters change.
    setFilters(initialFilters);
    setSort(initialFilters.sort || "relevance");
    if (seededKey.current !== initialKey) {
      seededKey.current = initialKey;
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const serverKey = JSON.stringify({
    fixedCategory,
    type: filters.type,
    category: filters.category,
    city: filters.city,
    verified: filters.verified,
    featured: filters.featured,
    priceMax: filters.priceMax,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const request: ListingQuery = {
      q: query || undefined,
      type: filters.type || undefined,
      category: fixedCategory || filters.category,
      city: filters.city,
      verified: filters.verified,
      featured: filters.featured,
      maxPrice: filters.priceMax,
      sort,
      page,
      limit: 12,
    };
    getListings(request)
      .then((result) => {
        if (!active) return;
        setData(result);
        setSelectedId((current) => current && result.listings.some((listing) => listing.id === current) ? current : null);
      })
      .catch((reason) => {
        if (!active) return;
        setData(null);
        setError(reason instanceof Error ? reason.message : "Listings could not be loaded.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [query, serverKey, sort, page]);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const next = new URLSearchParams(searchParams.toString());
    ["type", "category", "city", "verified", "featured", "maxPrice", "sort", "page"].forEach((key) => next.delete(key));
    if (filters.type) next.set("type", filters.type);
    if (!fixedCategory && filters.category) next.set("category", filters.category);
    if (filters.city) next.set("city", filters.city);
    if (filters.verified) next.set("verified", "true");
    if (filters.featured) next.set("featured", "true");
    if (filters.priceMax) next.set("maxPrice", String(filters.priceMax));
    if (sort !== "relevance") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    const nextQuery = next.toString();
    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentQuery = searchParams.toString();
    const current = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    if (target === current) return;
    router.replace(target, { scroll: false });
    // Route objects are read to build the current URL, but navigation itself must
    // not retrigger this filter-sync effect. Otherwise a same-page replace can
    // race and cancel a genuine suggestion click to a seller or listing route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort, page, fixedCategory]);

  const listings = data?.listings || [];
  const brands = useMemo(() => brandOptions(listings), [listings]);
  const visibleListings = useMemo(() => listings.filter((listing) => {
    if (filters.brands?.length && !filters.brands.includes(brandOf(listing) || "")) return false;
    if (filters.minRating && (listing.seller?.rating || 0) < filters.minRating) return false;
    return true;
  }), [listings, filters.brands, filters.minRating]);
  const selected = visibleListings.find((listing) => listing.id === selectedId);
  const { categories: catalog } = useCategories();
  const categoryNames = useMemo(() => new Map(flattenCategories(catalog).map((category) => [category.slug, category.name])), [catalog]);
  const categories = facetOptions(data?.facets?.categories).map((option) => ({ ...option, label: categoryNames.get(option.value) || option.label }));
  const cities = facetOptions(data?.facets?.cities);
  const shownTotal = filters.brands?.length || filters.minRating ? visibleListings.length : data?.total || 0;

  const activeCount = (filters.type ? 1 : 0) + (filters.verified ? 1 : 0) + (filters.featured ? 1 : 0) + (filters.category && !fixedCategory ? 1 : 0) + (filters.city ? 1 : 0) + (filters.priceMax ? 1 : 0) + (filters.minRating ? 1 : 0) + (filters.brands?.length || 0);

  function updateFilters(next: ListingFilterState) {
    setFilters(next);
    setPage(1);
  }

  return <div className={`directory-listing-workbench${selected ? " has-selection" : ""}`}>
    <section className="directory-listing-master" aria-label="Service and product results">
      <div className="directory-listing-toolbar">
        <span><strong aria-live="polite">{loading ? "Finding listings…" : `${shownTotal} ${shownTotal === 1 ? "listing" : "listings"}`}</strong><small>Services and products together</small></span>
        <div className="dlw-controls">
          <button type="button" className="dlw-filter-toggle" aria-expanded={filtersOpen} aria-controls="directory-listing-filter-content" onClick={() => setFiltersOpen((open) => !open)}>
            <svg aria-hidden viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" /></svg>Filters{activeCount > 0 && <b>{activeCount}</b>}
          </button>
          <div className="dlw-view" role="group" aria-label="Result layout">
            <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => { setView("list"); }}><svg aria-hidden viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg></button>
            <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => { setView("grid"); setSelectedId(null); }}><svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" /></svg></button>
          </div>
          <label><span className="sr-only">Sort listings</span><select value={sort} onChange={(event) => { setSort(event.target.value as ListingSort); setPage(1); }}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </div>
      {error && <div className="directory-listing-state" role="status"><strong>Listings could not be loaded.</strong><p>{error}</p></div>}
      {view === "grid" && !loading && !error && visibleListings.length > 0 && <ul className="dlw-grid" role="list">{visibleListings.flatMap((listing, index) => [
        <li key={listing.id}><ListingCard listing={listing} /></li>,
        ...(infeedAd && index === INFEED_AFTER - 1 ? [<li key="infeed-ad" className="dlw-infeed-ad">{infeedAd}</li>] : []),
      ])}</ul>}
      {view === "grid" && loading && <div className="dlw-grid is-loading" aria-hidden>{[1, 2, 3, 4, 5, 6].map((item) => <span key={item} />)}</div>}
      <div className="directory-listing-ledger" hidden={view === "grid"}>
        {loading && [1, 2, 3, 4].map((item) => <div className="directory-listing-row is-loading" key={item} />)}
        {!loading && !error && visibleListings.map((listing, index) => {
          const media = listingImage(listing);
          const active = listing.id === selected?.id;
          return <React.Fragment key={listing.id}>{infeedAd && index === INFEED_AFTER ? <div className="dlw-infeed-ad">{infeedAd}</div> : null}<article className={`directory-listing-item${active ? " is-expanded" : ""}`}>
            <button type="button" className={`directory-listing-row${active ? " is-selected" : ""}`} onClick={(event) => { setSelectedId(listing.id); scrollToExpanded(event.currentTarget.closest("article")); }} aria-pressed={active}>
              <span className="directory-listing-thumb">{media ? <img src={media.url} alt="" loading="lazy" decoding="async" /> : listing.type.slice(0, 1).toUpperCase()}</span>
              <span className="directory-listing-row-copy"><small>{listing.type}</small><strong>{listing.title}</strong><span>{sellerName(listing)}</span></span>
              <Arrow />
            </button>
            {active && <div className="directory-listing-preview-inline"><ListingPreview listing={listing} onClose={() => setSelectedId(null)} /></div>}
          </article></React.Fragment>;
        })}
      </div>
      {!loading && !error && visibleListings.length === 0 && <div className="directory-listing-state"><strong>No services or products match.</strong><p>Try another need, category, location or price range.</p></div>}
      {data && data.totalPages > 1 && !(filters.brands?.length || filters.minRating) && <div className="directory-listing-pagination"><Pagination page={data.page} totalPages={data.totalPages} onChange={(next) => { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} /></div>}
    </section>

    {selected && <div className="directory-listing-detail"><ListingPreview listing={selected} onClose={() => setSelectedId(null)} /></div>}

    <div className={`directory-listing-filter-rail${filtersOpen ? " is-open" : ""}`}>
      <aside id="directory-listing-filter-content" className="directory-listing-filter-panel" aria-label="Filter services and products">
        <button type="button" className="flt-sheet-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><svg aria-hidden viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <Filters hideCategory={!!fixedCategory} value={filters} onChange={updateFilters} categories={categories} cities={cities} brands={brands} />
      </aside>
      {railAd && <div className="dlw-rail-ad">{railAd}</div>}
    </div>
  </div>;
}
