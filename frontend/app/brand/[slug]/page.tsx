"use client";

// Brand landing — a per-brand storefront. Hero band (monogram + name + reach)
// over that brand's product listings, with a native sort <select>. Breadcrumb:
// Home / Brands / <Brand>. Friendly empty state for an unknown brand slug.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBrand } from "@/lib/api";
import type { BrandDetail } from "@/lib/api";
import type { Listing } from "@/lib/types";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import ListingCard from "@/components/ListingCard";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/discovery/EmptyState";
import { Monogram } from "@/components/brand/BrandCard";

type Sort = "newest" | "price_asc" | "price_desc";
type ViewValue = "list" | "grid";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

// Same segmented control as DiscoveryResults' Grid/List toggle (search &
// category pages) — kept as local copies (icons + view toggle) rather than
// importing DiscoveryResults itself, since this page's data source is the
// dedicated /api/brands/:slug endpoint (all of a brand's listings, no
// server-side pagination/filters), not the general getListings() facet API.
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
const VIEW_OPTIONS: { value: ViewValue; label: string; icon: React.ReactNode }[] = [
  { value: "list", label: "List", icon: <ListIcon /> },
  { value: "grid", label: "Grid", icon: <GridIcon /> },
];

// Same evergreen RFQ card as the search page's rail (components/discovery/
// DiscoveryResults.tsx's AsideRfqCard) — a local copy with hardcoded copy
// rather than a shared import, matching this page's existing convention of
// not going through the i18n `t()` layer at all.
function BrandRfqCard() {
  return (
    <Link href="/rfq" className="card card-pad" style={{ display: "block", textDecoration: "none" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--brand)",
        }}
      >
        Can&apos;t find it?
      </div>
      <p style={{ margin: "6px 0 14px", fontSize: 14.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.35 }}>
        Post a requirement and let sellers quote you
      </p>
      <span className="btn btn-primary btn-sm btn-block" style={{ pointerEvents: "none" }}>
        Post a requirement (RFQ)
      </span>
    </Link>
  );
}

function priceOf(l: Listing): number | null {
  const p = l.product?.price;
  return typeof p === "number" ? p : null;
}

const PAGE_SIZE = 12;

function sortListings(listings: Listing[], sort: Sort): Listing[] {
  const out = listings.slice();
  if (sort === "newest") {
    return out.sort(
      (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
    );
  }
  const dir = sort === "price_asc" ? 1 : -1;
  return out.sort((a, b) => {
    const pa = priceOf(a);
    const pb = priceOf(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1; // unknown price sorts last
    if (pb === null) return -1;
    return dir * (pa - pb);
  });
}

function HeroSkeleton() {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, var(--brand-tint), var(--bg-subtle))",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <span className="skeleton" style={{ display: "block", height: 12, width: 220, marginBottom: 18 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="skeleton" style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="skeleton" style={{ display: "block", height: 28, width: 240, marginBottom: 10 }} />
            <span className="skeleton" style={{ display: "block", height: 14, width: 180 }} />
          </span>
        </div>
      </div>
    </section>
  );
}

export default function BrandPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [data, setData] = useState<BrandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewValue>("list");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    setData(null);
    getBrand(slug)
      .then((d) => alive && setData(d))
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const listings = data?.listings || [];

  // Distinct top-level categories this brand spans (path root, else categoryId).
  const categoryCount = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) {
      const key = l.categoryPath?.[0] || l.categoryId;
      if (key) set.add(key);
    }
    return set.size;
  }, [listings]);

  const sorted = useMemo(() => sortListings(listings, sort), [listings, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  );

  // A new brand or sort order starts again from page 1.
  useEffect(() => {
    setPage(1);
  }, [slug, sort]);

  // ---- Unknown brand ----
  if (!loading && (notFound || !data)) {
    return (
      <div className="counter-public-page counter-support-page counter-catalog-detail">
        <section style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
          <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
            <Breadcrumbs
              items={[
                { label: "Directory", href: "/directory" },
                { label: "Brands", href: "/brands" },
                { label: "Not found" },
              ]}
            />
          </div>
        </section>
        <div className="container-bs section-pad">
          <EmptyState
            title="We couldn't find that brand"
            message="This brand may have no active listings, or the link may be out of date. Browse all brands to keep exploring."
            actionLabel="View all brands"
            actionHref="/brands"
          />
        </div>
      </div>
    );
  }

  // ---- Loading ----
  if (loading || !data) {
    return (
      <div className="counter-public-page counter-support-page counter-catalog-detail">
        <HeroSkeleton />
        <div className="container-bs section-pad-sm">
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
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

  const { brand } = data;
  const crumbs: Crumb[] = [
    { label: "Directory", href: "/directory" },
    { label: "Brands", href: "/brands" },
    { label: brand.name },
  ];
  const reach =
    categoryCount > 0
      ? `${brand.count} ${brand.count === 1 ? "product" : "products"} across ${categoryCount} ${
          categoryCount === 1 ? "category" : "categories"
        }`
      : `${brand.count} ${brand.count === 1 ? "product" : "products"}`;

  return (
    <div className="counter-public-page counter-support-page counter-catalog-detail">
      {/* Hero band */}
      <section
        className="counter-catalog-hero"
        style={{
          background: "linear-gradient(180deg, var(--brand-tint), var(--bg-subtle))",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <Breadcrumbs items={crumbs} />
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16, minWidth: 0 }}>
            <Monogram name={brand.name} size={72} />
            <div style={{ minWidth: 0 }}>
              <h1
                className="line-clamp-1"
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                }}
              >
                {brand.name}
              </h1>
              <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 6 }}>{reach}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <div className="container-bs section-pad-sm">
        {sorted.length === 0 ? (
          <EmptyState
            title="No products to show"
            message="This brand has no active listings right now. Browse all brands to keep exploring."
            actionLabel="View all brands"
            actionHref="/brands"
          />
        ) : (
          <>
            {/* Toolbar — mirrors DiscoveryResults' (search/category pages):
                results count · Grid/List segmented toggle · sort. */}
            <div className="brand-toolbar">
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                <strong style={{ color: "var(--brand)", fontWeight: 800 }}>{sorted.length}</strong>{" "}
                {sorted.length === 1 ? "product" : "products"}
              </div>

              <div className="brand-controls">
                <div className="brand-view-toggle">
                  <span
                    className="brand-view-indicator"
                    style={{ transform: `translateX(${view === "grid" ? 100 : 0}%)` }}
                    aria-hidden
                  />
                  {VIEW_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className={view === o.value ? "brand-view-btn active" : "brand-view-btn"}
                      onClick={() => setView(o.value)}
                      aria-pressed={view === o.value}
                    >
                      {o.icon}
                      <span className="brand-view-label">{o.label}</span>
                    </button>
                  ))}
                </div>

                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--faint)" }}>Sort</span>
                  <select
                    className="select"
                    style={{ width: "auto", minWidth: 176 }}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                  >
                    {SORTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Narrow-screen counterpart to .brand-aside's RFQ card, which
                hides below 1024px — see the matching note on DiscoveryResults'
                .dr-rfq-inline for why :global() is required here (a next/link
                never receives styled-jsx's scope class). */}
            <Link href="/rfq" className="brand-rfq-inline">
              <strong className="brand-rfq-inline-text">
                Post a requirement and let sellers quote you
              </strong>
              <span className="btn btn-primary btn-sm" style={{ pointerEvents: "none", flexShrink: 0 }}>
                Post a requirement (RFQ)
              </span>
            </Link>

            <ApiAdvertisingSlot compact placement={["brand_top", "category_top"]} kind="native" context="Sponsored near brand results" summary="One clearly labelled placement, separate from this brand's organic listings and sort order." action="View promoted record" />
            <div className="brand-layout">
              <div className="brand-main">
                {view === "list" ? (
                  <div className="brand-list">
                    {pageItems.map((entry) => <ListingCard key={entry.id} listing={entry} layout="row" />)}
                  </div>
                ) : (
                  <div className="brand-grid">
                    {pageItems.map((entry) => (
                      <div key={entry.id} style={{ minWidth: 0 }}><ListingCard listing={entry} /></div>
                    ))}
                  </div>
                )}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onChange={(next) => {
                        setPage(next);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                )}
              </div>

              <aside className="brand-aside">
                <BrandRfqCard />
              </aside>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .brand-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .brand-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .brand-view-toggle {
          position: relative;
          display: inline-flex;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 3px;
        }
        .brand-view-indicator {
          position: absolute;
          top: 3px;
          bottom: 3px;
          left: 3px;
          width: calc(50% - 3px);
          border-radius: 999px;
          background: var(--brand);
          box-shadow: 0 1px 4px rgba(26, 79, 174, 0.35);
          transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .brand-view-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: none;
          cursor: pointer;
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          border-radius: 999px;
          transition: color 200ms ease;
          white-space: nowrap;
          font-family: inherit;
        }
        .brand-view-btn.active {
          color: #ffffff;
        }
        .brand-layout {
          display: flex;
          align-items: flex-start;
          gap: 24px;
        }
        .brand-main {
          flex: 1;
          min-width: 0;
        }
        .brand-aside {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          top: 124px;
        }
        @media (max-width: 1023px) {
          .brand-aside {
            display: none;
          }
        }
        .brand-ad-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        /* In-feed ads are the mobile/tablet counterpart to the sidebar's ad
           stack, which hides below 1024px — never both at once. */
        .brand-infeed-ad {
          display: none;
        }
        @media (max-width: 1023px) {
          .brand-infeed-ad {
            display: block;
          }
        }
        :global(.brand-rfq-inline) {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 14px 16px;
          margin-bottom: 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--brand-tint);
          text-decoration: none;
        }
        :global(.brand-rfq-inline-text) {
          font-size: 14px;
          color: var(--ink);
          flex: 1;
          min-width: 200px;
        }
        @media (max-width: 1023px) {
          :global(.brand-rfq-inline) {
            display: flex;
          }
        }
        .brand-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
        .brand-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        @media (max-width: 760px) {
          .brand-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }
          .brand-view-label {
            display: none;
          }
        }
        @media (max-width: 480px) {
          .brand-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-view-indicator {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
