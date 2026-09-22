"use client";

import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchContextSwitch from "@/components/SearchContextSwitch";
import UnifiedListingWorkbench from "@/components/directory/UnifiedListingWorkbench";
import { parseDiscoverySeed } from "@/components/discovery/hooks";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock } from "@/lib/searchDock";
import { getListings, searchSellers } from "@/lib/api";
import { useCategories, flattenCategories } from "@/lib/catalog";
import type { Listing } from "@/lib/types";

function Arrow() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>;
}
function BuildingIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="3" width="12" height="18" rx="1" /><path d="M16 8h4v13h-4M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1" /></svg>;
}
function TagIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4h8a2 2 0 0 1 1.4.6l8.4 8.4a2 2 0 0 1 0 2.8Z" /><circle cx="7" cy="8" r="1.4" /></svg>;
}
function BoxIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>;
}

// Same suggestion shape/source and contract as the home search bar
// (components/SectionSearchDock.tsx's DirectorySectionSearch), which itself
// mirrors old frontend's DirectorySearchBar exactly: categories (client-side,
// from the session-wide catalog), companies, products & services, and a
// pinned "Search for…" row always last, gated closed until 2+ characters.
// Kept as a second, small copy here rather than importing that component
// directly, since this page's search bar uses its own distinct chrome/grid
// (`.directory-search`, styled for a results-page header) and its submit
// preserves other URL params (type/scope filters) that the shared component
// doesn't know about.
type ResultsSuggestion =
  | { kind: "category"; label: string; slug: string }
  | { kind: "company"; label: string; slug: string | null; city?: string | null }
  | { kind: "listing"; label: string; id: string; seller?: string | null }
  | { kind: "search" };
interface SellerSearchResult { name: string; slug: string | null; city?: string | null }

function DirectorySearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { docked, setProgress, setQuery: setDockQuery, setCity: setDockCity, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const seed = parseDiscoverySeed(params);
  const [query, setQuery] = useState(seed.query);
  const [city, setCity] = useState(seed.initialFilters.city || "");

  const { categories: catalogCategories } = useCategories();
  const allCategories = useMemo(() => flattenCategories(catalogCategories), [catalogCategories]);
  const [matchedSellers, setMatchedSellers] = useState<SellerSearchResult[]>([]);
  const [matchedListings, setMatchedListings] = useState<Listing[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const reqIdRef = useRef(0);
  const term = query.trim().toLowerCase();

  useEffect(() => {
    if (term.length < 2) { setMatchedSellers([]); setMatchedListings([]); return; }
    const id = ++reqIdRef.current;
    const timer = window.setTimeout(() => {
      Promise.allSettled([searchSellers({ q: term, limit: 5 }), getListings({ q: term, limit: 5 })]).then(([sellerResult, listingResult]) => {
        if (id !== reqIdRef.current) return;
        setMatchedSellers(sellerResult.status === "fulfilled" ? sellerResult.value.sellers || [] : []);
        setMatchedListings(listingResult.status === "fulfilled" ? listingResult.value.listings || [] : []);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const items: ResultsSuggestion[] = useMemo(() => {
    if (term.length < 2) return [];
    const categories: ResultsSuggestion[] = allCategories
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map((c) => ({ kind: "category", label: c.name, slug: c.slug }));
    const companies: ResultsSuggestion[] = matchedSellers.slice(0, 4).map((s) => ({ kind: "company", label: s.name, slug: s.slug || null, city: s.city }));
    const listings: ResultsSuggestion[] = matchedListings.slice(0, 4).map((l) => ({ kind: "listing", label: l.title, id: l.id, seller: l.seller?.companyName || l.seller?.name || l.sellerName }));
    return [...categories, ...companies, ...listings, { kind: "search" }];
  }, [term, allCategories, matchedSellers, matchedListings]);
  const showDropdown = open && items.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) { setOpen(false); setActive(-1); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function submitFreeText(text: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("scope");
    next.delete("family");
    if (text.trim()) next.set("q", text.trim());
    else next.delete("q");
    if (city.trim()) next.set("city", city.trim());
    else next.delete("city");
    router.push(next.size ? `/search?${next}` : "/search");
  }

  function selectItem(item: ResultsSuggestion) {
    setOpen(false);
    setActive(-1);
    markSearchNav();
    if (item.kind === "category") {
      // Stay on /search's own category filter (parseDiscoverySeed →
      // UnifiedListingWorkbench → GET /api/listings?category=) rather than the
      // separate /<slug> category-landing route — a fresh, category-only browse,
      // so the free-text query is cleared the same way old frontend's category
      // pick replaced the typed text.
      const next = new URLSearchParams(params.toString());
      next.delete("q");
      next.set("category", item.slug);
      router.push(`/search?${next}`);
    }
    else if (item.kind === "company") { if (item.slug) router.push(`/seller/${item.slug}`); }
    else if (item.kind === "listing") router.push(`/listing/${item.id}`);
    else submitFreeText(query);
  }

  function onQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (event.key === "Enter") {
      if (showDropdown && active >= 0 && active < items.length) {
        event.preventDefault();
        selectItem(items[active]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  useEffect(() => {
    setQuery(seed.query);
    setCity(seed.initialFilters.city || "");
    setDockQuery(seed.query);
    setDockCity(seed.initialFilters.city || PAN_INDIA_LABEL);
  }, [seed.query, seed.initialFilters.city, setDockCity, setDockQuery]);

  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor) return;
    let frame = 0;
    const updateDock = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setProgress(anchor.getBoundingClientRect().bottom <= 72 ? 1 : 0));
    };
    updateDock();
    window.addEventListener("scroll", updateDock, { passive: true });
    window.addEventListener("resize", updateDock);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateDock);
      window.removeEventListener("resize", updateDock);
      setProgress(0);
    };
  }, [setProgress]);

  useEffect(() => {
    searchAnchorRef.current?.toggleAttribute("inert", docked);
  }, [docked]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setOpen(false);
    setActive(-1);
    submitFreeText(query);
  }

  const heading = seed.query ? <>Services &amp; products for “{seed.query}”</> : "Browse services & products";

  return <div className="directory-design directory-results directory-listing-results">
    <section className="directory-results-head">
      <div className="directory-shell">
        <h1>{heading}</h1>
        <p>Compare scope, price, terms and the company behind each listing before making contact.</p>
        <div ref={wrapRef} className="bn-section-search-wrap">
          <form ref={searchAnchorRef} className="directory-search" onSubmit={submit} aria-hidden={docked || undefined}>
            <SearchIcon />
            <label>
              <span className="sr-only">Service or product</span>
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setDockQuery(event.target.value); setOpen(true); setActive(-1); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onQueryKeyDown}
                placeholder="Service, product or business need"
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              />
            </label>
            <label><span className="sr-only">Location</span><select value={city} onChange={(event) => { setCity(event.target.value); setDockCity(event.target.value || PAN_INDIA_LABEL); }}><option value="">All locations</option>{ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <button type="submit">Update results <Arrow /></button>
          </form>
          {showDropdown && <div id={listboxId} role="listbox" aria-label="Search suggestions" className="card bn-section-search-dropdown">
            {items.some((i) => i.kind === "category") && <div className="bn-section-search-dropdown-label"><TagIcon /> Matching categories</div>}
            {items.map((item, i) => item.kind !== "category" ? null : (
              <button key={`cat-${item.slug}`} id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`}>{item.label}</button>
            ))}
            {items.some((i) => i.kind === "company") && <div className="bn-section-search-dropdown-label"><BuildingIcon /> Matching companies</div>}
            {items.map((item, i) => item.kind !== "company" ? null : (
              <button key={`c-${item.slug || item.label}`} id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`}>{item.label}{item.city ? ` · ${item.city}` : ""}</button>
            ))}
            {items.some((i) => i.kind === "listing") && <div className="bn-section-search-dropdown-label"><BoxIcon /> Matching products &amp; services</div>}
            {items.map((item, i) => item.kind !== "listing" ? null : (
              <button key={`l-${item.id}`} id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`}>{item.label}{item.seller ? ` · ${item.seller}` : ""}</button>
            ))}
            {items.map((item, i) => item.kind !== "search" ? null : (
              <button key="pinned-search" id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><SearchIcon /> Search for &quot;{query.trim()}&quot;</button>
            ))}
          </div>}
        </div>
      </div>
    </section>

    <div className="directory-shell directory-unified-results">
      <SearchContextSwitch destination="recruitment" query={seed.query} city={seed.initialFilters.city || ""} />
      <UnifiedListingWorkbench key={`results-${seed.query}-${seed.initialFilters.city || ""}`} query={seed.query} initialFilters={seed.initialFilters} />
    </div>
  </div>;
}

export default function SearchPage() {
  return <Suspense fallback={<div className="directory-shell directory-section">Loading services and products…</div>}><DirectorySearchResults /></Suspense>;
}
