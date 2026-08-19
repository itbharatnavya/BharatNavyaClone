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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4h8a2 2 0 011.4.6l8.4 8.4a2 2 0 010 2.8z" />
      <circle cx="7" cy="8" r="1.4" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// Inline `style` throughout (not a scoped `<style jsx>` class) — these are
// separate components from GlobalSearchResults, and styled-jsx only scopes
// elements literally written inside the component function that renders the
// `<style jsx>` tag, not elements rendered by a child component defined
// alongside it in the same file. A className here would silently no-op.
function CategoryRow({ slug, name, icon, description, listingCount }: {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  listingCount?: number;
}) {
  return (
    <Link
      href={`/${slug}`}
      className="card"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none" }}
    >
      <span
        aria-hidden
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "var(--brand-tint)",
          color: "var(--brand-hover)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 17,
        }}
      >
        {icon ? <span>{icon}</span> : <TagIcon />}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{name}</span>
        {description && (
          <span className="line-clamp-1" style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {description}
          </span>
        )}
      </span>
      {typeof listingCount === "number" && listingCount > 0 && (
        <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0, whiteSpace: "nowrap" }}>
          {listingCount} listings
        </span>
      )}
      <span style={{ color: "var(--faint)", display: "inline-flex", flexShrink: 0 }} aria-hidden>
        <ChevronRightIcon />
      </span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--faint)",
        marginBottom: 12,
      }}
    >
      {children}
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
          <SectionLabel>{t("search.categories", "Categories")}</SectionLabel>
          {catLoading ? (
            <div className="gsr-cat-list">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}
                >
                  <span className="skeleton" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    <span className="skeleton" style={{ display: "block", height: 13, width: "40%" }} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="gsr-cat-list">
              {matchedCategories.map((c) => (
                <CategoryRow
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  icon={c.icon}
                  description={c.description}
                  listingCount={c.listingCount}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showCompanies && (
        <section>
          <SectionLabel>{t("search.companies", "Companies")}</SectionLabel>
          {sellersLoading ? (
            <div className="gsr-company-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card card-flat card-pad">
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span className="skeleton" style={{ width: 52, height: 52, borderRadius: "50%" }} />
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
          <SectionLabel>{t("search.productsServices", "Products & services")}</SectionLabel>
          {listingsLoading ? (
            <div className="gsr-list">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card" style={{ display: "flex", gap: 16, padding: 16 }}>
                  <div className="skeleton" style={{ width: 148, height: 148, borderRadius: 10, flexShrink: 0 }} />
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
        .gsr-cat-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
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
