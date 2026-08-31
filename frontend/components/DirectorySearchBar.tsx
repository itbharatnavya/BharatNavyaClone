"use client";

// DirectorySearchBar — the one plain Directory search box, used everywhere:
// Navbar's persistent copy and the Directory home hero. Deliberately NOT
// AISearchBar: no AI wording, no inline vendor-results panel. It DOES show
// an as-you-type suggestions dropdown (matching categories + listings,
// sourced the same way AISearchBar's does) — without it there was no way
// for a non-technical shopper to see or pick a specific category/listing;
// typing just sat there until they guessed the exact submit wording.
// Submitting (via Enter/search button, or picking the pinned "Search for…"
// row) navigates to /search?q=... (+city/category when set) — results
// render on that page (see app/search/page.tsx), including its own loading
// state, so this bar never shows a spinner.
//
// Commit-on-submit, not commit-on-keystroke: `query` is the last *committed*
// search text (only ever changed by an actual search action — see
// searchDock.tsx). Typing updates a local `draft` only; nothing is written
// back to the caller (`onQueryChange`) until submit or a suggestion pick. On
// every route change the draft snaps back to `query`, so text typed but
// never submitted doesn't survive navigating away via an unrelated
// link/card — only a genuine search action makes text reappear on a later
// page.
//
// Picking a category suggestion sets the chip directly (via searchDock's
// setSelectedCategory) right before navigating to that category's page —
// this bar is the ONLY thing that ever pins the chip; a category page itself
// no longer self-pins on load (see CategoryLanding.tsx, and lib/searchDock.tsx's
// markSearchNav mechanism, which is what keeps that pin from leaking onto a
// page nobody actually searched for). While a category is selected it
// occupies the text input's own slot (replacing it, not sitting beside it) so
// exactly one of "selected category" or "free-typed text" is ever visible —
// the suggestion dropdown is therefore only ever shown while typing free text.

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as api from "@/lib/api";
import type { Category, Listing } from "@/lib/types";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock, type SelectedCategory } from "@/lib/searchDock";
import { useCategories, flattenCategories } from "@/lib/catalog";

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function listingSellerName(l: Listing): string {
  return l.seller?.companyName || l.seller?.name || l.sellerName || "Seller";
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
  | { kind: "search" };

export interface DirectorySearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  showCity?: boolean;
  city?: string;
  onCityChange?: (city: string) => void;
  selectedCategory?: SelectedCategory | null;
  onClearCategory?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  size?: "hero" | "compact";
  // Navbar's docked copy (isDirectoryHome) fades/slides this bar in as the
  // hero's own search scrolls out of view, driven by scroll-linked
  // `searchDockProgress` (0→1). That animation must land ONLY on the bar's
  // own chrome (the <form> below) — never on this component's root, which
  // also parents the suggestions dropdown. `opacity` cascades to every
  // descendant uniformly, so applying it any higher up made the dropdown
  // itself render part-transparent (ghosted page content bleeding through)
  // whenever a suggestion was opened mid-transition, i.e. any time
  // searchDockProgress was still short of 1 when the user focused/typed
  // (pointer-events already allow interaction from progress > 0.5).
  dockStyle?: React.CSSProperties;
}

function LocationIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
function SearchGlassIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
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

export default function DirectorySearchBar({
  query,
  onQueryChange,
  showCity = false,
  city = PAN_INDIA_LABEL,
  onCityChange,
  selectedCategory = null,
  onClearCategory,
  placeholder = "Search products, sellers, categories…",
  autoFocus = false,
  className = "",
  size = "compact",
  dockStyle,
}: DirectorySearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hero = size === "hero";
  const baseId = useId();
  // Direct context access (not a controlled prop) purely for the "a real search
  // action is about to navigate" signal + pinning a picked category's chip —
  // see lib/searchDock.tsx's file header. Both callers of this component sit
  // inside the same SearchDockProvider, so this is the same shared store the
  // `selectedCategory`/`onClearCategory` props already read/write, not a
  // second source of truth.
  const { markSearchNav, setSelectedCategory: setDockCategory } = useSearchDock();

  // Local, uncommitted draft — see file header. Reset to the last committed
  // `query` on every route change, so unsubmitted typing never leaks onto
  // whatever page a user navigates to next via something other than search.
  const [draft, setDraft] = useState(query);
  useEffect(() => {
    setDraft(query);
  }, [pathname, query]);

  // As-you-type suggestions — same source/shape as AISearchBar's, just
  // without the "Ask AI" row (this bar is deliberately AI-free).
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [catSug, setCatSug] = useState<Category[]>([]);
  const [listSug, setListSug] = useState<Listing[]>([]);
  const [sugLoading, setSugLoading] = useState(false);

  const allCatsRef = useRef<Category[]>([]);
  const reqIdRef = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const term = draft.trim();
  const showDropdown = !selectedCategory && open && term.length >= 2;

  // Category catalog for instant client-side filtering — shared session-wide
  // via CatalogProvider (lib/catalog.tsx) instead of this bar fetching its
  // own copy (it's mounted twice at once in Navbar: desktop + mobile rows).
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

  // Close the dropdown on outside click, and whenever the route changes.
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
  useEffect(() => {
    setOpen(false);
    setActive(-1);
  }, [pathname]);

  const items: SugItem[] = useMemo(() => {
    const out: SugItem[] = [
      ...catSug.map((cat) => ({ kind: "category" as const, cat })),
      ...listSug.map((listing) => ({ kind: "listing" as const, listing })),
      { kind: "search" as const },
    ];
    return out;
  }, [catSug, listSug]);

  function submit() {
    const text = draft.trim();
    setOpen(false);
    setActive(-1);
    if (!text) {
      // No typed text — if a category is pinned, "search" just means go look
      // at that category.
      if (selectedCategory) {
        markSearchNav();
        router.push(`/${selectedCategory.slug}`);
      }
      return;
    }
    onQueryChange(text);
    const usp = new URLSearchParams();
    usp.set("q", text);
    if (showCity && city !== PAN_INDIA_LABEL) usp.set("city", city);
    if (selectedCategory) usp.set("category", selectedCategory.slug);
    markSearchNav();
    router.push(`/search?${usp.toString()}`);
  }

  // Picking a suggestion clears the draft (and the shared committed query —
  // see file header on why AISearchBar does the same) rather than leaving
  // the partial word behind, since this query is shared with other docked
  // copies of this same bar that stay visible after navigating.
  //
  // A category/listing pick is also the ONLY thing this bar ever logs for
  // Popular/Trending Searches (api.logSearchSelection, fire-and-forget) — a
  // real suggestion was actually selected, so the categorySlug is known and
  // validated. The plain "Search" row / Enter / search-icon submit below
  // (submit()) deliberately logs nothing: that's raw, unvalidated free text
  // (half-typed words included), which is exactly what used to pollute
  // Popular Searches with garbage like "clot".
  function selectItem(item: SugItem) {
    setOpen(false);
    setActive(-1);
    if (item.kind === "category") {
      setDraft("");
      onQueryChange("");
      setDockCategory({ slug: item.cat.slug, name: item.cat.name });
      api.logSearchSelection({ query: item.cat.name, categorySlug: item.cat.slug }).catch(() => {});
      markSearchNav();
      router.push(`/${item.cat.slug}`);
    } else if (item.kind === "listing") {
      setDraft("");
      onQueryChange("");
      const categorySlug = item.listing.categoryPath?.[item.listing.categoryPath.length - 1];
      if (categorySlug) {
        api.logSearchSelection({ query: item.listing.title, categorySlug }).catch(() => {});
      }
      markSearchNav();
      router.push(`/listing/${item.listing.id}`);
    } else {
      submit();
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
        submit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Tab") {
      // Tab always leaves the input, so resolve the dropdown rather than
      // leaving it open behind whatever gets focus next: a highlighted
      // suggestion is picked (consuming the Tab so the pick — not a focus
      // jump — is what happens), otherwise it just closes and Tab proceeds
      // to move focus as normal (e.g. onto the submit button).
      if (showDropdown && active >= 0 && active < items.length) {
        e.preventDefault();
        selectItem(items[active]);
      } else {
        setOpen(false);
        setActive(-1);
      }
    }
  }

  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const barPad = hero ? "8px" : showCity || selectedCategory ? "6px" : "5px 5px 5px 14px";
  const inputFontSize = hero ? 16 : 15;
  const inputPadding = hero ? "10px 2px" : "6px 0";
  const buttonSize = hero ? 44 : 36;

  return (
    <div ref={rootRef} className={className} style={{ width: "100%", position: "relative" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        role="search"
        style={dockStyle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: showCity || selectedCategory ? 4 : 10,
            background: "#fff",
            border: "1px solid var(--border-strong)",
            borderRadius: hero ? 14 : 12,
            padding: barPad,
            boxShadow: "var(--shadow-card)",
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
                  onChange={(e) => onCityChange?.(e.target.value)}
                  aria-label="City"
                  style={{ fontSize: 13.5 }}
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
          {selectedCategory ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                minWidth: 0,
                background: "var(--brand-tint)",
                color: "var(--brand-hover)",
                fontSize: hero ? 14.5 : 12.5,
                fontWeight: 600,
                borderRadius: 8,
                padding: "8px 8px 8px 12px",
              }}
            >
              <span className="line-clamp-1" style={{ flex: 1, minWidth: 0 }}>
                Category: {selectedCategory.name}
              </span>
              {onClearCategory && (
                <button
                  type="button"
                  onClick={() => onClearCategory()}
                  aria-label={`Clear ${selectedCategory.name} category`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(37,99,235,0.14)",
                    color: "inherit",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </span>
          ) : (
            <input
              autoFocus={autoFocus}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => {
                if (term.length >= 2) setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label="Search products, sellers and categories"
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
                fontSize: inputFontSize,
                color: "var(--ink)",
                padding: inputPadding,
              }}
            />
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!draft.trim() && !selectedCategory}
            aria-label="Submit search"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9,
              padding: 0,
              width: buttonSize,
              height: buttonSize,
            }}
          >
            <SearchGlassIcon />
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
              Category
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
                style={rowStyle(activeRow)}
              >
                <span style={{ ...iconWrap, color: "var(--brand-hover)", background: "var(--brand-tint)" }}>
                  {item.cat.icon ? <span aria-hidden>{item.cat.icon}</span> : <TagIcon />}
                </span>
                <span className="line-clamp-1" style={{ flex: 1, minWidth: 0, textAlign: "left", fontWeight: 600, color: "var(--ink)" }}>
                  {item.cat.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0 }}>Category</span>
              </button>
            );
          })}

          {listSug.length > 0 && (
            <div style={{ padding: "8px 10px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--faint)" }}>
              Products &amp; services
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
                style={rowStyle(activeRow)}
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

          {/* Pinned "Search for…" row (always last) */}
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
                onClick={submit}
                style={{ ...rowStyle(activeRow), marginTop: items.length > 1 ? 4 : 0, borderTop: items.length > 1 ? "1px solid var(--border)" : undefined, borderRadius: 8 }}
              >
                <span style={{ ...iconWrap, color: "var(--brand)", background: "var(--brand-tint)" }}>
                  <SearchGlassIcon />
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "left", color: "var(--ink)" }}>
                  <span style={{ fontWeight: 600 }}>Search</span>
                  <span className="line-clamp-1" style={{ color: "var(--muted)" }}> “{term}”</span>
                </span>
                {sugLoading && <span style={{ fontSize: 12, color: "var(--faint)", flexShrink: 0 }}>…</span>}
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
