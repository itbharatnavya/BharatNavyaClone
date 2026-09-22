"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Pagination from "@/components/Pagination";
import SearchContextSwitch from "@/components/SearchContextSwitch";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import RoleSearchBar from "@/components/recruitment/RoleSearchBar";
import JobFilters, { type JobFilterState } from "@/components/recruitment/JobFilters";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";
import RoleContextPreview from "@/components/recruitment/RoleContextPreview";
import { getJobFunctions, getJobs } from "@/lib/api";
import { closingContext, formatSalary, jobFreshness, jobLocation, rolePreviewModel } from "@/lib/recruitmentDesign";
import { useSearchDock } from "@/lib/searchDock";
import type { Job, JobFunction, JobsResponse } from "@/lib/types";

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function FilterIcon() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4" /></svg>; }

function ResultRow({ job, selected, expanded, onPreview, onToggle }: { job: Job; selected: boolean; expanded: boolean; onPreview: () => void; onToggle: () => void }) {
  const company = job.employer?.companyName || "Hiring company";
  function handleCardClick(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    onToggle();
  }
  return <article className={`recruitment-result-row ${selected ? "is-selected" : ""}`} onClick={handleCardClick} onMouseEnter={onPreview} onFocusCapture={onPreview}>
    <Avatar src={job.employer?.logo} name={company} size={52} />
    <div className="recruitment-result-main">
      <Link href={`/job/${job.id}`}><h2>{job.title}</h2></Link>
      <div className="recruitment-result-company"><span>{company}</span>{job.employer?.isVerified && <b>✓ Verified employer</b>}</div>
      <div className="recruitment-result-facts"><span>{jobLocation(job)}</span><span><strong>{formatSalary(job)}</strong></span><span>{jobFreshness(job.postedAt)}</span></div>
      {job.skills?.length > 0 && <div className="recruitment-result-skills">{job.skills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div>}
    </div>
    <div className="recruitment-result-side"><small>{closingContext(job.expiresAt)}</small><Link href={`/job/${job.id}`}>View role <Arrow /></Link><button type="button" onClick={onToggle} aria-expanded={expanded}>{expanded ? "Hide context" : "View context"}</button></div>
  </article>;
}

function JobsBrowseInner() {
  const params = useSearchParams();
  const { docked, setProgress, setRoleQuery, setRoleCity, setRoleWorkplace } = useSearchDock();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const initialQuery = params.get("q") || "";
  const initialCity = params.get("city") || "";
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<JobFilterState>({ city: initialCity || undefined, jobFunction: params.get("jobFunction") || undefined, experienceLevel: (params.get("experienceLevel") || undefined) as JobFilterState["experienceLevel"], remote: params.get("workplace")?.toLowerCase() === "remote" || undefined, minSalary: params.get("salary") === "disclosed" ? 1 : Number(params.get("minSalary") || 0) || undefined });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setQuery(initialQuery);
    setFilters({ city: initialCity || undefined, jobFunction: params.get("jobFunction") || undefined, experienceLevel: (params.get("experienceLevel") || undefined) as JobFilterState["experienceLevel"], remote: params.get("workplace")?.toLowerCase() === "remote" || undefined, minSalary: params.get("salary") === "disclosed" ? 1 : Number(params.get("minSalary") || 0) || undefined });
    setRoleQuery(initialQuery);
    setRoleCity(initialCity);
    setRoleWorkplace(params.get("workplace") || "All workplaces");
  }, [initialQuery, initialCity, params, setRoleCity, setRoleQuery, setRoleWorkplace]);
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
  useEffect(() => {
    setRoleCity(filters.city || "");
    setRoleWorkplace(filters.remote ? "Remote" : "All workplaces");
  }, [filters.city, filters.remote, setRoleCity, setRoleWorkplace]);
  useEffect(() => { getJobFunctions().then(setJobFunctions).catch(() => setJobFunctions([])); }, []);
  useEffect(() => {
    let alive = true; setLoading(true); setError(null);
    getJobs({ q: query || undefined, ...filters, page, limit: 10 }).then((result) => { if (!alive) return; setData(result); setSelectedId((current) => result.jobs.some((job) => job.id === current) ? current : result.jobs[0]?.id || null); setExpandedId((current) => result.jobs.some((job) => job.id === current) ? current : null); }).catch((reason) => { if (alive) { setData(null); setError(reason instanceof Error ? reason.message : "Roles could not be loaded."); } }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, filterKey, page, retry]);
  useEffect(() => { setPage(1); }, [query, filterKey]);
  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden"; closeButton.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; previous?.focus(); };
  }, [filtersOpen]);

  const jobs = data?.jobs || [];
  const selectedJob = jobs.find((job) => job.id === selectedId) || jobs[0];
  const preview = useMemo(() => selectedJob ? rolePreviewModel(selectedJob) : undefined, [selectedJob]);
  const filterPanel = <JobFilters value={filters} onChange={setFilters} jobFunctions={jobFunctions} />;
  function changePage(next: number) { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <div className="recruitment-core counter-results-page">
    <header className="recruitment-results-head"><div className="recruitment-core-shell"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Recruitment", href: "/recruitment" }, { label: "Browse roles" }]} /><h1>Roles with the context to decide.</h1><p>Compare transparent job facts alongside the company and workplace behind the role.</p><div ref={searchAnchorRef} className="recruitment-results-search" aria-hidden={docked || undefined}><RoleSearchBar query={query} onQueryChange={(value) => { setQuery(value); setRoleQuery(value); }} city={filters.city || ""} onCityChange={(city) => { setFilters((current) => ({ ...current, city: city || undefined })); setRoleCity(city); }} /></div></div></header>
    <div className="recruitment-core-shell counter-results-stack">
      <SearchContextSwitch destination="directory" query={query} city={filters.city} />
      <ApiAdvertisingSlot compact placement={["recruitment_search", "recruitment_home"]} kind="native" context="Sponsored in role results" summary="A clearly labelled hiring placement that does not alter organic role order or employer verification." action="View opportunity" />
      <div className="recruitment-results-tools"><div className="recruitment-results-count"><strong aria-live="polite">{loading ? "Finding current roles…" : `${data?.total || 0} ${(data?.total || 0) === 1 ? "role" : "roles"}`}</strong><span>Real roles, ordered by current API results</span></div><button className="recruitment-filter-toggle" type="button" onClick={() => setFiltersOpen(true)}><FilterIcon /> Refine roles</button></div>
      <div className="recruitment-results-layout">
        <div className="recruitment-results-filter-rail">
          <aside className="recruitment-results-filters" aria-label="Filter roles">{filterPanel}</aside>
          <div className="recruitment-results-filter-ad">
            <ApiAdvertisingSlot compact placement={["recruitment_search_top", "recruitment_home"]} kind="native" context="Sponsored in Recruitment" summary="A clearly labelled employer or role placement, separate from organic results and filter choices." action="View opportunity" />
          </div>
        </div>
        <section aria-label="Role results"><div className="recruitment-results-list">
          {loading && Array.from({ length: 5 }, (_, index) => <div className="recruitment-skeleton" key={index} />)}
          {!loading && error && <div className="recruitment-state" role="status"><strong>Roles could not be loaded.</strong><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
          {!loading && !error && jobs.map((job) => {
            const expanded = job.id === expandedId;
            return <article className={`recruitment-result-item${expanded ? " is-expanded" : ""}`} key={job.id}>
              <ResultRow job={job} selected={job.id === selectedJob?.id} expanded={expanded} onPreview={() => setSelectedId(job.id)} onToggle={() => { setSelectedId(job.id); setExpandedId((current) => current === job.id ? null : job.id); }} />
              {expanded && <div className="recruitment-inline-preview"><RoleContextPreview model={rolePreviewModel(job)} /></div>}
            </article>;
          })}
          {!loading && !error && jobs.length === 0 && <div className="recruitment-state"><strong>No roles match these filters.</strong><p>Try a broader role, remove a location, or clear the salary range.</p></div>}
        </div>{data && data.totalPages > 1 && <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}><Pagination page={data.page} totalPages={data.totalPages} onChange={changePage} /></div>}</section>
        <div className="recruitment-results-preview"><RoleContextPreview model={preview} /></div>
      </div>
    </div>
    <div className={`recruitment-filter-sheet ${filtersOpen ? "is-open" : ""}`} aria-hidden={!filtersOpen} onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}><div role="dialog" aria-modal="true" aria-label="Filter roles"><header><strong>Refine roles</strong><button ref={closeButton} type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></header>{filterPanel}</div></div>
  </div>;
}

export default function RecruitmentJobsPage() { return <RecruitmentGate><Suspense fallback={<div className="recruitment-core-shell recruitment-detail">Loading roles…</div>}><JobsBrowseInner /></Suspense></RecruitmentGate>; }
