"use client";

// Brand landing — a per-brand storefront. Hero band (monogram + name + reach)
// over that brand's product listings, with a native sort <select>. Breadcrumb:
// Home / Brands / <Brand>. Friendly empty state for an unknown brand slug.

import React, { useEffect, useMemo, useState } from "react";
import { getBrand } from "@/lib/api";
import type { BrandDetail } from "@/lib/api";
import type { Listing } from "@/lib/types";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import ListingCard from "@/components/ListingCard";
import EmptyState from "@/components/discovery/EmptyState";
import { Monogram } from "@/components/brand/BrandCard";

type Sort = "newest" | "price_asc" | "price_desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function priceOf(l: Listing): number | null {
  const p = l.product?.price;
  return typeof p === "number" ? p : null;
}

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

  // ---- Unknown brand ----
  if (!loading && (notFound || !data)) {
    return (
      <div>
        <section style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
          <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
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
      <div>
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
    { label: "Home", href: "/" },
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
    <div>
      {/* Hero band */}
      <section
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
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{sorted.length}</strong>{" "}
                {sorted.length === 1 ? "product" : "products"}
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

            {/* Grid */}
            <div
              style={{
                display: "grid",
                gap: 20,
                gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              }}
            >
              {sorted.map((l) => (
                <div
                  key={l.id}
                  style={l.type === "service" ? { gridColumn: "1 / -1", minWidth: 0 } : { minWidth: 0 }}
                >
                  <ListingCard listing={l} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
