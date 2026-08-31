"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import type { AiSearchResult, Category, Listing } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useToast } from "./Toast";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useCategories, flattenCategories } from "@/lib/catalog";

export interface AISearchBarProps {
  // If provided, "list" results are handed back instead of routing to /search.
  onResults?: (result: AiSearchResult) => void;
  placeholder?: string;
  examples?: string[];
  autoFocus?: boolean;
  size?: "hero" | "compact";
  className?: string;
  // A "[City ▾] [search…]" combined bar — opt-in since most
  // callers (Consultations, /search) don't want a second control here.
  showCity?: boolean;
  // Off for the navbar-docked desktop instance (Navbar.tsx) — that copy sits
  // in a fixed-height h-16 row with no room for a wrapped chip row, and
  // centered flex overflow made chips spill both above and below the row.
  showExamples?: boolean;
  // Optional controlled query/city — used by the Directory homepage to keep
  // the hero search box and the navbar's docked copy (Navbar.tsx +
  // lib/searchDock.tsx) showing the SAME typed text and city instead of two
  // independent, unsynced instances. Falls back to internal state when
  // omitted, so every other caller (Consultations, /search…) is unaffected.
  query?: string;
  onQueryChange?: (query: string) => void;
  city?: string;
  onCityChange?: (city: string) => void;
  // Off for the Directory-scoped instances (Navbar's docked bar, /search) —
  // pure deterministic category+keyword search, no Claude/API call at all.
  // Consultations and the suite home hero omit this (default true) and keep
  // today's AI-refined behavior unchanged.
  aiEnabled?: boolean;
}

const DEFAULT_EXAMPLES = [
  "CA in Pune for GST filing",
  "Stainless steel sheets, 2mm, Mumbai",
  "Wedding photographer in Jaipur",
  "Bulk cotton fabric suppliers",
];

function SparkIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z" />
      <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4h8a2 2 0 011.4.6l8.4 8.4a2 2 0 010 2.8z" />
      <circle cx="7" cy="8" r="1.4" />
    </svg>
  );
}
function LocationIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
function InfoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
function SearchGlassIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function SpinnerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ animation: "spin 0.7s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function listingSellerName(l: Listing): string {
  return l.seller?.companyName || l.seller?.name || l.sellerName || "Seller";
}
function listingCity(l: Listing): string | undefined {
  return l.seller?.city || l.location?.city;
}
function priceLabel(l: Listing): string {
  if (l.type === "service") {
    const rate = l.service?.rateCard?.[0];
    if (rate) return `₹${formatINR(rate.price)}${rate.unit ? ` / ${rate.unit}` : ""}`;
    return l.service?.pricingModel === "quote" ? "On quote" : "Ask rate";
  }
  const p = l.product;
  if (p?.price != null) return `₹${formatINR(p.price)}`;
  if (p?.priceTiers && p.priceTiers.length > 0) return `₹${formatINR(p.priceTiers[0].price)}`;
  return "Ask Price";
}
function listingImage(l: Listing): string | undefined {
  return l.media?.find((m) => m.type !== "video")?.url || l.media?.[0]?.url;
}

// Flat suggestion item model (for keyboard navigation).
type SugItem =
  | { kind: "category"; cat: Category }
  | { kind: "listing"; listing: Listing }
  | { kind: "ai" };

export default function AISearchBar({
  onResults,
  placeholder: placeholderProp,
  examples = DEFAULT_EXAMPLES,
  autoFocus = false,
  size = "hero",
  className = "",
  showCity = false,
  showExamples = true,
  query: queryProp,
  onQueryChange,
  city: cityProp,
  onCityChange,
  aiEnabled = true,
}: AISearchBarProps) {
  const router = useRouter();
  const { t } = useT();
  const { addToast } = useToast();
  const hero = size === "hero";
  const baseId = useId();

  // The default placeholder is responsive rather than one fixed string: with
  // showCity on, the city <select> + spark icon + submit button leave very
  // little room for the input on narrow phones (~127px at 390px viewport),
  // not nearly enough for a full descriptive sentence even though desktop
  // has plenty of room for one. Only kicks in when the caller hasn't passed
  // an explicit placeholder (e.g. Consultations' page keeps its own).
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 480px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const placeholder =
    placeholderProp ?? (isNarrow && showCity ? "Search…" : "Describe what you need…");

  const [internalCity, setInternalCity] = useState(PAN_INDIA_LABEL);
  const [internalQuery, setInternalQuery] = useState("");
  const city = cityProp ?? internalCity;
  const setCity = onCityChange ?? setInternalCity;
  const query = queryProp ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const [loading, setLoading] = useState(false);
  const [clarify, setClarify] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inline vendor result panel (mode === "list" with no onResults handler).
  const [listResults, setListResults] = useState<Listing[] | null>(null);
  // Optional friendly line the AI returns alongside a list (esp. zero-match cases).
  const [listMessage, setListMessage] = useState<string | null>(null);

  // As-you-type suggestions.
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [catSug, setCatSug] = useState<Category[]>([]);
  const [listSug, setListSug] = useState<Listing[]>([]);
  const [sugLoading, setSugLoading] = useState(false);

  const allCatsRef = useRef<Category[]>([]);
  const reqIdRef = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const term = query.trim();
  const showDropdown = open && term.length >= 2;

  // Category catalog for instant client-side filtering — shared session-wide
  // via CatalogProvider (lib/catalog.tsx) instead of this bar fetching its
  // own copy.
  const { categories: catalogCategories } = useCategories();
  useEffect(() => {
    allCatsRef.current = flattenCategories(catalogCategories);
  }, [catalogCategories]);

  // Debounced suggestion fetch (categories filtered instantly, listings fetched).
  useEffect(() => {
    if (term.length < 2) {
      setCatSug([]);
      setListSug([]);
      setSugLoading(false);
      return;
    }
    const lc = term.toLowerCase();
    setCatSug(
      allCatsRef.current
        .filter((c) => c.name.toLowerCase().includes(lc))
        .slice(0, 5)
    );
    setSugLoading(true);
    const id = ++reqIdRef.current;
    const h = window.setTimeout(() => {
      api
        .getListings({ q: term, limit: 4 })
        .then((r) => {
          if (id === reqIdRef.current) setListSug(r.listings || []);
        })
        .catch(() => {
          if (id === reqIdRef.current) setListSug([]);
        })
        .finally(() => {
          if (id === reqIdRef.current) setSugLoading(false);
        });
    }, 250);
    return () => window.clearTimeout(h);
  }, [term]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items: SugItem[] = useMemo(() => {
    const out: SugItem[] = [
      ...catSug.map((cat) => ({ kind: "category" as const, cat })),
      ...listSug.map((listing) => ({ kind: "listing" as const, listing })),
      { kind: "ai" as const },
    ];
    return out;
  }, [catSug, listSug]);

  function buildNavParams(result: AiSearchResult): string {
    const f = { ...(result.navigateTo?.filters || {}) };
    const p = result.parsed || {};
    const out = new URLSearchParams();
    const city = f.city || (p.location ?? "");
    const type = f.type || p.serviceType || p.productType || "";
    const budget = f.budget || (p.budget != null ? String(p.budget) : "");
    if (city) out.set("city", String(city));
    if (type) out.set("type", String(type));
    if (budget) out.set("budget", String(budget));
    // Carry through any other explicit filters the AI returned.
    Object.entries(f).forEach(([k, v]) => {
      if (v && !out.has(k)) out.set(k, String(v));
    });
    const qs = out.toString();
    return qs ? `?${qs}` : "";
  }

  async function runAi(q: string) {
    const text = q.trim();
    if (!text || loading) return;
    setOpen(false);
    setActive(-1);
    setLoading(true);
    setClarify(null);
    setError(null);
    setListResults(null);
    setListMessage(null);
    // Fold the selected city into the free-text query the AI parses — it
    // already extracts a location from natural language, so this is the
    // lowest-risk way to make the city selector actually filter results.
    const withCity =
      showCity && city !== PAN_INDIA_LABEL && !text.toLowerCase().includes(city.toLowerCase())
        ? `${text} in ${city}`
        : text;
    try {
      const result = await api.aiSearch(withCity, aiEnabled ? undefined : { ai: false });

      if (result.mode === "navigate" && result.navigateTo) {
        const qs = buildNavParams(result);
        addToast(aiEnabled ? "AI matched your request" : "Matched your search", "success");
        router.push(`/${result.navigateTo.categorySlug}${qs}`);
        return;
      }

      if (result.mode === "clarify") {
        setClarify(result.clarify || "Could you add a bit more detail?");
        return;
      }

      // mode === "list"
      if (onResults) {
        onResults(result);
      } else {
        setListResults(result.listings || []);
        setListMessage(result.message ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectItem(item: SugItem) {
    if (item.kind === "category") {
      setOpen(false);
      setActive(-1);
      // Clear rather than leave the partial word behind — this query is
      // shared (lib/searchDock.tsx) with the navbar's search bar, which
      // stays visible after this navigation and would otherwise show it.
      setQuery("");
      router.push(`/${item.cat.slug}`);
    } else if (item.kind === "listing") {
      setOpen(false);
      setActive(-1);
      setQuery("");
      router.push(`/listing/${item.listing.id}`);
    } else {
      void runAi(query);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showDropdown) {
        setOpen(true);
        return;
      }
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showDropdown && active >= 0 && active < items.length) {
        selectItem(items[active]);
      } else {
        void runAi(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const optionId = (i: number) => `${baseId}-opt-${i}`;

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", position: "relative" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAi(query);
        }}
        role="search"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: showCity ? 4 : 10,
            background: "#fff",
            border: "1px solid var(--border-strong)",
            borderRadius: hero ? 16 : 12,
            padding: showCity ? "6px" : hero ? "8px 8px 8px 18px" : "5px 5px 5px 14px",
            boxShadow: hero
              ? "0 4px 24px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.06)"
              : "var(--shadow-card)",
          }}
        >
          {showCity && (
            <>
              <div className="search-city-select" style={{ height: hero ? 40 : 32 }}>
                <span aria-hidden className="search-city-icon">
                  <LocationIcon />
                </span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-label="City"
                  style={{ fontSize: hero ? 14.5 : 13.5 }}
                >
                  <option value={PAN_INDIA_LABEL}>{PAN_INDIA_LABEL}</option>
                  {ALL_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span aria-hidden className="search-city-chevron">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
              <span aria-hidden className="search-city-divider" />
            </>
          )}
          <span style={{ color: "var(--brand)", flexShrink: 0, display: "inline-flex", marginLeft: showCity ? 4 : 0 }}>
            <SparkIcon />
          </span>
          <input
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              if (term.length >= 2) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label={aiEnabled ? "AI vendor search" : "Vendor search"}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={`${baseId}-listbox`}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: hero ? 16 : 15,
              color: "var(--ink)",
              padding: hero ? "8px 0" : "6px 0",
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !query.trim()}
            aria-label={loading ? t("common.searching") : t("common.search")}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: hero ? 12 : 9,
              padding: 0,
              width: hero ? 44 : 36,
              height: hero ? 44 : 36,
            }}
          >
            {loading ? <SpinnerIcon size={hero ? 19 : 16} /> : <SearchGlassIcon size={hero ? 19 : 16} />}
          </button>
        </div>
      </form>

      {/* ---- Suggestions dropdown ---- */}
      {showDropdown && (
        <div
          id={`${baseId}-listbox`}
          role="listbox"
          aria-label="Search suggestions"
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 40,
            padding: 6,
            maxHeight: 420,
            overflowY: "auto",
            boxShadow: "var(--shadow-pop)",
            animation: "scale-in 160ms ease",
          }}
        >
          {catSug.length > 0 && (
            <div style={{ padding: "6px 10px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)" }}>
              {t("common.category")}
            </div>
          )}
          {items.map((item, i) => {
            if (item.kind !== "category") return null;
            const activeRow = i === active;
            return (
              <button
                key={`c-${item.cat.id || item.cat.slug}`}
                id={optionId(i)}
                role="option"
                aria-selected={activeRow}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => selectItem(item)}
                style={{
                  ...rowStyle(activeRow),
                }}
              >
                <span style={{ ...iconWrap, color: "var(--brand-hover)", background: "var(--brand-tint)" }}>
                  {item.cat.icon ? <span aria-hidden>{item.cat.icon}</span> : <TagIcon />}
                </span>
                <span className="line-clamp-1" style={{ flex: 1, minWidth: 0, textAlign: "left", fontWeight: 600, color: "var(--ink)" }}>
                  {item.cat.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0 }}>{t("common.category")}</span>
              </button>
            );
          })}

          {listSug.length > 0 && (
            <div style={{ padding: "8px 10px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)" }}>
              {t("common.products")}
            </div>
          )}
          {items.map((item, i) => {
            if (item.kind !== "listing") return null;
            const l = item.listing;
            const activeRow = i === active;
            const img = listingImage(l);
            return (
              <button
                key={`l-${l.id}`}
                id={optionId(i)}
                role="option"
                aria-selected={activeRow}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => selectItem(item)}
                style={{ ...rowStyle(activeRow) }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 8,
                    background: img ? `#f1f5f9 url(${img}) center/cover` : "var(--bg-subtle)",
                    border: "1px solid var(--border)",
                  }}
                />
                <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <span className="line-clamp-1" style={{ display: "block", fontWeight: 600, color: "var(--ink)" }}>
                    {l.title}
                  </span>
                  <span className="line-clamp-1" style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>
                    {priceLabel(l)} · {listingSellerName(l)}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Pinned Ask-AI row (always last) */}
          {(() => {
            const i = items.length - 1;
            const activeRow = i === active;
            return (
              <button
                id={optionId(i)}
                role="option"
                aria-selected={activeRow}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => void runAi(query)}
                style={{ ...rowStyle(activeRow), marginTop: items.length > 1 ? 4 : 0, borderTop: items.length > 1 ? "1px solid var(--border)" : undefined, borderRadius: 8 }}
              >
                <span style={{ ...iconWrap, color: "var(--brand)", background: "var(--brand-tint)" }}>
                  <SparkIcon size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "left", color: "var(--ink)" }}>
                  <span style={{ fontWeight: 600 }}>{aiEnabled ? "Ask AI" : "Search"}</span>
                  <span className="line-clamp-1" style={{ color: "var(--muted)" }}> “{query.trim()}”</span>
                </span>
                {sugLoading && <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0 }}>…</span>}
              </button>
            );
          })()}
        </div>
      )}

      {/* ---- Clarify note ---- */}
      {clarify && (
        <div
          role="status"
          style={{
            marginTop: 12,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            background: "var(--brand-tint)",
            border: "1px solid #BFDBFE",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            color: "var(--brand-hover)",
          }}
        >
          <span style={{ flexShrink: 0, marginTop: 1 }}>
            <SparkIcon />
          </span>
          <span>{clarify}</span>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--error)" }}>{error}</div>
      )}

      {/* ---- Never-blank panel: zero matches still helps the shopper ---- */}
      {listResults && listResults.length === 0 && (
        <div
          role="region"
          aria-label="No vendor matches"
          className="card card-flat"
          style={{ marginTop: 14, padding: 16, textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ color: "var(--brand)", flexShrink: 0, marginTop: 1, display: "inline-flex" }}>
              <InfoIcon />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600, margin: 0 }}>
                {listMessage ||
                  `No exact matches for "${query.trim()}" yet — post a requirement and matching vendors will send you quotes.`}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                <Link href="/rfq" className="btn btn-primary btn-sm">
                  Post a requirement (RFQ)
                </Link>
                <Link href="/categories" className="btn btn-secondary btn-sm">
                  Browse all categories
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Inline vendor result panel (mode === "list", has results) ---- */}
      {listResults && listResults.length > 0 && (
        <div
          role="region"
          aria-label="Vendor results"
          className="card card-flat"
          style={{ marginTop: 14, padding: 14, textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: listMessage ? 6 : 10 }}>
            <span style={{ color: "var(--brand)", display: "inline-flex" }}>
              <SparkIcon size={16} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              {`${aiEnabled ? "AI found" : "Found"} ${listResults.length} ${listResults.length === 1 ? "vendor" : "vendors"}`}
            </span>
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "var(--brand)", flexShrink: 0 }}
            >
              {t("cta.viewAll")} →
            </Link>
          </div>

          {listMessage && (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
              {listMessage}
            </p>
          )}

          {(
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {listResults.map((l) => {
                const img = listingImage(l);
                const city = listingCity(l);
                return (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 10,
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 52,
                        height: 52,
                        flexShrink: 0,
                        borderRadius: 8,
                        background: img ? `#f1f5f9 url(${img}) center/cover` : "var(--bg-subtle)",
                        border: "1px solid var(--border)",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/listing/${l.id}`}>
                        <span className="line-clamp-1" style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                          {l.title}
                        </span>
                      </Link>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2, fontSize: 12, color: "var(--muted)" }}>
                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{priceLabel(l)}</span>
                        <span style={{ color: "var(--faint)" }}>·</span>
                        <span className="line-clamp-1">{listingSellerName(l)}</span>
                        {city && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--faint)" }}>
                            <LocationIcon /> {city}
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <Link href={`/listing/${l.id}`} className="btn btn-primary btn-sm">
                        {t("common.contact")}
                      </Link>
                      <Link href={`/listing/${l.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- Example chips ---- */}
      {showExamples && examples.length > 0 && !listResults && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              onClick={() => {
                setQuery(ex);
                void runAi(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Shared row styling for suggestion options.
function rowStyle(activeRow: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "9px 10px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: activeRow ? "var(--bg-subtle)" : "transparent",
    fontSize: 14,
    fontFamily: "inherit",
  };
}

const iconWrap: React.CSSProperties = {
  width: 30,
  height: 30,
  flexShrink: 0,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
};
