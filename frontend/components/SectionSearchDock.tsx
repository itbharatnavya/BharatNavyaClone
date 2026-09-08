"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_CITIES, PAN_INDIA_LABEL } from "@/lib/indiaGeo";
import { useSearchDock } from "@/lib/searchDock";

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

export type DirectorySearchVariant = "hero" | "compact" | "drawer";

export function DirectorySectionSearch({ variant = "hero", onSubmitted }: { variant?: DirectorySearchVariant; onSubmitted?: () => void }) {
  const router = useRouter();
  const queryId = useId();
  const cityId = useId();
  const { query, setQuery, city, setCity, markSearchNav } = useSearchDock();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city && city !== PAN_INDIA_LABEL) params.set("city", city);
    markSearchNav();
    onSubmitted?.();
    router.push(`/search${params.size ? `?${params.toString()}` : ""}`);
  }

  return <form className={`bn-section-search bn-section-search--${variant}`} onSubmit={submit} aria-label="Search companies">
    <label className="bn-section-search-query" htmlFor={queryId}>
      <SearchIcon />
      <span className="sr-only">Company or service</span>
      <input id={queryId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What company or support do you need?" autoComplete="off" />
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
  </form>;
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
  const queryId = useId();
  const cityId = useId();
  const workplaceId = useId();
  const { roleQuery, setRoleQuery, roleCity, setRoleCity, roleWorkplace, setRoleWorkplace, markSearchNav } = useSearchDock();
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (roleQuery.trim()) params.set("q", roleQuery.trim());
    if (roleCity) params.set("city", roleCity);
    if (roleWorkplace !== "All workplaces") params.set("workplace", roleWorkplace);
    markSearchNav();
    onSubmitted?.();
    router.push(`/recruitment/jobs${params.size ? `?${params.toString()}` : ""}`);
  }
  return <form className={`bn-section-search bn-section-search--${variant} bn-section-search--recruitment`} onSubmit={submit} aria-label="Search jobs">
    <label className="bn-section-search-query" htmlFor={queryId}><SearchIcon /><span className="sr-only">Role, skill or company</span><input id={queryId} value={roleQuery} onChange={(event) => setRoleQuery(event.target.value)} placeholder="Role, skill, or company" autoComplete="off" /></label>
    <label className="bn-section-search-location" htmlFor={cityId}><LocationIcon /><span className="sr-only">Job location</span><select id={cityId} value={roleCity} onChange={(event) => setRoleCity(event.target.value)}><option value="">All locations</option>{ALL_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <label className="bn-section-search-workplace" htmlFor={workplaceId}><span className="sr-only">Workplace preference</span><select id={workplaceId} value={roleWorkplace} onChange={(event) => setRoleWorkplace(event.target.value)}>{["All workplaces","On-site","Hybrid","Remote"].map((item) => <option key={item}>{item}</option>)}</select></label>
    <button className="bn-section-search-submit" type="submit"><span>{variant === "compact" ? "Search" : "Search jobs"}</span><ArrowIcon /></button>
  </form>;
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
