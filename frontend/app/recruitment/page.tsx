"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import StoryRail from "@/components/StoryRail";
import UpdateFeature from "@/components/evidence/UpdateFeature";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import DecisionJourney from "@/components/evidence/DecisionJourney";
import RoleContextPreview from "@/components/recruitment/RoleContextPreview";
import { RecruitmentSectionSearch } from "@/components/SectionSearchDock";
import { getBlogs, getJobFunctions, getJobs, getStories } from "@/lib/api";
import { useSearchDock } from "@/lib/searchDock";
import { closingContext, formatSalary, jobFreshness, jobLocation, rolePreviewModel } from "@/lib/recruitmentDesign";
import { resolvePublicUpdates, type EvidenceAsset } from "@/lib/livingEvidence";
import type { Blog, Job, JobFunction, StoryGroup } from "@/lib/types";

const fallbackFamilies = [
  { name: "Technology & Product", outcome: "Build digital products and technology solutions", body: "Engineering, software, product, data, and design roles shaping modern digital products.", slug: "technology", media: "/seed-media/company/company-2.jpg" },
  { name: "Sales & Growth", outcome: "Help growing businesses reach the right customers", body: "Sales, business development, partnerships, account management, and revenue-focused roles.", slug: "sales", media: "/seed-media/people/person-1.jpg" },
  { name: "Operations & Supply Chain", outcome: "Keep business processes moving efficiently", body: "Operations, procurement, logistics, fulfilment, and supply-chain roles across growing teams.", slug: "operations", media: "/seed-media/work/work-4.jpg" },
  { name: "Finance & Risk", outcome: "Support responsible business management", body: "Accounting, finance, audit, compliance, planning, and reporting roles.", slug: "finance", media: "/seed-media/work/work-5.jpg" },
  { name: "Marketing & Communications", outcome: "Build a stronger market presence", body: "Brand, digital marketing, content, communications, advertising, and creative roles.", slug: "marketing", media: "/seed-media/work/work-1.jpg" },
  { name: "People & Business Support", outcome: "Help teams and workplaces run effectively", body: "Human resources, recruitment, administration, customer support, and workplace operations roles.", slug: "people", media: "/seed-media/company/company-6.jpg" },
];

function roleFamilyContent(slug: string, name: string) {
  const value = `${slug} ${name}`.toLowerCase();
  if (/(sales|business-development|growth|account)/.test(value)) return fallbackFamilies[1];
  if (/(operations|supply|procurement|logistics|fulfil)/.test(value)) return fallbackFamilies[2];
  if (/(finance|accounting|audit|risk|compliance)/.test(value)) return fallbackFamilies[3];
  if (/(marketing|communications|advertising|content|brand)/.test(value)) return fallbackFamilies[4];
  if (/(people|human-resources|customer-support|administration|hr)/.test(value)) return fallbackFamilies[5];
  return fallbackFamilies[0];
}

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
  const families = jobFunctions.length ? jobFunctions.slice(0, 6).map((item) => {
    const content = roleFamilyContent(item.slug, item.name);
    return { name: item.name, outcome: content.outcome, body: content.body, slug: item.slug, media: content.media };
  }) : fallbackFamilies;
  const activeFamily = families[activeFamilyIndex] || families[0];
  const updates = useMemo(() => resolvePublicUpdates({ context: "recruitment", stories, blogs, allowPrototype }), [stories, blogs, allowPrototype]);
  const activeMedia: EvidenceAsset = { src: activeFamily.media, alt: `${activeFamily.name} workplace context`, kind: "workplace", source: "prototype", attribution: "Prototype workplace media" };
  function exampleSearch(query: string) { setRoleQuery(query); markSearchNav(); router.push(`/recruitment/jobs?q=${encodeURIComponent(query)}`); }

  return <div className="le-page counter-recruitment-page">
    <section className="le-hero" aria-labelledby="recruitment-title"><div className="le-shell">
      <h1 id="recruitment-title">Find the right people. Build the right team.</h1>
      <p>Bharat Navya brings hiring and business presence together, helping companies present opportunities while professionals find roles aligned with their skills, experience, and career goals.</p>
      <div ref={searchAnchorRef} className="le-hero-search is-recruitment" aria-hidden={docked || undefined} onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}><RecruitmentSectionSearch /></div>
      <div className="le-examples"><span>Popular searches</span>{["Operations jobs in Ahmedabad","Remote product design roles","Entry-level sales jobs"].map((item) => <button type="button" key={item} onClick={() => exampleSearch(item)}>{item}</button>)}</div>
    </div></section>

    <section className="le-shell counter-status-promotion-grid" aria-label="Hiring statuses and sponsored employer">
      <StoryRail
        groups={stories}
        className="counter-story-rail"
        heading={<div className="counter-story-rail-head"><strong>Hiring statuses</strong><span>Recent workplace and hiring updates, available for 24 hours</span></div>}
        emptyState={<p>No active hiring statuses right now. New 24-hour workplace updates will appear here.</p>}
      />
      <div className="counter-status-promotion">
        <ApiAdvertisingSlot placement="recruitment_home" kind="native" context="Boosted employer · Recruitment" summary="A clearly labelled employer or recruiter placement, kept separate from hiring context and organic role ranking." action="View employer" compact />
      </div>
    </section>

    <section className="le-section" aria-labelledby="role-families-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="role-families-title">Find roles by the work you want to pursue.</h2></div><p>Role families open the jobs workbench directly. Workplace evidence changes with the family you inspect.</p></header><div className="le-index-showcase"><div className="le-index">{families.map((family, index) => <Link href={`/recruitment/jobs?jobFunction=${encodeURIComponent(family.slug)}`} className={index === activeFamilyIndex ? "is-active" : undefined} key={family.name} onMouseEnter={() => setActiveFamilyIndex(index)} onFocus={() => setActiveFamilyIndex(index)}><PathIcon /><span><strong>{family.name}</strong><small>{family.outcome}</small></span><Arrow /></Link>)}</div><aside className="le-index-preview"><EvidenceMedia key={activeFamily.name} asset={activeMedia} ratio="wide" /><div><span className="le-update-context">Role family</span><h3>{activeFamily.name}</h3><p>{activeFamily.body}</p><Link href={`/recruitment/jobs?jobFunction=${encodeURIComponent(activeFamily.slug)}`}>Browse this role family →</Link></div></aside></div><div className="recruitment-shortcuts">{[["Start your career","Entry-level and internship roles","experienceLevel=entry"],["Remote roles","Work-from-anywhere opportunities","workplace=Remote"],["Salary-transparent","Roles with a visible pay band","salary=disclosed"]].map(([title,body,query]) => <Link href={`/recruitment/jobs?${query}`} key={title}><strong>{title}</strong><small>{body}</small></Link>)}</div></div></section>

    <section className="le-section is-tinted" aria-labelledby="fresh-roles-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="fresh-roles-title">Your next career move starts with the right role.</h2><p>Explore positions from companies building their teams across different industries and functions.</p></div><Link className="le-button" href="/recruitment/jobs">Browse all jobs</Link></header><div className="le-role-showcase"><div className="le-role-list">{loading ? [1,2,3].map((item) => <div className="recruitment-skeleton" key={item} />) : freshJobs.map((job) => <Link href={`/job/${job.id}`} className={`le-evidence-record ${job.id === selectedJob?.id ? "is-selected" : ""}`} key={job.id} onMouseEnter={() => setSelectedJobId(job.id)} onFocus={() => setSelectedJobId(job.id)}><Avatar src={job.employer?.logo || undefined} name={job.employer?.companyName || "Company"} size={48} /><span><small>{job.employer?.isVerified ? "Verified employer" : "Employer profile"}</small><strong>{job.title}</strong><span>{job.employer?.companyName || "Company identity pending"} · {jobLocation(job)}</span><p>{formatSalary(job)} · {jobFreshness(job.postedAt)} · {closingContext(job.expiresAt)}</p></span><b aria-hidden>→</b></Link>)}{!loading && freshJobs.length === 0 && <div className="le-empty">Open roles are temporarily unavailable. Search and filters remain ready.</div>}</div><RoleContextPreview model={selectedJob ? rolePreviewModel(selectedJob) : undefined} /></div></div></section>

    <section className="le-section" aria-labelledby="hiring-companies-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="hiring-companies-title">Explore the companies behind the roles.</h2></div><p>Go beyond the job title and see the companies, teams, and workplace context behind opportunities on Bharat Navya.</p></header><div className="le-company-media-grid">{hiringCompanies.map((company, index) => <Link className="le-company-tile" href={company.slug ? `/employer/${company.slug}` : "/recruitment/jobs"} key={company.name}><EvidenceMedia asset={{ src: `/seed-media/company/company-${index + 1}.jpg`, alt: `Workplace at ${company.name}`, kind: "workplace", source: "prototype", attribution: "Prototype workplace media" }} ratio="wide" /><div><Avatar src={company.logo || undefined} name={company.name} size={44} /><span><strong>{company.name}</strong><small>{company.location} · {company.verified ? "Verified employer" : "Employer profile"}</small></span><b>{company.count} role{company.count === 1 ? "" : "s"}</b></div></Link>)}{!loading && hiringCompanies.length === 0 && <div className="le-empty">Company information will grow as employers build their presence on the platform.</div>}</div></div></section>

    <DecisionJourney
      id="application-journey-title"
      title="Where applications lead to career moves."
      context="recruitment"
      steps={[
        { label: "Inspect", detail: "Review the role, company, workplace, requirements, and other details before deciding to apply." },
        { label: "Apply", detail: "Submit your application with the information and experience relevant to the role." },
        { label: "Follow", detail: "Track your application status and stay informed as the hiring process progresses." },
        { label: "Close", detail: "Reach a clear hiring outcome, whether that means joining the team or continuing your search." },
      ]}
    />

    <section ref={updatesAnchorRef} className="le-section" aria-labelledby="hiring-updates-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="hiring-updates-title">Explore the role before you apply.</h2></div><p>Use workplace updates and employer guidance to understand more than the job title.</p><Link className="le-button" href="/recruitment/blog">View career guides</Link></header>{updates.length ? <UpdateFeature updates={updates} title="Hiring updates and insights" /> : <div className="le-empty">Recruiter updates and workplace media will appear here when published.</div>}</div></section>

    <section className="le-closing"><div className="le-shell"><div><h2>Present your potential. Find the right people.</h2><p>Build your professional presence with your skills and experience, or create structured job listings that give candidates a clearer view of the opportunity.</p></div><div className="le-closing-actions"><Link className="le-button is-primary" href="/profile">Build applicant profile</Link><Link className="le-button" href="/post-job">Post a job</Link></div></div></section>
  </div>;
}
