"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { ListingType } from "@/lib/types";
import { useT } from "@/lib/i18n";

export interface ListingFilterState {
  category?: string; // slug (search page category facet)
  city?: string;
  verified?: boolean;
  featured?: boolean;
  priceMax?: number; // price-tier ceiling
  type?: ListingType | "";
  brands?: string[]; // selected brand names (facet from result set)
  minRating?: number; // e.g. 4 → "4★ & up"
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** A child category shown in the rail's "Sub-categories" drill-down. */
export interface SubcategoryItem {
  slug: string;
  name: string;
  count?: number;
}

export interface FiltersProps {
  value: ListingFilterState;
  onChange: (next: ListingFilterState) => void;
  categories?: FilterOption[];
  cities?: FilterOption[];
  /** Brand facet options built from the current result set. */
  brands?: FilterOption[];
  /** Child categories to drill into (links). */
  subcategories?: SubcategoryItem[];
  className?: string;
  /** Hide sections already surfaced as inline pills above the results (DiscoveryResults'
   * top filter bar) so the drawer doesn't repeat the same control twice. */
  hideType?: boolean;
  hideCategory?: boolean;
  hideCity?: boolean;
  hidePrice?: boolean;
  hideVerified?: boolean;
  hideFeatured?: boolean;
}

const PRICE_TIERS: { display: string; value: number }[] = [
  { display: "₹500", value: 500 },
  { display: "₹1k", value: 1000 },
  { display: "₹2k", value: 2000 },
  { display: "₹5k", value: 5000 },
];

const RATING_TIERS = [4, 3];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: "transform 180ms ease", transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/** Collapsible accordion section (IMTRA-style header + chevron + optional count badge). */
function Accordion({
  title,
  count = 0,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "14px 2px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          color: "var(--ink)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
          {title}
          {count > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                background: "var(--brand)",
                borderRadius: 999,
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {count}
            </span>
          )}
        </span>
        <span style={{ color: "var(--faint)" }}>
          <Chevron open={open} />
        </span>
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

function CheckMark() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * A single checkbox / radio row. The selection indicator is a CUSTOM element
 * driven purely by the `checked` prop (not a native <input>). Native radios in a
 * group desync from React's controlled `checked` — the filter applies but the dot
 * doesn't fill until the next render ("click twice to select"). A state-driven
 * indicator on a role-annotated button is always correct on the first click.
 */
function CheckRow({
  label,
  count,
  checked,
  onChange,
  radio = false,
}: {
  label: React.ReactNode;
  count?: number;
  checked: boolean;
  onChange: () => void;
  radio?: boolean;
  name?: string;
}) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        fontSize: 14,
        color: checked ? "var(--ink)" : "var(--muted)",
        fontWeight: checked ? 600 : 400,
        padding: "7px 2px",
        minWidth: 0,
        width: "100%",
        textAlign: "left",
        background: "none",
        border: "none",
        fontFamily: "inherit",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: radio ? 999 : 5,
          border: `1.5px solid ${checked ? "var(--brand)" : "var(--border-strong)"}`,
          background: checked ? "var(--brand)" : "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 120ms ease, border-color 120ms ease",
        }}
      >
        {checked &&
          (radio ? (
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "#fff" }} />
          ) : (
            <CheckMark />
          ))}
      </span>
      <span className="line-clamp-1" style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {typeof count === "number" && (
        <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0 }}>{count}</span>
      )}
    </button>
  );
}

export default function Filters({
  value,
  onChange,
  categories = [],
  cities = [],
  brands = [],
  subcategories = [],
  className = "",
  hideType = false,
  hideCategory = false,
  hideCity = false,
  hidePrice = false,
  hideVerified = false,
  hideFeatured = false,
}: FiltersProps) {
  const { t: rawT, lang } = useT();
  const tr = (key: string, fallback: string) => {
    const v = rawT(key);
    return !v || v === key ? fallback : v;
  };
  const priceTierLabel = (display: string) =>
    lang === "hi"
      ? `${display} ${tr("filters.under", "से कम")}`
      : `${tr("filters.under", "Under")} ${display}`;

  const set = (patch: Partial<ListingFilterState>) => onChange({ ...value, ...patch });

  const selectedBrands = value.brands || [];
  const toggleBrand = (name: string) => {
    const next = selectedBrands.includes(name)
      ? selectedBrands.filter((b) => b !== name)
      : [...selectedBrands, name];
    set({ brands: next.length ? next : undefined });
  };

  // Quick-search term filters the long facet lists (sub-categories + brands).
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const shownSubcats = useMemo(
    () => (ql ? subcategories.filter((s) => s.name.toLowerCase().includes(ql)) : subcategories),
    [subcategories, ql]
  );
  const shownBrands = useMemo(
    () => (ql ? brands.filter((b) => b.label.toLowerCase().includes(ql)) : brands),
    [brands, ql]
  );

  // Accordion open/close state (Sub-categories, Type, Brand, Price open by default).
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    subcats: true,
    type: true,
    brand: true,
    price: true,
    rating: false,
    category: true,
    city: false,
  });
  const toggle = (id: string) => setOpenIds((o) => ({ ...o, [id]: !o[id] }));

  const hasAny =
    value.category ||
    value.city ||
    value.verified ||
    value.featured ||
    value.priceMax ||
    value.type ||
    (value.brands && value.brands.length > 0) ||
    value.minRating;

  return (
    <aside className={className} style={{ width: "100%", minWidth: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>
          <span style={{ color: "var(--brand)" }}><FilterIcon /></span>
          {tr("filters.title", "Filters")}
        </span>
        {hasAny && (
          <button
            type="button"
            onClick={() => onChange({ sort: value.sort })}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--brand)", fontWeight: 600 }}
          >
            {tr("filters.clearAll", "Clear all")}
          </button>
        )}
      </div>

      {/* Quick search */}
      <div style={{ position: "relative", marginBottom: 6 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--faint)", display: "inline-flex" }}>
          <SearchIcon />
        </span>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("filters.quickSearch", "Quick search filters…")}
          aria-label={tr("filters.quickSearch", "Quick search filters")}
          style={{ paddingLeft: 34, fontSize: 13 }}
        />
      </div>

      {/* Sub-categories (drill-down links) */}
      {subcategories.length > 0 && (
        <Accordion title={tr("filters.categories", "Categories")} open={openIds.subcats} onToggle={() => toggle("subcats")}>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 260, overflowY: "auto" }} className="no-scrollbar">
            {shownSubcats.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--faint)", padding: "4px 2px" }}>{tr("filters.noMatches", "No matches")}</span>
            ) : (
              shownSubcats.map((s) => (
                <Link
                  key={s.slug}
                  href={`/${s.slug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "7px 2px",
                    fontSize: 14,
                    color: "var(--muted)",
                    minWidth: 0,
                  }}
                >
                  <span className="line-clamp-1" style={{ minWidth: 0 }}>{s.name}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, color: "var(--faint)" }}>
                    {typeof s.count === "number" && s.count > 0 && <span style={{ fontSize: 12 }}>{s.count}</span>}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                </Link>
              ))
            )}
          </div>
        </Accordion>
      )}

      {/* Type */}
      {!hideType && (
      <Accordion title={tr("filters.type", "Type")} count={value.type ? 1 : 0} open={openIds.type} onToggle={() => toggle("type")}>
        {(
          [
            { labelKey: "filters.all", label: "All", value: "" },
            { labelKey: "common.products", label: "Products", value: "product" },
            { labelKey: "common.services", label: "Services", value: "service" },
          ] as { labelKey: string; label: string; value: ListingType | "" }[]
        ).map((opt) => {
          const active = value.type === opt.value || (!value.type && opt.value === "");
          return (
            <CheckRow
              key={opt.value || "all"}
              radio
              name="listing-type"
              label={tr(opt.labelKey, opt.label)}
              checked={active}
              onChange={() => set({ type: opt.value })}
            />
          );
        })}
      </Accordion>
      )}

      {/* Brand — searchable checkbox facet */}
      {brands.length > 0 && (
        <Accordion title={tr("filters.brand", "Brand")} count={selectedBrands.length} open={openIds.brand} onToggle={() => toggle("brand")}>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 240, overflowY: "auto" }} className="no-scrollbar">
            {shownBrands.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--faint)", padding: "4px 2px" }}>{tr("filters.noMatches", "No matches")}</span>
            ) : (
              shownBrands.map((b) => (
                <CheckRow
                  key={b.value}
                  label={b.label}
                  count={b.count}
                  checked={selectedBrands.includes(b.value)}
                  onChange={() => toggleBrand(b.value)}
                />
              ))
            )}
          </div>
        </Accordion>
      )}

      {/* Price tiers */}
      {!hidePrice && (
      <Accordion title={tr("filters.price", "Price")} count={value.priceMax ? 1 : 0} open={openIds.price} onToggle={() => toggle("price")}>
        <CheckRow
          radio
          name="price-tier"
          label={tr("filters.anyPrice", "Any price")}
          checked={!value.priceMax}
          onChange={() => set({ priceMax: undefined })}
        />
        {PRICE_TIERS.map((tier) => (
          <CheckRow
            key={tier.value}
            radio
            name="price-tier"
            label={priceTierLabel(tier.display)}
            checked={value.priceMax === tier.value}
            onChange={() => set({ priceMax: tier.value })}
          />
        ))}
      </Accordion>
      )}

      {/* Rating */}
      <Accordion title={tr("filters.rating", "Rating")} count={value.minRating ? 1 : 0} open={openIds.rating} onToggle={() => toggle("rating")}>
        <CheckRow
          radio
          name="rating-tier"
          label={tr("filters.anyRating", "Any rating")}
          checked={!value.minRating}
          onChange={() => set({ minRating: undefined })}
        />
        {RATING_TIERS.map((r) => (
          <CheckRow
            key={r}
            radio
            name="rating-tier"
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span aria-hidden style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      style={{ color: i < r ? "#F59E0B" : "var(--border-strong)" }}
                    >
                      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
                    </svg>
                  ))}
                </span>
                <span>{lang === "hi" ? "से ऊपर" : "& up"}</span>
              </span>
            }
            checked={value.minRating === r}
            onChange={() => set({ minRating: r })}
          />
        ))}
      </Accordion>

      {/* Category (search-page facet — single select) */}
      {!hideCategory && categories.length > 0 && (
        <Accordion title={tr("filters.category", "Category")} count={value.category ? 1 : 0} open={openIds.category} onToggle={() => toggle("category")}>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 260, overflowY: "auto" }} className="no-scrollbar">
            {categories.map((c) => (
              <CheckRow
                key={c.value}
                radio
                name="category"
                label={c.label}
                count={c.count}
                checked={value.category === c.value}
                onChange={() => set({ category: c.value })}
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* City */}
      {!hideCity && cities.length > 0 && (
        <Accordion title={tr("filters.city", "City")} count={value.city ? 1 : 0} open={openIds.city} onToggle={() => toggle("city")}>
          <select
            className="select"
            value={value.city || ""}
            onChange={(e) => set({ city: e.target.value || undefined })}
          >
            <option value="">{tr("filters.allCities", "All cities")}</option>
            {cities.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
                {typeof c.count === "number" ? ` (${c.count})` : ""}
              </option>
            ))}
          </select>
        </Accordion>
      )}

      {/* Verified / Featured (always visible) */}
      {(!hideVerified || !hideFeatured) && (
        <div style={{ paddingTop: 10 }}>
          {!hideVerified && (
            <CheckRow
              label={tr("filters.verifiedOnly", "Verified sellers only")}
              checked={!!value.verified}
              onChange={() => set({ verified: value.verified ? undefined : true })}
            />
          )}
          {!hideFeatured && (
            <CheckRow
              label={tr("filters.featuredOnly", "Featured listings only")}
              checked={!!value.featured}
              onChange={() => set({ featured: value.featured ? undefined : true })}
            />
          )}
        </div>
      )}
    </aside>
  );
}
