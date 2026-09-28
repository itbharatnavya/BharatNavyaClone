"use client";

// Brands directory — the "shop by brand" destination. A category <select> filter
// (top-level stores) re-fetches the brand set; each brand renders as a monogram
// card linking to its landing page. Breadcrumb: Home / Brands.

import React, { useEffect, useMemo, useState } from "react";
import { getBrands, getCategories } from "@/lib/api";
import type { Brand } from "@/lib/api";
import type { Category } from "@/lib/types";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import BrandCard from "@/components/brand/BrandCard";
import EmptyState from "@/components/discovery/EmptyState";

const GRID: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
};

export default function BrandsPage() {
  const [tops, setTops] = useState<Category[]>([]);
  const [category, setCategory] = useState<string>("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-level categories power the filter dropdown.
  useEffect(() => {
    let alive = true;
    getCategories()
      .then((all) => {
        if (!alive) return;
        setTops(
          all
            .filter((c) => !c.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
        );
      })
      .catch(() => alive && setTops([]));
    return () => {
      alive = false;
    };
  }, []);

  // (Re)fetch brands whenever the category filter changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getBrands(category || undefined)
      .then((rows) => alive && setBrands(Array.isArray(rows) ? rows : []))
      .catch(() => alive && setBrands([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [category]);

  const crumbs: Crumb[] = [{ label: "Directory", href: "/directory" }, { label: "Brands" }];
  const activeName = useMemo(
    () => tops.find((c) => c.slug === category)?.name,
    [tops, category]
  );

  return (
    <div className="counter-public-page counter-support-page counter-catalog-index">
      {/* Header band */}
      <section className="counter-catalog-hero" style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <Breadcrumbs items={crumbs} />
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              marginTop: 14,
            }}
          >
            Brands
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 720 }}>
            Discover the manufacturers and makers behind the platform. Filter by store to see
            the brands that supply each category.
          </p>

          {/* Category filter — native select (mobile-first, non-technical) */}
          <div style={{ marginTop: 18, maxWidth: 320 }}>
            <label
              htmlFor="brand-category"
              style={{ display: "block", fontSize: 13, color: "var(--faint)", marginBottom: 6 }}
            >
              Filter by store
            </label>
            <select
              id="brand-category"
              className="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {tops.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Directory grid */}
      <div className="container-bs section-pad-sm">
        {loading ? (
          <div style={GRID}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="card card-flat"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: 16 }}
              >
                <span
                  className="skeleton"
                  style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0 }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="skeleton" style={{ display: "block", height: 14, width: "80%", marginBottom: 8 }} />
                  <span className="skeleton" style={{ display: "block", height: 12, width: "50%" }} />
                </span>
              </div>
            ))}
          </div>
        ) : brands.length === 0 ? (
          <EmptyState
            title="No brands here yet"
            message={
              activeName
                ? `We haven't catalogued any brands under ${activeName} yet. Try another store or view all brands.`
                : "Brands appear here as sellers list branded products. Check back soon."
            }
            actionLabel={activeName ? "View all brands" : undefined}
            onAction={activeName ? () => setCategory("") : undefined}
          />
        ) : (
          <>
            <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>
              <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{brands.length}</strong>{" "}
              {brands.length === 1 ? "brand" : "brands"}
              {activeName ? ` in ${activeName}` : ""}
            </div>
            <div style={GRID}>
              {brands.map((b) => (
                <BrandCard key={b.slug} brand={b} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
