"use client";

// Listing filters, one panel for every results surface. Order follows what people
// narrow by first: what kind (type), who (verified/featured), then the facets of the
// result set (categories, brand), price and rating. Applied filters are listed at the
// top as removable chips with a single "Clear all"; long lists show their first few
// rows and expand on demand. Styles: .flt* in app/counter-soft-system.css.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { ListingType } from "@/lib/types";
import { useT } from "@/lib/i18n";

export interface ListingFilterState {
  category?: string; // slug (search page category facet)
  city?: string;
  verified?: boolean;
  featured?: boolean;
  priceMax?: number; // price ceiling
  type?: ListingType | "";
  brands?: string[]; // selected brand names (facet from result set)
  minRating?: number; // e.g. 4 → "4★ & up"
  tags?: string[]; // trust tags the company must have: trust_seal, gst, top_rated, fast_responder, trusted
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest";
}

// Trust tags a buyer can require (matched against the company data on each result).
export const TAG_LABELS: Record<string, string> = { trust_seal: "Trust seal", gst: "GST registered", top_rated: "Top rated", fast_responder: "Fast reply", trusted: "Trusted" };

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
  /** Hide sections already surfaced elsewhere so the panel doesn't repeat a control. */
  hideType?: boolean;
  hideCategory?: boolean;
  hideCity?: boolean;
  hidePrice?: boolean;
  hideVerified?: boolean;
  hideFeatured?: boolean;
  /** Suppress the internal title when a parent panel already labels the controls. */
  hideHeading?: boolean;
}

const PRICE_PRESETS = [500, 1000, 2000, 5000, 10000];
const RATING_TIERS = [4, 3];
const COLLAPSED_ROWS = 6;

const formatMoney = (value: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;

function Icon({ d }: { d: string }) {
  return <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;
}
const ICON = {
  filter: "M4 6h16|M7 12h10|M10 18h4",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|m20 20-4-4",
  close: "M6 6l12 12|M18 6L6 18",
  chevron: "M6 9l6 6 6-6",
  next: "M9 6l6 6-6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
};

function Section({ id, title, count = 0, open, onToggle, children }: { id: string; title: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="flt-section">
      <h3>
        <button type="button" className="flt-section-head" aria-expanded={open} aria-controls={`flt-${id}`} onClick={onToggle}>
          <span>{title}{count > 0 && <b>{count}</b>}</span>
          <i className={open ? "is-open" : undefined}><Icon d={ICON.chevron} /></i>
        </button>
      </h3>
      {open && <div id={`flt-${id}`} className="flt-section-body">{children}</div>}
    </section>
  );
}

function Option({ label, count, checked, onChange, radio = false }: { label: React.ReactNode; count?: number; checked: boolean; onChange: () => void; radio?: boolean }) {
  return (
    <button type="button" role={radio ? "radio" : "checkbox"} aria-checked={checked} className={`flt-option${checked ? " is-checked" : ""}`} onClick={onChange}>
      <span className={`flt-box${radio ? " is-radio" : ""}`} aria-hidden>{checked && !radio && <Icon d={ICON.check} />}</span>
      <span className="flt-option-label">{label}</span>
      {typeof count === "number" && <small>{count}</small>}
    </button>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={`flt-switch${checked ? " is-on" : ""}`} onClick={onChange}>
      <span>{label}</span>
      <i aria-hidden />
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`flt-chip${active ? " is-active" : ""}`} aria-pressed={active} onClick={onClick}>{label}</button>;
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
  hideHeading = false,
}: FiltersProps) {
  const { t: rawT } = useT();
  const tr = (key: string, fallback: string) => {
    const v = rawT(key);
    return !v || v === key ? fallback : v;
  };

  const set = (patch: Partial<ListingFilterState>) => onChange({ ...value, ...patch });
  const selectedBrands = value.brands || [];
  const toggleBrand = (name: string) => {
    const next = selectedBrands.includes(name) ? selectedBrands.filter((brand) => brand !== name) : [...selectedBrands, name];
    set({ brands: next.length ? next : undefined });
  };

  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ subcats: true, category: true, brand: true, price: true, rating: true, city: true, tags: true });
  const toggle = (id: string) => setOpenIds((current) => ({ ...current, [id]: !current[id] }));
  const [priceDraft, setPriceDraft] = useState("");

  const subs = useMemo(() => (term ? subcategories.filter((item) => item.name.toLowerCase().includes(term)) : subcategories), [subcategories, term]);
  const brandRows = useMemo(() => (term ? brands.filter((item) => item.label.toLowerCase().includes(term)) : brands), [brands, term]);
  const categoryRows = useMemo(() => (term ? categories.filter((item) => item.label.toLowerCase().includes(term)) : categories), [categories, term]);

  const applied: { key: string; label: string; clear: () => void }[] = [];
  if (value.type) applied.push({ key: "type", label: value.type === "service" ? "Services" : "Products", clear: () => set({ type: undefined }) });
  if (value.verified) applied.push({ key: "verified", label: "Verified", clear: () => set({ verified: undefined }) });
  if (value.featured) applied.push({ key: "featured", label: "Featured", clear: () => set({ featured: undefined }) });
  if (value.category) applied.push({ key: "category", label: categories.find((item) => item.value === value.category)?.label || value.category, clear: () => set({ category: undefined }) });
  if (value.city) applied.push({ key: "city", label: value.city, clear: () => set({ city: undefined }) });
  selectedBrands.forEach((brand) => applied.push({ key: `brand-${brand}`, label: brand, clear: () => toggleBrand(brand) }));
  if (value.priceMax) applied.push({ key: "price", label: `Under ${formatMoney(value.priceMax)}`, clear: () => set({ priceMax: undefined }) });
  (value.tags || []).forEach((tag) => applied.push({ key: `tag-${tag}`, label: TAG_LABELS[tag] || tag, clear: () => set({ tags: (value.tags || []).filter((t) => t !== tag) }) }));
  if (value.minRating) applied.push({ key: "rating", label: `${value.minRating}★ & up`, clear: () => set({ minRating: undefined }) });

  function rows<T>(id: string, list: T[]): { shown: T[]; more: number } {
    if (term || expanded[id]) return { shown: list, more: 0 };
    return { shown: list.slice(0, COLLAPSED_ROWS), more: Math.max(0, list.length - COLLAPSED_ROWS) };
  }
  const more = (id: string, hidden: number) => hidden > 0 ? <button type="button" className="flt-more" onClick={() => setExpanded((current) => ({ ...current, [id]: true }))}>Show {hidden} more</button> : null;
  const less = (id: string, shown: boolean) => shown ? <button type="button" className="flt-more" onClick={() => setExpanded((current) => ({ ...current, [id]: false }))}>Show less</button> : null;

  function applyPrice() {
    const amount = Number(priceDraft.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(amount) && amount > 0) set({ priceMax: Math.round(amount) });
    setPriceDraft("");
  }

  const brandView = rows("brand", brandRows);
  const categoryView = rows("category", categoryRows);
  const subView = rows("subcats", subs);
  const typeOptions: { label: string; value: ListingType | "" }[] = [
    { label: tr("filters.all", "All"), value: "" },
    { label: tr("common.products", "Products"), value: "product" },
    { label: tr("common.services", "Services"), value: "service" },
  ];

  return (
    <aside className={`flt ${className}`.trim()} aria-label={tr("filters.title", "Filters")}>
      {(!hideHeading || applied.length > 0) && (
        <header className="flt-head">
          {!hideHeading && <h2><Icon d={ICON.filter} />{tr("filters.title", "Filters")}{applied.length > 0 && <b>{applied.length}</b>}</h2>}
          {applied.length > 0 && <button type="button" className="flt-clear" onClick={() => onChange({ sort: value.sort })}>{tr("filters.clearAll", "Clear all")}</button>}
        </header>
      )}

      {applied.length > 0 && (
        <ul className="flt-applied" aria-label="Applied filters">
          {applied.map((item) => (
            <li key={item.key}><button type="button" onClick={item.clear} aria-label={`Remove filter ${item.label}`}>{item.label}<Icon d={ICON.close} /></button></li>
          ))}
        </ul>
      )}

      <label className="flt-search">
        <Icon d={ICON.search} />
        <span className="sr-only">{tr("filters.quickSearch", "Search within filters")}</span>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={tr("filters.quickSearch", "Search within filters")} />
      </label>

      {!hideType && (
        <div className="flt-block">
          <p className="flt-label">{tr("filters.type", "Type")}</p>
          <div className="flt-segment" role="radiogroup" aria-label={tr("filters.type", "Type")}>
            {typeOptions.map((option) => {
              const active = (value.type || "") === option.value;
              return <button key={option.value || "all"} type="button" role="radio" aria-checked={active} className={active ? "is-active" : undefined} onClick={() => set({ type: option.value })}>{option.label}</button>;
            })}
          </div>
        </div>
      )}

      {(!hideVerified || !hideFeatured) && (
        <div className="flt-block flt-switches">
          {!hideVerified && <Switch label={tr("filters.verifiedOnly", "Verified sellers only")} checked={!!value.verified} onChange={() => set({ verified: value.verified ? undefined : true })} />}
          {!hideFeatured && <Switch label={tr("filters.featuredOnly", "Featured listings only")} checked={!!value.featured} onChange={() => set({ featured: value.featured ? undefined : true })} />}
        </div>
      )}

      {subcategories.length > 0 && (
        <Section id="subcats" title={tr("filters.categories", "Categories")} open={openIds.subcats} onToggle={() => toggle("subcats")}>
          {subView.shown.length === 0 ? <p className="flt-empty">{tr("filters.noMatches", "No matches")}</p> : subView.shown.map((item) => (
            <Link key={item.slug} href={`/${item.slug}`} className="flt-link"><span>{item.name}</span>{typeof item.count === "number" && item.count > 0 && <small>{item.count}</small>}<Icon d={ICON.next} /></Link>
          ))}
          {more("subcats", subView.more)}{less("subcats", !!expanded.subcats && !term)}
        </Section>
      )}

      {!hideCategory && categories.length > 0 && (
        <Section id="category" title={tr("filters.category", "Category")} count={value.category ? 1 : 0} open={openIds.category} onToggle={() => toggle("category")}>
          {categoryView.shown.length === 0 ? <p className="flt-empty">{tr("filters.noMatches", "No matches")}</p> : categoryView.shown.map((item) => (
            <Option key={item.value} radio label={item.label} count={item.count} checked={value.category === item.value} onChange={() => set({ category: value.category === item.value ? undefined : item.value })} />
          ))}
          {more("category", categoryView.more)}{less("category", !!expanded.category && !term)}
        </Section>
      )}

      {brands.length > 0 && (
        <Section id="brand" title={tr("filters.brand", "Brand")} count={selectedBrands.length} open={openIds.brand} onToggle={() => toggle("brand")}>
          {brandView.shown.length === 0 ? <p className="flt-empty">{tr("filters.noMatches", "No matches")}</p> : brandView.shown.map((item) => (
            <Option key={item.value} label={item.label} count={item.count} checked={selectedBrands.includes(item.value)} onChange={() => toggleBrand(item.value)} />
          ))}
          {more("brand", brandView.more)}{less("brand", !!expanded.brand && !term)}
        </Section>
      )}

      {!hidePrice && (
        <Section id="price" title={tr("filters.price", "Price")} count={value.priceMax ? 1 : 0} open={openIds.price} onToggle={() => toggle("price")}>
          <div className="flt-chips">
            <Chip label={tr("filters.anyPrice", "Any")} active={!value.priceMax} onClick={() => set({ priceMax: undefined })} />
            {PRICE_PRESETS.map((amount) => <Chip key={amount} label={`Under ${formatMoney(amount)}`} active={value.priceMax === amount} onClick={() => set({ priceMax: amount })} />)}
          </div>
          <form className="flt-price" onSubmit={(event) => { event.preventDefault(); applyPrice(); }}>
            <label><span className="sr-only">Maximum price in rupees</span><i aria-hidden>₹</i><input inputMode="numeric" value={priceDraft} onChange={(event) => setPriceDraft(event.target.value)} placeholder="Max price" /></label>
            <button type="submit" disabled={!priceDraft.trim()}>Apply</button>
          </form>
        </Section>
      )}

      <Section id="tags" title="Company badges" count={value.tags?.length || 0} open={openIds.tags} onToggle={() => toggle("tags")}>
        <div className="flt-chips flt-tags">
          {Object.entries(TAG_LABELS).map(([tag, label]) => { const on = !!value.tags?.includes(tag); return <Chip key={tag} label={label} active={on} onClick={() => set({ tags: on ? (value.tags || []).filter((t) => t !== tag) : [...(value.tags || []), tag] })} />; })}
        </div>
      </Section>

      <Section id="rating" title={tr("filters.rating", "Seller rating")} count={value.minRating ? 1 : 0} open={openIds.rating} onToggle={() => toggle("rating")}>
        <div className="flt-chips">
          <Chip label={tr("filters.anyRating", "Any")} active={!value.minRating} onClick={() => set({ minRating: undefined })} />
          {RATING_TIERS.map((rating) => <Chip key={rating} label={`${rating}★ & up`} active={value.minRating === rating} onClick={() => set({ minRating: rating })} />)}
        </div>
      </Section>

      {!hideCity && cities.length > 0 && (
        <Section id="city" title={tr("filters.city", "City")} count={value.city ? 1 : 0} open={openIds.city} onToggle={() => toggle("city")}>
          <select aria-label={tr("filters.city", "City")} value={value.city || ""} onChange={(event) => set({ city: event.target.value || undefined })}>
            <option value="">{tr("filters.allCities", "All cities")}</option>
            {cities.map((item) => <option key={item.value} value={item.value}>{item.label}{typeof item.count === "number" ? ` (${item.count})` : ""}</option>)}
          </select>
        </Section>
      )}
    </aside>
  );
}
