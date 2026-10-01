"use client";

// GlobalSearchResults — /search's view for a genuine free-text search (the
// user typed something and hit Enter/the search icon, as opposed to picking a
// suggestion from the dropdown, which navigates straight to that specific
// category/listing and never lands here). Shows Category + Company + Product
// & Service matches together as ONE scrollable list with small inline section
// labels, not separate tabs/pages — each section resolves and hides itself
// independently; only the final "nothing anywhere matched" empty state waits
// on all three. Every other /search scenario (browsing, filtering, no typed
// query) renders the existing DiscoveryResults product/service list instead —
// see app/search/page.tsx, which is where this is switched in.
//
// All three data sources already existed before this component did:
// categories come from the shared CatalogProvider (no new fetch), companies
// from `searchSellers()` (GET /api/sellers?q=, live but previously
// disconnected from /search), products/services from the same `getListings()`
// DiscoveryResults already uses. Nothing here is a new backend endpoint.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as api from "@/lib/api";
import type { Listing } from "@/lib/types";
import { useCategories, flattenCategories } from "@/lib/catalog";
import SellerCard, { SellerCardSeller } from "@/components/SellerCard";
import { mapSeller } from "@/components/home/FeaturedSellers";
import ListingCard from "@/components/ListingCard";
import EmptyState from "./EmptyState";
import { useTr } from "./hooks";

export interface GlobalSearchResultsProps {
  query: string;
}

const CATEGORY_LIMIT = 5;
const COMPANY_LIMIT = 5;
const LISTING_LIMIT = 8;

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4h8a2 2 0 011.4.6l8.4 8.4a2 2 0 010 2.8z" />
      <circle cx="7" cy="8" r="1.4" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 21v-4h6v4M8.5 7.5h.01M8.5 11h.01M8.5 14.5h.01M15.5 7.5h.01M15.5 11h.01" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7.5L12 3 3 7.5l9 4.5 9-4.5z" />
      <path d="M3 7.5v9l9 4.5 9-4.5v-9M12 12v9" />
    </svg>
  );
}

// Inline `style` throughout (not a scoped `<style jsx>` class) — these are
// separate components from GlobalSearchResults, and styled-jsx only scopes
// elements literally written inside the component function that renders the
// `<style jsx>` tag, not elements rendered by a child component defined
// alongside it in the same file. A className here would silently no-op.
//
// Compact grid tile (not a full-width row) — with the 5-item CATEGORY_LIMIT
// this fits in one or two rows instead of stacking 5 full-width bars down
// the page, which is what made the section feel like it "took the whole
// screen." No description here — a quick-scan tile doesn't need it.
function CategoryTile({ slug, name, icon, listingCount }: {
  slug: string;
  name: string;
  icon?: string;
  listingCount?: number;
}) {
  return (
    <Link
      href={`/${slug}`}
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        padding: "12px 14px",
        textDecoration: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--r-xs)",
          background: "var(--brand-tint)",
          color: "var(--brand-hover)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "var(--fs-sm)",
        }}
      >
        {icon ? <span>{icon}</span> : <TagIcon />}
      </span>
      <span className="line-clamp-1" style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--ink)" }}>
        {name}
      </span>
      {typeof listingCount === "number" && listingCount > 0 && (
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--faint)" }}>{listingCount} listings</span>
      )}
    </Link>
  );
}

// A highlighted section header — icon chip + bold label + result count,
// separated by a rule — instead of a small faint uppercase caption, so the
// three groups (Categories / Companies / Products & services) actually read
// as distinct sections while scanning the page.
function SectionLabel({
  icon,
  count,
  children,
}: {
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: "var(--r-xs)",
          background: "var(--brand-tint)",
          color: "var(--brand-hover)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>
        {children}
      </span>
      {typeof count === "number" && (
        <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--faint)" }}>{count}</span>
      )}
    </div>
  );
}

export default function GlobalSearchResults({ query }: GlobalSearchResultsProps) {
  const t = useTr();
  const { categories, loading: catLoading } = useCategories();

  const [sellers, setSellers] = useState<SellerCardSeller[]>([]);
  const [sellersLoading, setSellersLoading] = useState(true);

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setSellersLoading(true);
    api
      .searchSellers({ q: query, limit: COMPANY_LIMIT })
      .then((r) => {
        if (!alive) return;
        setSellers((r.sellers || []).map(mapSeller).filter((s): s is SellerCardSeller => !!s));
      })
      .catch(() => alive && setSellers([]))
      .finally(() => alive && setSellersLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  useEffect(() => {
    let alive = true;
    setListingsLoading(true);
    api
      .getListings({ q: query, limit: LISTING_LIMIT })
      .then((r) => {
        if (!alive) return;
        setListings(r.listings || []);
        setListingsTotal(r.total || 0);
      })
      .catch(() => {
        if (!alive) return;
        setListings([]);
        setListingsTotal(0);
      })
      .finally(() => alive && setListingsLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  const qLower = query.trim().toLowerCase();
  const matchedCategories = useMemo(() => {
    if (!qLower) return [];
    return flattenCategories(categories)
      .filter((c) => c.name.toLowerCase().includes(qLower))
      .slice(0, CATEGORY_LIMIT);
  }, [categories, qLower]);

  const showCategories = catLoading || matchedCategories.length > 0;
  const showCompanies = sellersLoading || sellers.length > 0;
  const showListings = listingsLoading || listings.length > 0;

  const allResolved = !catLoading && !sellersLoading && !listingsLoading;
  const allEmpty =
    allResolved && matchedCategories.length === 0 && sellers.length === 0 && listings.length === 0;

  if (allEmpty) {
    return (
      <EmptyState
        title={t("search.empty.title", "No matches found")}
        message={t(
          "search.empty.message",
          "Try different keywords, or post a requirement and let sellers come to you."
        )}
        actionLabel={t("results.emptyAction", "Post a requirement (RFQ)")}
        actionHref={`/rfq?need=${encodeURIComponent(query)}`}
      />
    );
  }

  return (
    <div className="gsr-sections">
      {showCategories && (
        <section>
          <SectionLabel icon={<TagIcon />} count={catLoading ? undefined : matchedCategories.length}>
            {t("search.categories", "Categories")}
          </SectionLabel>
          {catLoading ? (
            <div className="gsr-cat-grid">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: "12px 14px" }}>
                  <span className="skeleton" style={{ display: "block", width: 32, height: 32, borderRadius: "var(--r-xs)" }} />
                  <span className="skeleton" style={{ display: "block", height: 12, width: "70%", marginTop: 10 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="gsr-cat-grid">
              {matchedCategories.map((c) => (
                <CategoryTile
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  icon={c.icon}
                  listingCount={c.listingCount}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showCompanies && (
        <section>
          <SectionLabel icon={<BuildingIcon />} count={sellersLoading ? undefined : sellers.length}>
            {t("search.companies", "Companies")}
          </SectionLabel>
          {sellersLoading ? (
            <div className="gsr-company-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card card-flat" style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <span className="skeleton" style={{ height: 14, width: "70%" }} />
                      <span className="skeleton" style={{ height: 12, width: "45%" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gsr-company-grid">
              {sellers.map((s) => (
                <SellerCard key={s.slug} seller={s} />
              ))}
            </div>
          )}
        </section>
      )}

      {showListings && (
        <section>
          <SectionLabel icon={<BoxIcon />} count={listingsLoading ? undefined : listingsTotal}>
            {t("search.productsServices", "Products & services")}
          </SectionLabel>
          {listingsLoading ? (
            <div className="gsr-list">
              {Array.from({ length: 3 }).map((_, i) => (
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
            <>
              <div className="gsr-list">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} layout="row" />
                ))}
              </div>
              {listingsTotal > listings.length && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&view=all`}
                    className="btn btn-secondary btn-sm"
                  >
                    {t("search.viewAll", "View all")} {listingsTotal} {t("common.results", "results")} →
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <style jsx>{`
        .gsr-sections {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .gsr-cat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        @media (min-width: 480px) {
          .gsr-cat-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (min-width: 900px) {
          .gsr-cat-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
        .gsr-company-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 20px;
        }
        @media (min-width: 640px) {
          .gsr-company-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1024px) {
          .gsr-company-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        .gsr-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
      `}</style>
    </div>
  );
}
