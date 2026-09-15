"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Filters, { type FilterOption, type ListingFilterState } from "@/components/Filters";
import Pagination from "@/components/Pagination";
import { getListings, type ListingQuery } from "@/lib/api";
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

function ListingPreview({ listing }: { listing?: Listing }) {
  if (!listing) {
    return <section className="directory-listing-preview is-empty" aria-live="polite"><strong>Select a listing</strong><p>Its scope, terms and company context will appear here.</p></section>;
  }
  const media = listingImage(listing);
  const company = sellerName(listing);
  const verified = listing.isVerifiedSeller || listing.seller?.isVerified;
  return <section className="directory-listing-preview" aria-label={`${listing.title} preview`}>
    <div className="directory-listing-preview-media">
      {media ? <img src={media.url} alt={media.alt || `${listing.title} preview`} /> : <span>{listing.type === "service" ? "Service" : "Product"}</span>}
      <b>{listing.type}</b>
    </div>
    <div className="directory-listing-preview-body">
      <span className="directory-listing-kicker">Selected {listing.type}</span>
      <h2>{listing.title}</h2>
      <div className="directory-listing-company">
        <Avatar src={listing.seller?.logo} name={company} size={40} />
        <span><strong>{company}</strong><small>{verified ? "Identity verified" : "Company record"} · {locationLabel(listing)}</small></span>
      </div>
      <p>{listing.description}</p>
      <dl>
        <div><dt>Price</dt><dd>{priceLabel(listing)}</dd></div>
        <div><dt>Terms</dt><dd>{termsLabel(listing)}</dd></div>
        <div><dt>Delivery</dt><dd>{deliveryLabel(listing)}</dd></div>
        <div><dt>Company rating</dt><dd>{listing.seller?.rating ? `${listing.seller.rating.toFixed(1)} / 5` : "Not rated yet"}</dd></div>
      </dl>
      <Link href={`/listing/${listing.id}`}>Open complete listing <Arrow /></Link>
    </div>
  </section>;
}

export default function UnifiedListingWorkbench({ query, initialFilters }: { query: string; initialFilters: ListingFilterState }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialKey = JSON.stringify(initialFilters);
  const [filters, setFilters] = useState<ListingFilterState>(initialFilters);
  const [sort, setSort] = useState<ListingSort>(initialFilters.sort || "relevance");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didMount = useRef(false);

  useEffect(() => {
    setFilters(initialFilters);
    setSort(initialFilters.sort || "relevance");
    setPage(1);
  }, [initialKey, initialFilters]);

  const serverKey = JSON.stringify({
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
      category: filters.category,
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
        setSelectedId((current) => result.listings.some((listing) => listing.id === current) ? current : result.listings[0]?.id || null);
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
    if (filters.category) next.set("category", filters.category);
    if (filters.city) next.set("city", filters.city);
    if (filters.verified) next.set("verified", "true");
    if (filters.featured) next.set("featured", "true");
    if (filters.priceMax) next.set("maxPrice", String(filters.priceMax));
    if (sort !== "relevance") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [filters, sort, page, pathname, router, searchParams]);

  const listings = data?.listings || [];
  const brands = useMemo(() => brandOptions(listings), [listings]);
  const visibleListings = useMemo(() => listings.filter((listing) => {
    if (filters.brands?.length && !filters.brands.includes(brandOf(listing) || "")) return false;
    if (filters.minRating && (listing.seller?.rating || 0) < filters.minRating) return false;
    return true;
  }), [listings, filters.brands, filters.minRating]);
  const selected = visibleListings.find((listing) => listing.id === selectedId) || visibleListings[0];
  const categories = facetOptions(data?.facets?.categories);
  const cities = facetOptions(data?.facets?.cities);
  const shownTotal = filters.brands?.length || filters.minRating ? visibleListings.length : data?.total || 0;

  function updateFilters(next: ListingFilterState) {
    setFilters(next);
    setPage(1);
  }

  return <div className="directory-listing-workbench">
    <main className="directory-listing-master" aria-label="Service and product results">
      <div className="directory-listing-toolbar">
        <span><strong aria-live="polite">{loading ? "Finding listings…" : `${shownTotal} ${shownTotal === 1 ? "listing" : "listings"}`}</strong><small>Services and products together</small></span>
        <label><span className="sr-only">Sort listings</span><select value={sort} onChange={(event) => { setSort(event.target.value as ListingSort); setPage(1); }}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      {error && <div className="directory-listing-state" role="status"><strong>Listings could not be loaded.</strong><p>{error}</p></div>}
      <div className="directory-listing-ledger">
        {loading && [1, 2, 3, 4].map((item) => <div className="directory-listing-row is-loading" key={item} />)}
        {!loading && !error && visibleListings.map((listing) => {
          const media = listingImage(listing);
          const active = listing.id === selected?.id;
          return <article className="directory-listing-item" key={listing.id}>
            <button type="button" className={`directory-listing-row${active ? " is-selected" : ""}`} onClick={() => setSelectedId(listing.id)} onMouseEnter={() => setSelectedId(listing.id)} aria-pressed={active}>
              <span className="directory-listing-thumb">{media ? <img src={media.url} alt="" /> : listing.type.slice(0, 1).toUpperCase()}</span>
              <span className="directory-listing-row-copy"><small>{listing.type}</small><strong>{listing.title}</strong><span>{sellerName(listing)}</span><b>{priceLabel(listing)}</b></span>
              <Arrow />
            </button>
            {active && <div className="directory-listing-preview-inline"><ListingPreview listing={listing} /></div>}
          </article>;
        })}
      </div>
      {!loading && !error && visibleListings.length === 0 && <div className="directory-listing-state"><strong>No services or products match.</strong><p>Try another need, category, location or price range.</p></div>}
      {data && data.totalPages > 1 && !(filters.brands?.length || filters.minRating) && <div className="directory-listing-pagination"><Pagination page={data.page} totalPages={data.totalPages} onChange={(next) => { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} /></div>}
    </main>

    <div className="directory-listing-detail"><ListingPreview listing={selected} /></div>

    <aside className="directory-listing-filter-rail" aria-label="Filter services and products">
      <div className="directory-listing-filter-intro"><span>Refine</span><h2>Find the right fit</h2><p>Narrow by listing type, category, location, terms and trust.</p></div>
      <Filters value={filters} onChange={updateFilters} categories={categories} cities={cities} brands={brands} />
    </aside>
  </div>;
}
