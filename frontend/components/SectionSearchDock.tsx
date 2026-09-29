"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock } from "@/lib/searchDock";
import { flattenCategories, useCategories } from "@/lib/catalog";
import { getJobFunctions, getJobs, getListings, searchSellers } from "@/lib/api";
import type { Job, JobFunction, Listing } from "@/lib/types";

function SearchIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>;
}
function LocationIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}
function ArrowIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function CloseIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
function BriefcaseIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><rect x="3" y="7.5" width="18" height="12" rx="1.8" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" /></svg>;
}
function TagIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4h8a2 2 0 0 1 1.4.6l8.4 8.4a2 2 0 0 1 0 2.8Z" /><circle cx="7" cy="8" r="1.4" /></svg>;
}
function BuildingIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="3" width="12" height="18" rx="1" /><path d="M16 8h4v13h-4M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1" /></svg>;
}
function BoxIcon() {
  return <svg aria-hidden viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5M12 13v8" /></svg>;
}

export type DirectorySearchVariant = "hero" | "compact" | "drawer";

type DirectorySuggestion =
  | { kind: "category"; label: string; slug: string }
  | { kind: "company"; label: string; slug: string | null; city?: string | null }
  | { kind: "listing"; label: string; id: string; seller?: string | null }
  | { kind: "search" };

type RoleSuggestion =
  | { kind: "function"; label: string; slug: string }
  | { kind: "job"; label: string; jobId: string; company?: string | null }
  | { kind: "company"; label: string; slug: string | null };

interface SellerSearchResult { name: string; slug: string | null; city?: string | null }

export function DirectorySectionSearch({ variant = "hero", onSubmitted }: { variant?: DirectorySearchVariant; onSubmitted?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryId = useId();
  const cityId = useId();
  const listboxId = useId();
  const { query, setQuery, city, setCity, markSearchNav } = useSearchDock();
  const [draft, setDraft] = useState(query);
  const { categories: catalogCategories } = useCategories();
  const allCategories = useMemo(() => flattenCategories(catalogCategories), [catalogCategories]);
  const [matchedSellers, setMatchedSellers] = useState<SellerSearchResult[]>([]);
  const [matchedListings, setMatchedListings] = useState<Listing[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const term = draft.trim().toLowerCase();

  useEffect(() => { setDraft(query); }, [pathname, query]);

  useEffect(() => {
    if (term.length < 2) {
      setMatchedSellers([]);
      setMatchedListings([]);
      setSuggestionsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      Promise.allSettled([searchSellers({ q: term, limit: 5 }), getListings({ q: term, limit: 5 })]).then(([sellerResult, listingResult]) => {
        if (requestId !== requestIdRef.current) return;
        setMatchedSellers(sellerResult.status === "fulfilled" ? sellerResult.value.sellers || [] : []);
        setMatchedListings(listingResult.status === "fulfilled" ? listingResult.value.listings || [] : []);
        setSuggestionsLoading(false);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const items = useMemo<DirectorySuggestion[]>(() => {
    if (term.length < 2) return [];
    const categories = allCategories.filter((category) => category.name.toLowerCase().includes(term)).slice(0, 5).map((category) => ({ kind: "category" as const, label: category.name, slug: category.slug }));
    const companies = matchedSellers.slice(0, 4).map((seller) => ({ kind: "company" as const, label: seller.name, slug: seller.slug || null, city: seller.city }));
    const listings = matchedListings.slice(0, 4).map((listing) => ({ kind: "listing" as const, label: listing.title, id: listing.id, seller: listing.seller?.companyName || listing.sellerName }));
    return [...categories, ...companies, ...listings, { kind: "search" }];
  }, [allCategories, matchedListings, matchedSellers, term]);
  const showDropdown = open && (items.length > 0 || suggestionsLoading);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!wrapRef.current?.contains(event.target as Node)) { setOpen(false); setActive(-1); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function search(text: string) {
    const committed = text.trim();
    setOpen(false);
    setActive(-1);
    setQuery(committed);
    const params = new URLSearchParams();
    if (committed) params.set("q", committed);
    if (city && city !== PAN_INDIA_LABEL) params.set("city", city);
    markSearchNav();
    onSubmitted?.();
    router.push(`/search${params.size ? `?${params.toString()}` : ""}`);
  }

  function chooseSuggestion(item: DirectorySuggestion) {
    setOpen(false);
    setActive(-1);
    markSearchNav();
    onSubmitted?.();
    if (item.kind === "category") {
      setDraft(""); setQuery(""); router.push(`/search?category=${encodeURIComponent(item.slug)}`);
    } else if (item.kind === "company") {
      if (item.slug) { setDraft(""); setQuery(""); router.push(`/seller/${item.slug}`); }
      else search(item.label);
    } else if (item.kind === "listing") {
      setDraft(""); setQuery(""); router.push(`/listing/${item.id}`);
    } else search(draft);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) setOpen(true); else setActive((index) => Math.min(index + 1, items.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, -1)); }
    else if (event.key === "Escape") { setOpen(false); setActive(-1); }
    else if (event.key === "Enter" && showDropdown && active >= 0 && active < items.length) { event.preventDefault(); chooseSuggestion(items[active]); }
  }

  const optionId = (index: number) => `${listboxId}-option-${index}`;

  return <div ref={wrapRef} className="bn-section-search-wrap">
    <form className={`bn-section-search bn-section-search--${variant}`} onSubmit={(event) => { event.preventDefault(); search(draft); }} aria-label="Search companies">
      <label className="bn-section-search-query" htmlFor={queryId}><SearchIcon /><span className="sr-only">Company or service</span><input id={queryId} value={draft} onChange={(event) => { setDraft(event.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={handleQueryKeyDown} placeholder="Search companies, products or services" role="combobox" aria-expanded={showDropdown} aria-controls={listboxId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? optionId(active) : undefined} autoComplete="off" /></label>
      <label className="bn-section-search-location" htmlFor={cityId}><LocationIcon /><span className="sr-only">Company location</span><select id={cityId} value={city} onChange={(event) => setCity(event.target.value)}><option value={PAN_INDIA_LABEL}>{PAN_INDIA_LABEL}</option>{ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button className="bn-section-search-submit" type="submit"><span>{variant === "compact" ? "Search" : "Search companies"}</span><ArrowIcon /></button>
    </form>
    {showDropdown && <div id={listboxId} role="listbox" aria-label="Search suggestions" className="card bn-section-search-dropdown">
      {items.some((item) => item.kind === "category") && <div className="bn-section-search-dropdown-label"><TagIcon /> Matching categories</div>}
      {items.map((item, index) => item.kind === "category" && <button key={`category-${item.slug}`} id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt ${index === active ? "is-active" : ""}`}>{item.label}</button>)}
      {items.some((item) => item.kind === "company") && <div className="bn-section-search-dropdown-label"><BuildingIcon /> Matching companies</div>}
      {items.map((item, index) => item.kind === "company" && <button key={`company-${item.slug || item.label}`} id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt ${index === active ? "is-active" : ""}`}>{item.label}{item.city ? ` · ${item.city}` : ""}</button>)}
      {items.some((item) => item.kind === "listing") && <div className="bn-section-search-dropdown-label"><BoxIcon /> Matching products &amp; services</div>}
      {items.map((item, index) => item.kind === "listing" && <button key={`listing-${item.id}`} id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt ${index === active ? "is-active" : ""}`}>{item.label}{item.seller ? ` · ${item.seller}` : ""}</button>)}
      {suggestionsLoading && <div className="bn-section-search-dropdown-loading" role="status" aria-live="polite">Searching companies &amp; products…</div>}
      {items.map((item, index) => item.kind === "search" && <button key="search-all" id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt is-search ${index === active ? "is-active" : ""}`}><SearchIcon /> <span>Search for “{draft.trim()}”</span></button>)}
    </div>}
  </div>;
}

export function DirectoryMobileSearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => {
      const input = dialogRef.current?.querySelector<HTMLInputElement>("input");
      (input || closeRef.current)?.focus();
    });
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="bn-search-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="bn-search-drawer" role="dialog" aria-modal="true" aria-labelledby="directory-search-drawer-title">
      <header><div><span>Keep exploring</span><h2 id="directory-search-drawer-title">Search companies</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close search"><CloseIcon /></button></header>
      <DirectorySectionSearch variant="drawer" onSubmitted={onClose} />
    </section>
  </div>;
}

export function DirectoryDockedSearch() {
  const { query, city } = useSearchDock();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const summary = query.trim() || "Search companies";
  return <>
    <div className="bn-header-search" data-section="directory">
      <div className="bn-header-search-desktop"><DirectorySectionSearch variant="compact" /><button type="button" className="bn-header-search-filters" onClick={() => setDrawerOpen(true)} aria-label={`Change location: ${city}`}><LocationIcon /><span>{city}</span></button></div>
      <button type="button" className="bn-header-search-mobile" onClick={() => setDrawerOpen(true)} aria-label={`Edit ${summary}, ${city}`}><SearchIcon /><span><strong>{summary}</strong><small>{city}</small></span><ArrowIcon /></button>
    </div>
    <DirectoryMobileSearchDrawer open={drawerOpen} onClose={closeDrawer} />
  </>;
}

export function RecruitmentSectionSearch({ variant = "hero", onSubmitted }: { variant?: DirectorySearchVariant; onSubmitted?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryId = useId();
  const cityId = useId();
  const workplaceId = useId();
  const listboxId = useId();
  const { roleQuery, setRoleQuery, roleCity, setRoleCity, roleWorkplace, setRoleWorkplace, markSearchNav } = useSearchDock();
  const [draft, setDraft] = useState(roleQuery);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [matchedJobs, setMatchedJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const term = draft.trim().toLowerCase();

  useEffect(() => { setDraft(roleQuery); }, [pathname, roleQuery]);
  useEffect(() => { getJobFunctions().then(setJobFunctions).catch(() => setJobFunctions([])); }, []);

  useEffect(() => {
    if (!term) { setMatchedJobs([]); setSuggestionsLoading(false); return; }
    const requestId = ++requestIdRef.current;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      Promise.allSettled([getJobs({ q: term, limit: 8 }), getJobs({ company: term, limit: 8 })])
        .then(([roleResult, companyResult]) => {
          if (requestId !== requestIdRef.current) return;
          const combined = [
            ...(roleResult.status === "fulfilled" ? roleResult.value.jobs : []),
            ...(companyResult.status === "fulfilled" ? companyResult.value.jobs : []),
          ];
          setMatchedJobs(Array.from(new Map(combined.map((job) => [job.id, job])).values()));
        })
        .finally(() => { if (requestId === requestIdRef.current) setSuggestionsLoading(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const items = useMemo<RoleSuggestion[]>(() => {
    if (!term) return [];
    const functions = jobFunctions.filter((item) => item.name.toLowerCase().includes(term)).slice(0, 3).map((item) => ({ kind: "function" as const, label: item.name, slug: item.slug }));
    const roles = matchedJobs.filter((job) => job.title.toLowerCase().includes(term)).slice(0, 4).map((job) => ({ kind: "job" as const, label: job.title, jobId: job.id, company: job.employer?.companyName }));
    const seen = new Set<string>();
    const companies: RoleSuggestion[] = [];
    for (const job of matchedJobs) {
      const name = job.employer?.companyName;
      if (!name || !name.toLowerCase().includes(term) || seen.has(name)) continue;
      seen.add(name);
      companies.push({ kind: "company", label: name, slug: job.employer?.slug || null });
      if (companies.length >= 3) break;
    }
    return [...functions, ...roles, ...companies];
  }, [jobFunctions, matchedJobs, term]);
  const showDropdown = open && (items.length > 0 || suggestionsLoading);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!wrapRef.current?.contains(event.target as Node)) { setOpen(false); setActive(-1); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function search(text: string) {
    const committed = text.trim();
    setOpen(false);
    setActive(-1);
    setRoleQuery(committed);
    const params = new URLSearchParams();
    if (committed) params.set("q", committed);
    if (roleCity) params.set("city", roleCity);
    if (roleWorkplace !== "All workplaces") params.set("workplace", roleWorkplace);
    markSearchNav();
    onSubmitted?.();
    router.push(`/recruitment/jobs${params.size ? `?${params.toString()}` : ""}`);
  }

  function chooseSuggestion(item: RoleSuggestion) {
    setOpen(false);
    setActive(-1);
    markSearchNav();
    onSubmitted?.();
    if (item.kind === "function") { setDraft(item.label); setRoleQuery(item.label); router.push(`/recruitment/jobs?jobFunction=${encodeURIComponent(item.slug)}`); }
    else if (item.kind === "job") { setDraft(""); setRoleQuery(""); router.push(`/job/${item.jobId}`); }
    else if (item.slug) { setDraft(""); setRoleQuery(""); router.push(`/employer/${item.slug}`); }
    else search(item.label);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) setOpen(true); else setActive((index) => Math.min(index + 1, items.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, -1)); }
    else if (event.key === "Escape") { setOpen(false); setActive(-1); }
    else if (event.key === "Enter" && showDropdown && active >= 0 && active < items.length) { event.preventDefault(); chooseSuggestion(items[active]); }
  }

  const optionId = (index: number) => `${listboxId}-option-${index}`;

  return <div ref={wrapRef} className="bn-section-search-wrap">
    <form className={`bn-section-search bn-section-search--${variant} bn-section-search--recruitment`} onSubmit={(event) => { event.preventDefault(); search(draft); }} aria-label="Search jobs">
      <label className="bn-section-search-query" htmlFor={queryId}><SearchIcon /><span className="sr-only">Role, skill or company</span><input id={queryId} value={draft} onChange={(event) => { setDraft(event.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={handleQueryKeyDown} placeholder="Role, skill, or company" role="combobox" aria-expanded={showDropdown} aria-controls={listboxId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? optionId(active) : undefined} autoComplete="off" /></label>
      <label className="bn-section-search-location" htmlFor={cityId}><LocationIcon /><span className="sr-only">Job location</span><select id={cityId} value={roleCity} onChange={(event) => setRoleCity(event.target.value)}><option value="">All locations</option>{ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="bn-section-search-workplace" htmlFor={workplaceId}><span className="sr-only">Workplace preference</span><select id={workplaceId} value={roleWorkplace} onChange={(event) => setRoleWorkplace(event.target.value)}>{["All workplaces","On-site","Hybrid","Remote"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="bn-section-search-submit" type="submit"><span>{variant === "compact" ? "Search" : "Search jobs"}</span><ArrowIcon /></button>
    </form>
    {showDropdown && <div id={listboxId} role="listbox" aria-label="Search suggestions" className="card bn-section-search-dropdown">
      {items.some((item) => item.kind === "function") && <div className="bn-section-search-dropdown-label"><TagIcon /> Matching categories</div>}
      {items.map((item, index) => item.kind === "function" && <button key={`function-${item.slug}`} id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt ${index === active ? "is-active" : ""}`}>{item.label}</button>)}
      {items.some((item) => item.kind === "job") && <div className="bn-section-search-dropdown-label"><BriefcaseIcon /> Matching roles</div>}
      {items.map((item, index) => item.kind === "job" && <button key={`job-${item.jobId}`} id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt ${index === active ? "is-active" : ""}`}>{item.label}{item.company ? ` · ${item.company}` : ""}</button>)}
      {items.some((item) => item.kind === "company") && <div className="bn-section-search-dropdown-label"><BuildingIcon /> Matching companies</div>}
      {items.map((item, index) => item.kind === "company" && <button key={`company-${item.label}`} id={optionId(index)} role="option" aria-selected={index === active} type="button" onMouseEnter={() => setActive(index)} onClick={() => chooseSuggestion(item)} className={`bn-section-search-opt ${index === active ? "is-active" : ""}`}>{item.label}</button>)}
      {suggestionsLoading && <div className="bn-section-search-dropdown-loading" role="status" aria-live="polite">Searching roles &amp; companies…</div>}
    </div>}
  </div>;
}

function RecruitmentMobileSearchDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])'));
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); window.requestAnimationFrame(() => previousFocusRef.current?.focus()); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="bn-search-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="bn-search-drawer" role="dialog" aria-modal="true" aria-labelledby="recruitment-search-drawer-title"><header><div><span>Keep exploring</span><h2 id="recruitment-search-drawer-title">Search jobs</h2></div><button type="button" onClick={onClose} aria-label="Close search"><CloseIcon /></button></header><RecruitmentSectionSearch variant="drawer" onSubmitted={onClose} /></section></div>;
}

export function RecruitmentDockedSearch() {
  const { roleQuery, roleCity, roleWorkplace } = useSearchDock();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const summary = roleQuery.trim() || "Search jobs";
  const filters = `${roleCity || "All locations"} · ${roleWorkplace}`;
  return <><div className="bn-header-search" data-section="recruitment"><div className="bn-header-search-desktop"><RecruitmentSectionSearch variant="compact" /><button type="button" className="bn-header-search-filters" onClick={() => setDrawerOpen(true)} aria-label={`Change job filters: ${filters}`}><LocationIcon /><span>{filters}</span></button></div><button type="button" className="bn-header-search-mobile" onClick={() => setDrawerOpen(true)} aria-label={`Edit ${summary}, ${filters}`}><SearchIcon /><span><strong>{summary}</strong><small>{filters}</small></span><ArrowIcon /></button></div><RecruitmentMobileSearchDrawer open={drawerOpen} onClose={closeDrawer} /></>;
}
