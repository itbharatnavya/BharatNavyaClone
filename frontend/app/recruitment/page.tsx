"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import StoryRail from "@/components/StoryRail";
import UpdateFeature from "@/components/evidence/UpdateFeature";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import AdvertisingSlot from "@/components/evidence/AdvertisingSlot";
import DecisionJourney from "@/components/evidence/DecisionJourney";
import RoleContextPreview from "@/components/recruitment/RoleContextPreview";
import { RecruitmentSectionSearch } from "@/components/SectionSearchDock";
import { getBlogs, getJobFunctions, getJobs, getStories } from "@/lib/api";
import { useSearchDock } from "@/lib/searchDock";
import { closingContext, formatSalary, jobFreshness, jobLocation, rolePreviewModel } from "@/lib/recruitmentDesign";
import { resolvePublicUpdates, type EvidenceAsset } from "@/lib/livingEvidence";
import type { Blog, Job, JobFunction, StoryGroup } from "@/lib/types";

const fallbackFamilies = [
  { name: "Technology and Product", outcome: "Engineering, product, data and design", slug: "technology", media: "/seed-media/company/company-2.jpg" },
  { name: "Sales and Business Development", outcome: "Revenue, partnerships and customer growth", slug: "sales", media: "/seed-media/people/person-1.jpg" },
  { name: "Operations and Supply Chain", outcome: "Keep delivery and fulfilment moving", slug: "operations", media: "/seed-media/work/work-4.jpg" },
  { name: "Finance and Compliance", outcome: "Accounting, planning, reporting and controls", slug: "finance", media: "/seed-media/work/work-5.jpg" },
  { name: "Marketing and Creative", outcome: "Brand, performance, content and communication", slug: "marketing", media: "/seed-media/work/work-1.jpg" },
  { name: "People and Administration", outcome: "Hiring, culture, support and workplace systems", slug: "people", media: "/seed-media/company/company-6.jpg" },
];

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function PathIcon() { return <svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 16h8M9 12h6M10 8h4"/></svg>; }

export default function RecruitmentPage() {
  const router = useRouter();
  const { docked, setProgress, setRoleQuery, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const updatesAnchorRef = useRef<HTMLElement>(null);
  const updatesRequestedRef = useRef(false);
  const heroFocusedRef = useRef(false);
  const pendingDockRef = useRef<boolean | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);
  const allowPrototype = process.env.NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW === "true";

  useEffect(() => { getStories("employer").then(setStories).catch(() => setStories([])); }, []);
  useEffect(() => { Promise.allSettled([getJobs({ limit: 18 }), getJobFunctions()]).then(([jobResult, functionResult]) => { if (jobResult.status === "fulfilled") { setJobs(jobResult.value.jobs); setSelectedJobId(jobResult.value.jobs[0]?.id || null); } if (functionResult.status === "fulfilled") setJobFunctions(functionResult.value.filter((item) => item.isActive)); setLoading(false); }); }, []);
  useEffect(() => {
    const anchor = updatesAnchorRef.current;
    if (!anchor || updatesRequestedRef.current) return;
    const loadUpdates = () => {
      if (updatesRequestedRef.current) return;
      updatesRequestedRef.current = true;
      getBlogs({ authorType: "employer" }).then(setBlogs).catch(() => setBlogs([]));
    };
    if (typeof IntersectionObserver === "undefined") { loadUpdates(); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { loadUpdates(); observer.disconnect(); } }, { rootMargin: "320px 0px" });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { const shouldDock = !entry.isIntersecting && entry.boundingClientRect.bottom <= 72; if (heroFocusedRef.current && shouldDock) { pendingDockRef.current = true; return; } pendingDockRef.current = null; setProgress(shouldDock ? 1 : 0); }, { threshold: 0.08, rootMargin: "-72px 0px 0px 0px" });
    observer.observe(anchor);
    return () => { observer.disconnect(); setProgress(0); };
  }, [setProgress]);
  useEffect(() => {
    searchAnchorRef.current?.toggleAttribute("inert", docked);
  }, [docked]);

  const freshJobs = jobs.slice(0, 5);
  const selectedJob = freshJobs.find((job) => job.id === selectedJobId) || freshJobs[0];
  const hiringCompanies = useMemo(() => {
    const map = new Map<string, { name: string; slug: string | null; logo: string | null; location: string; verified: boolean; count: number }>();
    for (const job of jobs) { if (!job.employer) continue; const item = map.get(job.employer.id); if (item) item.count += 1; else map.set(job.employer.id, { name: job.employer.companyName || "Company", slug: job.employer.slug, logo: job.employer.logo, location: [job.employer.city, job.employer.state].filter(Boolean).join(", ") || "India", verified: job.employer.isVerified, count: 1 }); }
    return Array.from(map.values()).slice(0, 3);
  }, [jobs]);
  const families = jobFunctions.length ? jobFunctions.slice(0, 6).map((item, index) => ({ name: item.name, outcome: "Browse current roles in this family", slug: item.slug, media: fallbackFamilies[index % fallbackFamilies.length].media })) : fallbackFamilies;
  const activeFamily = families[activeFamilyIndex] || families[0];
  const updates = useMemo(() => resolvePublicUpdates({ context: "recruitment", stories, blogs, allowPrototype }), [stories, blogs, allowPrototype]);
  const activeMedia: EvidenceAsset = { src: activeFamily.media, alt: `${activeFamily.name} workplace context`, kind: "workplace", source: "prototype", attribution: "Prototype workplace media" };
  function exampleSearch(query: string) { setRoleQuery(query); markSearchNav(); router.push(`/recruitment/jobs?q=${encodeURIComponent(query)}`); }

  return <div className="le-page counter-recruitment-page">
    <section className="le-hero" aria-labelledby="recruitment-title"><div className="le-hero-decor" aria-hidden="true" /><div className="le-shell">
      <h1 id="recruitment-title">Find work with the context to decide.</h1>
      <p>Explore startup and SME roles with pay, company identity, freshness and hiring context visible before you apply.</p>
      <div ref={searchAnchorRef} className="le-hero-search is-recruitment" inert={docked ? true : undefined} aria-hidden={docked || undefined} onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}><RecruitmentSectionSearch /></div>
      <div className="le-examples"><span>Popular searches</span>{["Operations jobs in Ahmedabad","Remote product design roles","Entry-level sales jobs"].map((item) => <button type="button" key={item} onClick={() => exampleSearch(item)}>{item}</button>)}</div>
    </div></section>

    <div className="le-shell">
      <StoryRail
        groups={stories}
        className="counter-story-rail"
        heading={<div className="counter-story-rail-head"><strong>Hiring statuses</strong><span>Recent workplace and hiring updates, available for 24 hours</span></div>}
      />
    </div>

    <section className="le-trust-ledger" aria-label="Job trust contract"><div className="le-shell">{[["01","Salary context","A visible band—or an honest absence."],["02","Hiring identity","Named company and recruiter when provided."],["03","Freshness and closure","Published, closing and final outcomes stay explicit."]].map(([n,title,body]) => <article key={n}><b>{n}</b><span><strong>{title}</strong><small>{body}</small></span></article>)}</div></section>

    <section className="le-section" aria-labelledby="role-families-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="role-families-title">Browse by the work you want to do.</h2></div><p>Role families open the jobs workbench directly. Workplace evidence changes with the family you inspect.</p></header><div className="le-index-showcase"><div className="le-index">{families.map((family, index) => <Link href={`/recruitment/jobs?jobFunction=${encodeURIComponent(family.slug)}`} className={index === activeFamilyIndex ? "is-active" : undefined} key={family.name} onMouseEnter={() => setActiveFamilyIndex(index)} onFocus={() => setActiveFamilyIndex(index)}><PathIcon /><span><strong>{family.name}</strong><small>{family.outcome}</small></span><Arrow /></Link>)}</div><aside className="le-index-preview"><EvidenceMedia key={activeFamily.name} asset={activeMedia} ratio="wide" /><div><span className="le-update-context">Role family</span><h3>{activeFamily.name}</h3><p>{activeFamily.outcome}. Salary, workplace, freshness and company identity remain visible in results.</p><Link href={`/recruitment/jobs?jobFunction=${encodeURIComponent(activeFamily.slug)}`}>Browse this role family →</Link></div></aside></div><div className="recruitment-shortcuts">{[["Start your career","Entry-level and internship roles","experienceLevel=entry"],["Remote roles","Work-from-anywhere opportunities","workplace=Remote"],["Salary-transparent","Roles with a visible pay band","salary=disclosed"]].map(([title,body,query]) => <Link href={`/recruitment/jobs?${query}`} key={title}><strong>{title}</strong><small>{body}</small></Link>)}</div></div></section>

    <section className="le-section is-tinted" aria-labelledby="fresh-roles-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="fresh-roles-title">Fresh roles, with decision context.</h2></div><Link className="le-button" href="/recruitment/jobs">Browse all jobs</Link></header><div className="le-role-showcase"><div className="le-role-list">{loading ? [1,2,3].map((item) => <div className="recruitment-skeleton" key={item} />) : freshJobs.map((job) => <Link href={`/job/${job.id}`} className={`le-evidence-record ${job.id === selectedJob?.id ? "is-selected" : ""}`} key={job.id} onMouseEnter={() => setSelectedJobId(job.id)} onFocus={() => setSelectedJobId(job.id)}><Avatar src={job.employer?.logo || undefined} name={job.employer?.companyName || "Company"} size={48} /><span><small>{job.employer?.isVerified ? "Verified employer" : "Employer profile"}</small><strong>{job.title}</strong><span>{job.employer?.companyName || "Company identity pending"} · {jobLocation(job)}</span><p>{formatSalary(job)} · {jobFreshness(job.postedAt)} · {closingContext(job.expiresAt)}</p></span><b aria-hidden>→</b></Link>)}{!loading && freshJobs.length === 0 && <div className="le-empty">Open roles are temporarily unavailable. Search and filters remain ready.</div>}</div><RoleContextPreview model={selectedJob ? rolePreviewModel(selectedJob) : undefined} /></div></div></section>

    <section className="le-section" aria-labelledby="hiring-companies-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="hiring-companies-title">See the teams behind the openings.</h2></div><p>Company identity and workplace context stay connected to every role.</p></header><div className="le-company-media-grid">{hiringCompanies.map((company, index) => <Link className="le-company-tile" href={company.slug ? `/employer/${company.slug}` : "/recruitment/jobs"} key={company.name}><EvidenceMedia asset={{ src: `/seed-media/company/company-${index + 1}.jpg`, alt: `Workplace at ${company.name}`, kind: "workplace", source: "prototype", attribution: "Prototype workplace media" }} ratio="wide" /><div><Avatar src={company.logo || undefined} name={company.name} size={44} /><span><strong>{company.name}</strong><small>{company.location} · {company.verified ? "Verified employer" : "Employer profile"}</small></span><b>{company.count} role{company.count === 1 ? "" : "s"}</b></div></Link>)}{!loading && hiringCompanies.length === 0 && <div className="le-empty">Hiring-company evidence will appear as employers publish aligned roles.</div>}</div></div></section>

    <AdvertisingSlot kind="native" context="Recruitment promotion" title="Hiring for a growing team? Show candidates the context that matters." summary="Publish a role with clear salary, workplace, process and closure expectations. The placement remains separate from organic role ranking." href="/post-job" action="Post a transparent role" media={{ src: "/seed-media/company/company-5.jpg", alt: "A hiring team discussing an open role", kind: "team", source: "prototype", attribution: "Prototype sponsored creative" }} />

    <DecisionJourney
      id="application-journey-title"
      title="An application path with an outcome."
      context="recruitment"
      steps={[
        { label: "Inspect", detail: "Review pay, company, freshness and process." },
        { label: "Apply", detail: "Answer focused questions and review the submission." },
        { label: "Follow", detail: "See interviews, requests and stage updates." },
        { label: "Close", detail: "Hires, withdrawals and rejections stay explicit." },
      ]}
    />

    <section ref={updatesAnchorRef} className="le-section" aria-labelledby="hiring-updates-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="hiring-updates-title">Know more before you apply.</h2></div><Link className="le-button" href="/recruitment/blog">View career guides</Link></header>{updates.length ? <UpdateFeature updates={updates} title="Hiring updates and guides" /> : <div className="le-empty">Recruiter updates and workplace media will appear here when published.</div>}</div></section>

    <section className="le-closing"><div className="le-shell"><div><h2>Build a complete applicant profile—or start hiring clearly.</h2><p>Keep your experience ready for applications or publish a role with accountable context.</p></div><div className="le-closing-actions"><Link className="le-button is-primary" href="/profile">Build applicant profile</Link><Link className="le-button" href="/post-job">Post a job</Link></div></div></section>
  </div>;
}
