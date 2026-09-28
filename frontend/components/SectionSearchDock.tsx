"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock } from "@/lib/searchDock";
import { getJobFunctions, getJobs, getListings, searchSellers } from "@/lib/api";
import { useCategories, flattenCategories } from "@/lib/catalog";
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

type RoleSuggestion =
  | { kind: "function"; label: string; slug: string }
  | { kind: "job"; label: string; jobId: string; company?: string | null }
  | { kind: "company"; label: string; slug: string | null };

type DirectorySuggestion =
  | { kind: "category"; label: string; slug: string }
  | { kind: "company"; label: string; slug: string | null; city?: string | null }
  | { kind: "listing"; label: string; id: string; seller?: string | null }
  | { kind: "search" };

interface SellerSearchResult { name: string; slug: string | null; city?: string | null }

export type DirectorySearchVariant = "hero" | "compact" | "drawer";

export function DirectorySectionSearch({ variant = "hero", onSubmitted }: { variant?: DirectorySearchVariant; onSubmitted?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryId = useId();
  const cityId = useId();
  const listboxId = useId();
  const { query, setQuery, city, setCity, markSearchNav } = useSearchDock();

  // Local, uncommitted draft — only a genuine search action (submit, or picking a
  // suggestion) ever writes back to the shared `query`. Typing alone never does,
  // so half-typed text can't leak onto another page via an unrelated navigation
  // (e.g. clicking a category tile mid-type) — matches old frontend's
  // DirectorySearchBar (WORKFLOW.md 2026-08-18). Resyncs to the committed query on
  // every route change, or whenever `query` itself changes (e.g. the docked
  // compact copy committing a new value, or Back restoring a prior one) — both
  // this hero instance and the docked compact instance mount at once while
  // docked, each with its own independent draft.
  const [draft, setDraft] = useState(query);
  useEffect(() => { setDraft(query); }, [pathname, query]);

  // Suggestions: same real-data contract as old frontend's DirectorySearchBar
  // (categories filtered client-side from the session-wide catalog + listings
  // fetched from the API, plus a pinned "Search for…" row always last) — just
  // grouped/styled with this new dropdown's chrome instead of the old bar's
  // inline-styled rows. Two more real groups added on top of the old bar's
  // (companies via GET /api/sellers?q=, since this Directory is company-first)
  // and gated closed until 2+ characters, matching the old bar's threshold.
  const { categories: catalogCategories } = useCategories();
  const allCategories = useMemo(() => flattenCategories(catalogCategories), [catalogCategories]);
  const [matchedSellers, setMatchedSellers] = useState<SellerSearchResult[]>([]);
  const [matchedListings, setMatchedListings] = useState<Listing[]>([]);
  const reqIdRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const term = draft.trim().toLowerCase();

  useEffect(() => {
    if (term.length < 2) { setMatchedSellers([]); setMatchedListings([]); setSuggestionsLoading(false); return; }
    const id = ++reqIdRef.current;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      Promise.allSettled([searchSellers({ q: term, limit: 5 }), getListings({ q: term, limit: 5 })]).then(([sellerResult, listingResult]) => {
        if (id !== reqIdRef.current) return;
        setMatchedSellers(sellerResult.status === "fulfilled" ? sellerResult.value.sellers || [] : []);
        setMatchedListings(listingResult.status === "fulfilled" ? listingResult.value.listings || [] : []);
        setSuggestionsLoading(false);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const items: DirectorySuggestion[] = useMemo(() => {
    if (term.length < 2) return [];
    const categories: DirectorySuggestion[] = allCategories
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 5)
      .map((c) => ({ kind: "category", label: c.name, slug: c.slug }));
    const companies: DirectorySuggestion[] = matchedSellers.slice(0, 4).map((s) => ({ kind: "company", label: s.name, slug: s.slug || null, city: s.city }));
    const listings: DirectorySuggestion[] = matchedListings.slice(0, 4).map((l) => ({ kind: "listing", label: l.title, id: l.id, seller: l.seller?.companyName || l.seller?.name || l.sellerName }));
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

  function go(text: string) {
    setOpen(false);
    setActive(-1);
    const trimmed = text.trim();
    setQuery(trimmed);
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (city && city !== PAN_INDIA_LABEL) params.set("city", city);
    markSearchNav();
    onSubmitted?.();
    router.push(`/search${params.size ? `?${params.toString()}` : ""}`);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    go(draft);
  }

  // Picking a suggestion clears the draft (and the shared committed query) rather
  // than leaving the partial typed word behind, since this query is shared with
  // other docked copies of this bar that stay visible after navigating away.
  function selectItem(item: DirectorySuggestion) {
    setOpen(false);
    setActive(-1);
    markSearchNav();
    onSubmitted?.();
    if (item.kind === "category") {
      // /search's own category filter (parseDiscoverySeed → UnifiedListingWorkbench →
      // GET /api/listings?category=) is the live Directory results flow now — the
      // standalone /<slug> category-landing route is a separate, older page.
      setDraft("");
      setQuery("");
      router.push(`/search?category=${encodeURIComponent(item.slug)}`);
    } else if (item.kind === "company") {
      if (item.slug) { setDraft(""); setQuery(""); router.push(`/seller/${item.slug}`); }
      else go(item.label);
    } else if (item.kind === "listing") {
      setDraft("");
      setQuery("");
      router.push(`/listing/${item.id}`);
    } else {
      go(draft);
    }
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

  return <div ref={wrapRef} className="bn-section-search-wrap">
    <form className={`bn-section-search bn-section-search--${variant}`} onSubmit={submit} aria-label="Search companies">
      <label className="bn-section-search-query" htmlFor={queryId}>
        <SearchIcon />
        <span className="sr-only">Company or service</span>
        <input
          id={queryId}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onQueryKeyDown}
          placeholder="Search companies, products or services"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        />
      </label>
      <label className="bn-section-search-location" htmlFor={cityId}>
        <LocationIcon />
        <span className="sr-only">Company location</span>
        <select id={cityId} value={city} onChange={(event) => setCity(event.target.value)}>
          <option value={PAN_INDIA_LABEL}>{PAN_INDIA_LABEL}</option>
          {ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <button className="bn-section-search-submit" type="submit"><span>{variant === "compact" ? "Search" : "Search companies"}</span><ArrowIcon /></button>
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
      {suggestionsLoading && <div className="bn-section-search-dropdown-loading" role="status" aria-live="polite">Searching companies &amp; products…</div>}
      {items.map((item, i) => item.kind !== "search" ? null : (
        <button key="pinned-search" id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><SearchIcon /> Search for &quot;{draft.trim()}&quot;</button>
      ))}
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

  // Local, uncommitted draft — same commit-on-submit pattern as
  // DirectorySectionSearch above, kept entirely on Recruitment's own
  // `roleQuery` field so Directory's and Recruitment's typed text never mix.
  const [draft, setDraft] = useState(roleQuery);
  useEffect(() => { setDraft(roleQuery); }, [pathname, roleQuery]);

  // Suggestions: closed entirely on an empty query — no "popular searches" here,
  // that list was static/curated copy, not real data. Once typing starts, three
  // real groups: matching categories (the job-function catalog, filtered
  // client-side), matching roles and matching companies — both fetched from
  // GET /api/jobs?q= (debounced, same pattern as DirectorySearchBar's
  // getListings), which now folds employer company name into its free-text
  // match, so a company-name query surfaces that employer's roles too.
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  useEffect(() => { getJobFunctions().then(setJobFunctions).catch(() => {}); }, []);

  const [matchedJobs, setMatchedJobs] = useState<Job[]>([]);
  const jobsReqIdRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const term = draft.trim().toLowerCase();

  useEffect(() => {
    if (!term) { setMatchedJobs([]); setSuggestionsLoading(false); return; }
    const id = ++jobsReqIdRef.current;
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      getJobs({ q: term, limit: 8 })
        .then((r) => { if (id === jobsReqIdRef.current) setMatchedJobs(r.jobs || []); })
        .catch(() => { if (id === jobsReqIdRef.current) setMatchedJobs([]); })
        .finally(() => { if (id === jobsReqIdRef.current) setSuggestionsLoading(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [term]);

  const items: RoleSuggestion[] = useMemo(() => {
    if (!term) return [];
    const categories: RoleSuggestion[] = jobFunctions
      .filter((f) => f.name.toLowerCase().includes(term))
      .slice(0, 3)
      .map((f) => ({ kind: "function", label: f.name, slug: f.slug }));
    // Same reasoning as the company filter below: only surface a job as a "role"
    // suggestion when its own title matched the term, not merely because it came
    // back in the same OR-matched batch (e.g. its employer's name matched instead).
    const roles: RoleSuggestion[] = matchedJobs
      .filter((j) => j.title.toLowerCase().includes(term))
      .slice(0, 4)
      .map((j) => ({ kind: "job", label: j.title, jobId: j.id, company: j.employer?.companyName }));
    const seenCompanies = new Set<string>();
    const companies: RoleSuggestion[] = [];
    for (const j of matchedJobs) {
      const name = j.employer?.companyName;
      // The backend OR-matches title/description/jobFunction/company in one pass, so
      // a job can appear here purely because its ROLE matched (e.g. "developer") even
      // when the company name didn't — only surface a company suggestion when the
      // company name itself contains the typed term.
      if (!name || !name.toLowerCase().includes(term) || seenCompanies.has(name)) continue;
      seenCompanies.add(name);
      companies.push({ kind: "company", label: name, slug: j.employer?.slug || null });
      if (companies.length >= 3) break;
    }
    return [...categories, ...roles, ...companies];
  }, [term, jobFunctions, matchedJobs]);
  const showDropdown = open && (items.length > 0 || suggestionsLoading);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) { setOpen(false); setActive(-1); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function go(text: string) {
    setOpen(false);
    setActive(-1);
    const trimmed = text.trim();
    setRoleQuery(trimmed);
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (roleCity) params.set("city", roleCity);
    if (roleWorkplace !== "All workplaces") params.set("workplace", roleWorkplace);
    markSearchNav();
    onSubmitted?.();
    router.push(`/recruitment/jobs${params.size ? `?${params.toString()}` : ""}`);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    go(draft);
  }

  function selectItem(item: RoleSuggestion) {
    setOpen(false);
    setActive(-1);
    markSearchNav();
    onSubmitted?.();
    if (item.kind === "function") {
      // A category pick is a fresh, broad browse — jumps straight to the
      // category rather than carrying the free-text query along.
      setDraft(item.label);
      setRoleQuery(item.label);
      router.push(`/recruitment/jobs?jobFunction=${item.slug}`);
    } else if (item.kind === "job") {
      // A specific role pick goes straight to that role, same as Directory's
      // listing suggestions jumping to /listing/:id.
      setDraft("");
      setRoleQuery("");
      router.push(`/job/${item.jobId}`);
    } else {
      if (item.slug) { setDraft(""); setRoleQuery(""); router.push(`/employer/${item.slug}`); }
      else go(item.label);
    }
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

  return <div ref={wrapRef} className="bn-section-search-wrap">
    <form className={`bn-section-search bn-section-search--${variant} bn-section-search--recruitment`} onSubmit={submit} aria-label="Search jobs">
      <label className="bn-section-search-query" htmlFor={queryId}>
        <SearchIcon />
        <span className="sr-only">Role, skill or company</span>
        <input
          id={queryId}
          value={draft}
          onChange={(event) => { setDraft(event.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onQueryKeyDown}
          placeholder="Role, skill, or company"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        />
      </label>
      <label className="bn-section-search-location" htmlFor={cityId}><LocationIcon /><span className="sr-only">Job location</span><select id={cityId} value={roleCity} onChange={(event) => setRoleCity(event.target.value)}><option value="">All locations</option>{ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="bn-section-search-workplace" htmlFor={workplaceId}><span className="sr-only">Workplace preference</span><select id={workplaceId} value={roleWorkplace} onChange={(event) => setRoleWorkplace(event.target.value)}>{["All workplaces","On-site","Hybrid","Remote"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="bn-section-search-submit" type="submit"><span>{variant === "compact" ? "Search" : "Search jobs"}</span><ArrowIcon /></button>
    </form>
    {showDropdown && <div id={listboxId} role="listbox" aria-label="Search suggestions" className="card bn-section-search-dropdown">
      {items.some((i) => i.kind === "function") && <div className="bn-section-search-dropdown-label"><TagIcon /> Matching categories</div>}
      {items.map((item, i) => item.kind !== "function" ? null : (
        <button key={`f-${item.slug}`} id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`}>{item.label}</button>
      ))}
      {items.some((i) => i.kind === "job") && <div className="bn-section-search-dropdown-label"><BriefcaseIcon /> Matching roles</div>}
      {items.map((item, i) => item.kind !== "job" ? null : (
        <button key={`j-${item.jobId}`} id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`}>{item.label}{item.company ? ` · ${item.company}` : ""}</button>
      ))}
      {items.some((i) => i.kind === "company") && <div className="bn-section-search-dropdown-label"><BuildingIcon /> Matching companies</div>}
      {items.map((item, i) => item.kind !== "company" ? null : (
        <button key={`c-${item.label}`} id={optionId(i)} role="option" aria-selected={i === active} type="button" onMouseEnter={() => setActive(i)} onClick={() => selectItem(item)} className={`bn-section-search-opt ${i === active ? "is-active" : ""}`}>{item.label}</button>
      ))}
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
