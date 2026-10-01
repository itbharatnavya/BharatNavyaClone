"use client";

// Directory products: category tabs over a dense grid of compact cards (featured
// products first, then newest) and a final tile that opens the full search for the
// chosen category. Tabs come from the
// busiest product categories; each tab's results are fetched once and cached.
// Styles: .ps-products* in app/counter-soft-system.css.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { getListings } from "@/lib/api";
import { useCategoryTree } from "@/lib/catalog";
import type { Listing } from "@/lib/types";

const LIMIT = 14;
const TABS = 6;
interface Result { listings: Listing[]; total: number }

const shortName = (name: string) => name.split(/[,&]/)[0].trim();

export default function ProductShowcase() {
  const { tree } = useCategoryTree();
  const tabs = useMemo(() => [...tree]
    .filter((category) => category.type !== "service" && (category.listingCount || 0) > 0)
    .sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0))
    .slice(0, TABS)
    .map((category) => ({ slug: category.slug, label: shortName(category.name), count: category.listingCount || 0 })), [tree]);

  const [active, setActive] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const cache = useRef(new Map<string, Result>());

  useEffect(() => {
    let live = true;
    const hit = cache.current.get(active);
    if (hit) { setResult(hit); setBusy(false); setFailed(false); return; }
    setBusy(true);
    getListings({ type: "product", sort: "newest", limit: LIMIT, ...(active ? { category: active } : {}) })
      .then((response) => {
        if (!live) return;
        const listings = (response.listings || []).filter((listing) => listing.type === "product");
        // Lead with a featured product when there is one.
        const lead = listings.findIndex((listing) => listing.isFeatured || listing.isSponsored);
        if (lead > 0) listings.unshift(...listings.splice(lead, 1));
        const next = { listings, total: response.total ?? listings.length };
        cache.current.set(active, next);
        setResult(next); setFailed(false);
      })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [active]);

  const label = tabs.find((tab) => tab.slug === active)?.label || "all categories";
  const href = `/search?type=product${active ? `&category=${encodeURIComponent(active)}` : ""}`;
  const listings = result?.listings || [];

  return <div className="ps-products">
    <div className="ps-products-bar">
      <div className="ps-tabs" role="tablist" aria-label="Product categories">
        <button type="button" role="tab" aria-selected={active === ""} onClick={() => setActive("")}>All products</button>
        {tabs.map((tab) => <button key={tab.slug} type="button" role="tab" aria-selected={active === tab.slug} onClick={() => setActive(tab.slug)}>{tab.label}<small>{tab.count}</small></button>)}
      </div>
      {result && <p className="ps-products-count" aria-live="polite">Showing {listings.length} of {result.total.toLocaleString("en-IN")}</p>}
    </div>

    {failed && !result
      ? <div className="le-empty">Product listings are temporarily unavailable. Company and service discovery remains ready.</div>
      : !result
        ? <div className="bn-product-grid ps-product-grid is-loading" aria-label="Loading product listings">{Array.from({ length: 8 }).map((_, index) => <span key={index} />)}</div>
        : listings.length === 0
          ? <div className="le-empty">No products in this category yet. <button type="button" className="hs-link" onClick={() => setActive("")}>Show all products</button></div>
          : <ul key={active} className={`bn-product-grid ps-product-grid${busy ? " is-busy" : ""}`} role="list">
            {listings.map((listing, index) => <li key={listing.id} style={{ ["--i" as string]: index }}><ListingCard listing={listing} /></li>)}
            {result.total > listings.length && <li className="ps-more" style={{ ["--i" as string]: listings.length }}>
              <Link href={href}>
                <small>More in {label}</small>
                <strong>{(result.total - listings.length).toLocaleString("en-IN")}+</strong>
                <span>Browse all products<svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
              </Link>
            </li>}
          </ul>}
  </div>;
}
