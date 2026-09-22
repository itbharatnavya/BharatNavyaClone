"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchContextSwitch from "@/components/SearchContextSwitch";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import UnifiedListingWorkbench from "@/components/directory/UnifiedListingWorkbench";
import { parseDiscoverySeed } from "@/components/discovery/hooks";
import { PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock } from "@/lib/searchDock";

function Arrow() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function SearchIcon() {
  return <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>;
}

function DirectorySearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { docked, setProgress, setQuery: setDockQuery, setCity: setDockCity } = useSearchDock();
  const searchAnchorRef = useRef<HTMLFormElement>(null);
  const seed = parseDiscoverySeed(params);
  const [query, setQuery] = useState(seed.query);
  const [city, setCity] = useState(seed.initialFilters.city || "");

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
    const next = new URLSearchParams(params.toString());
    next.delete("scope");
    next.delete("family");
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    if (city.trim()) next.set("city", city.trim());
    else next.delete("city");
    router.push(next.size ? `/search?${next}` : "/search");
  }

  const heading = seed.query ? <>Services &amp; products for “{seed.query}”</> : "Browse services & products";

  return <div className="directory-design directory-results directory-listing-results counter-results-page">
    <section className="directory-results-head">
      <div className="directory-shell">
        <h1>{heading}</h1>
        <p>Compare scope, price, terms and the company behind each listing before making contact.</p>
        <form ref={searchAnchorRef} className="directory-search" onSubmit={submit} aria-hidden={docked || undefined}>
          <SearchIcon />
          <label><span className="sr-only">Service or product</span><input value={query} onChange={(event) => { setQuery(event.target.value); setDockQuery(event.target.value); }} placeholder="Service, product or business need" /></label>
          <label><span className="sr-only">Location</span><input value={city} onChange={(event) => { setCity(event.target.value); setDockCity(event.target.value || PAN_INDIA_LABEL); }} placeholder="City or PAN India" /></label>
          <button type="submit">Update results <Arrow /></button>
        </form>
      </div>
    </section>

    <div className="directory-shell directory-unified-results counter-results-stack">
      <SearchContextSwitch destination="recruitment" query={seed.query} city={seed.initialFilters.city || ""} />
      <ApiAdvertisingSlot compact placement={["search_top", "category_top"]} kind="native" context="Sponsored in Directory results" summary="A relevant promoted listing, clearly separated from organic results and verification signals." action="View promoted record" />
      <UnifiedListingWorkbench key={`results-${seed.query}-${seed.initialFilters.city || ""}`} query={seed.query} initialFilters={seed.initialFilters} />
    </div>
  </div>;
}

export default function SearchPage() {
  return <Suspense fallback={<div className="directory-shell directory-section">Loading services and products…</div>}><DirectorySearchResults /></Suspense>;
}
