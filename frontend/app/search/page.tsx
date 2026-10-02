"use client";

import { Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchContextSwitch from "@/components/SearchContextSwitch";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import UnifiedListingWorkbench from "@/components/directory/UnifiedListingWorkbench";
import { parseDiscoverySeed } from "@/components/discovery/hooks";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock } from "@/lib/searchDock";
import { getListings, searchSellers } from "@/lib/api";
import { flattenCategories, useCategories } from "@/lib/catalog";
import type { Listing } from "@/lib/types";

function Arrow() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>;
}

type ResultsSuggestion =
  | { kind: "category"; label: string; slug: string; meta: string }
  | { kind: "company"; label: string; slug: string; meta: string }
  | { kind: "listing"; label: string; id: string; meta: string }
  | { kind: "search"; label: string; meta: string };

interface SellerSuggestionRecord {
  name?: string;
  companyName?: string;
  slug?: string;
  sellerSlug?: string;
  city?: string;
  location?: { city?: string };
}

function DirectorySearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { docked, setProgress, setQuery: setDockQuery, setCity: setDockCity, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const seed = parseDiscoverySeed(params);
  const [query, setQuery] = useState(seed.query);
  const [city, setCity] = useState(seed.initialFilters.city || "");
  const [matchedSellers, setMatchedSellers] = useState<Array<{ name: string; slug: string; city?: string }>>([]);
  const [matchedListings, setMatchedListings] = useState<Listing[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const requestIdRef = useRef(0);
  const { categories } = useCategories();
  const allCategories = useMemo(() => flattenCategories(categories), [categories]);
  const term = query.trim().toLowerCase();

  useEffect(() => {
    if (term.length < 2) {
      setMatchedSellers([]);
      setMatchedListings([]);
      return;
    }
    const requestId = ++requestIdRef.current;
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        searchSellers({ q: term, limit: 5 }),
        getListings({ q: term, limit: 5 }),
      ]).then(([sellerResult, listingResult]) => {
        if (requestId !== requestIdRef.current) return;
        const sellers = sellerResult.status === "fulfilled" ? sellerResult.value.sellers || [] : [];
        setMatchedSellers((sellers as SellerSuggestionRecord[]).flatMap((seller) => {
          const slug = seller.slug || seller.sellerSlug;
          if (!slug) return [];
          return [{
            name: seller.name || seller.companyName || "Company",
            slug,
            city: seller.city || seller.location?.city,
          }];
        }));
        setMatchedListings(listingResult.status === "fulfilled" ? listingResult.value.listings || [] : []);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const suggestions = useMemo<ResultsSuggestion[]>(() => {
    if (term.length < 2) return [];
    const categoryMatches: ResultsSuggestion[] = allCategories
      .filter((category) => category.name.toLowerCase().includes(term))
      .slice(0, 3)
      .map((category) => ({ kind: "category", label: category.name, slug: category.slug, meta: "Browse category" }));
    const companyMatches: ResultsSuggestion[] = matchedSellers.slice(0, 3).map((seller) => ({
      kind: "company",
      label: seller.name,
      slug: seller.slug,
      meta: seller.city ? `Company · ${seller.city}` : "Company",
    }));
    const listingMatches: ResultsSuggestion[] = matchedListings.slice(0, 4).map((listing) => ({
      kind: "listing",
      label: listing.title,
      id: listing.id,
      meta: `${listing.type === "product" ? "Product" : "Service"} · ${listing.seller?.companyName || listing.sellerName || "Provider"}`,
    }));
    const searchAll: ResultsSuggestion = {
      kind: "search",
      label: `Search for “${query.trim()}”`,
      meta: "All services and products",
    };
    return [...categoryMatches, ...companyMatches, ...listingMatches].slice(0, 7).concat(searchAll);
  }, [allCategories, matchedListings, matchedSellers, query, term]);
  const showSuggestions = suggestionsOpen && suggestions.length > 0;

  useEffect(() => {
    if (!suggestionsOpen) return;
    const close = (event: MouseEvent) => {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [suggestionsOpen]);

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

  function submitQuery(text: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("scope");
    next.delete("family");
    if (text.trim()) next.set("q", text.trim());
    else next.delete("q");
    if (city.trim()) next.set("city", city.trim());
    else next.delete("city");
    router.push(next.size ? `/search?${next}` : "/search");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    markSearchNav();
    submitQuery(query);
  }

  function chooseSuggestion(item: ResultsSuggestion) {
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    markSearchNav();
    if (item.kind === "category") router.push(`/search?category=${encodeURIComponent(item.slug)}&q=${encodeURIComponent(item.label)}`);
    else if (item.kind === "company") router.push(`/seller/${item.slug}`);
    else if (item.kind === "listing") router.push(`/listing/${item.id}`);
    else submitQuery(query);
  }

  function handleSuggestionKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((value) => Math.min(value + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter" && showSuggestions && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
  }

  const heading = seed.query ? <>Services &amp; products for “{seed.query}”</> : "Browse services & products";

  return <div className="directory-design directory-results directory-listing-results counter-results-page">
    <section className="directory-results-head">
      <div className="directory-shell">
        <h1>{heading}</h1>
        <p>Compare scope, price, terms and the company behind each listing before making contact.</p>
        <div ref={searchWrapRef} className="bn-section-search-wrap directory-results-search-wrap">
          <form ref={searchAnchorRef} className="directory-search" onSubmit={submit} aria-hidden={docked || undefined}>
            <SearchIcon />
            <label>
              <span className="sr-only">Service or product</span>
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setDockQuery(event.target.value); setSuggestionsOpen(true); setActiveSuggestion(-1); }}
                onFocus={() => setSuggestionsOpen(true)}
                onKeyDown={handleSuggestionKeys}
                placeholder="Search companies, products or services"
                autoComplete="off"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeSuggestion >= 0 ? `${listboxId}-${activeSuggestion}` : undefined}
              />
            </label>
            <label>
              <span className="sr-only">Location</span>
              <select value={city} onChange={(event) => { setCity(event.target.value); setDockCity(event.target.value || PAN_INDIA_LABEL); }}>
                <option value="">All locations</option>
                <option value={PAN_INDIA_LABEL}>{PAN_INDIA_LABEL}</option>
                {ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <button type="submit">Update results <Arrow /></button>
          </form>
          {showSuggestions ? <div id={listboxId} className="bn-section-search-suggestions directory-results-suggestions" role="listbox" aria-label="Search suggestions">
            <span className="bn-section-search-suggestions-label">Suggested matches</span>
            {suggestions.map((item, index) => <button
              key={item.kind === "search" ? "search-all" : `${item.kind}-${item.label}`}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={activeSuggestion === index}
              className={activeSuggestion === index ? "is-active" : undefined}
              onMouseEnter={() => setActiveSuggestion(index)}
              onClick={() => chooseSuggestion(item)}
            >
              <span><strong>{item.label}</strong><small>{item.meta}</small></span><Arrow />
            </button>)}
          </div> : null}
        </div>
      </div>
    </section>

    <div className="directory-shell directory-unified-results counter-results-stack">
      <SearchContextSwitch destination="recruitment" query={seed.query} city={seed.initialFilters.city || ""} />
      <UnifiedListingWorkbench key={`results-${seed.query}-${seed.initialFilters.city || ""}`} query={seed.query} initialFilters={seed.initialFilters} />
      <ApiAdvertisingSlot compact placement={["search_top", "category_top"]} kind="native" context="Sponsored in Directory results" summary="A relevant promoted listing, clearly separated from organic results and verification signals." action="View promoted record" />
    </div>
  </div>;
}

export default function SearchPage() {
  return <Suspense fallback={<div className="directory-shell directory-section">Loading services and products…</div>}><DirectorySearchResults /></Suspense>;
}
