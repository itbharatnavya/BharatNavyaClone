"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumbs from "@/components/Breadcrumbs";
import Button from "@/components/Button";
import ContactAuthModal from "@/components/auth/ContactAuthModal";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import ApplyModal from "@/components/recruitment/ApplyModal";
import EvidenceMedia from "@/components/recruitment/EvidenceMedia";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";
import StatusTimeline from "@/components/recruitment/StatusTimeline";
import { getEmployer, getJob, getJobs, getMyApplications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { closingContext, formatSalary, jobFreshness, jobLocation, rolePreviewModel } from "@/lib/recruitmentDesign";
import type { Job } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

function employmentLabel(value: Job["employmentType"]) { return value ? value.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join("-") : "Not provided"; }
function experienceLabel(value: Job["experienceLevel"]) { return value ? `${value[0].toUpperCase()}${value.slice(1)} level` : "Not provided"; }

function CopyList({ title, items, empty = "Not provided" }: { title: string; items?: string[]; empty?: string }) {
  return <section><h2>{title}</h2>{items?.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

function JobDetailInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  usePageTitle(job?.title);
  const [related, setRelated] = useState<Job[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true; setLoading(true); setNotFound(false);
    getJob(id).then(async (loaded) => {
      if (!alive) return; setJob(loaded);
      if (loaded.jobFunction) getJobs({ jobFunction: loaded.jobFunction, limit: 4 }).then((result) => alive && setRelated(result.jobs.filter((item) => item.id !== loaded.id).slice(0, 3))).catch(() => {});
      if (loaded.employer?.slug) getEmployer(loaded.employer.slug).then((result) => alive && setCover(result.employer.coverImage || null)).catch(() => {});
    }).catch(() => alive && setNotFound(true)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);
  useEffect(() => {
    if (!user || !job) return; let alive = true;
    getMyApplications().then((applications) => alive && setAlreadyApplied(applications.some((application) => application.jobId === job.id))).catch(() => {});
    return () => { alive = false; };
  }, [user, job]);

  const preview = useMemo(() => job ? rolePreviewModel(job, cover) : undefined, [job, cover]);
  if (loading) return <div className="recruitment-core recruitment-core-shell recruitment-detail"><div className="recruitment-skeleton" /><div className="recruitment-skeleton" style={{ marginTop: 16, height: 320 }} /></div>;
  if (notFound || !job) return <div className="recruitment-core recruitment-core-shell recruitment-detail recruitment-state"><strong>This role is no longer available.</strong><p>Browse current roles to find another opportunity.</p><Button variant="brand" href="/recruitment/jobs">Browse open roles</Button></div>;

  const company = job.employer?.companyName || "Hiring company";
  const isOwner = user?.id === job.employerId;
  const process = [
    { label: "Application received", detail: "A successful submission is recorded in your applicant dashboard.", state: "complete" as const },
    { label: "Employer review", detail: "Timing and reviewer identity have not been provided.", state: "current" as const },
    { label: "Interview stages", detail: "Not provided by the employer.", state: "pending" as const },
    { label: "Final outcome", detail: "The application should end with a visible hired, rejected, or withdrawn outcome.", state: "pending" as const },
  ];
  function startApply() { if (!user) setAuthOpen(true); else setApplyOpen(true); }

  return <div className="recruitment-core"><div className="recruitment-core-shell recruitment-detail">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Recruitment", href: "/recruitment" }, { label: "Roles", href: "/recruitment/jobs" }, { label: job.title }]} />
    <section className="recruitment-detail-hero is-merged" aria-labelledby="job-title">
      {/* The employer's photo sits under the title card and fades into the navy behind the text
          (same treatment as the Directory hero). Styles: .rd-media in counter-soft-system.css. */}
      <div className="recruitment-detail-title">{preview?.employerCover && <span className="rd-media" aria-hidden>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview.employerCover.src} alt="" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).hidden = true; }} /></span>}<div className="recruitment-detail-identity"><Avatar src={job.employer?.logo} name={company} size={58} /><span>{job.employer?.slug ? <Link href={`/employer/${job.employer.slug}`}>{company}</Link> : <strong>{company}</strong>}<small>{job.employer?.isVerified ? "Verified employer" : "Employer profile"}</small></span></div><h1 id="job-title">{job.title}</h1><div className="recruitment-result-skills">{job.skills.slice(0, 5).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
    </section>
    <dl className="recruitment-role-ledger"><div><dt>Salary</dt><dd>{formatSalary(job, true)}</dd></div><div><dt>Workplace</dt><dd>{jobLocation(job)}</dd></div><div><dt>Posted</dt><dd>{((s) => s.charAt(0).toUpperCase() + s.slice(1))(jobFreshness(job.postedAt).replace(/^Published /, ""))}</dd></div><div><dt>Closing</dt><dd>{closingContext(job.expiresAt)}</dd></div><div><dt>Experience</dt><dd>{experienceLabel(job.experienceLevel)}</dd></div><div><dt>Employment</dt><dd>{employmentLabel(job.employmentType)}</dd></div></dl>
    <div className="recruitment-detail-layout">
      <div className="recruitment-detail-copy">
        <section><h2>About this role</h2><p>{job.description || "The employer has not provided a role description."}</p></section>
        <CopyList title="Responsibilities" items={job.responsibilities} />
        <CopyList title="What the employer is looking for" items={job.requirements} />
        <CopyList title="Benefits" items={job.benefits} />
        <section><h2>Hiring process</h2><p>Recruiter identity and detailed interview stages are not available in the current backend contract.</p><StatusTimeline items={process} /></section>
        {related.length > 0 && <section><h2>Similar roles</h2><div className="recruitment-results-list">{related.map((item) => <Link className="recruitment-result-row" href={`/job/${item.id}`} key={item.id}><Avatar src={item.employer?.logo} name={item.employer?.companyName || "Company"} size={48} /><div className="recruitment-result-main"><h3>{item.title}</h3><p>{item.employer?.companyName} · {jobLocation(item)}</p><strong>{formatSalary(item)}</strong></div><span aria-hidden>→</span></Link>)}</div></section>}
      </div>
      <div className="bn-side-stack"><aside className="recruitment-apply-panel"><strong>{formatSalary(job, true)}</strong><small>{job.openings} {job.openings === 1 ? "opening" : "openings"} · {closingContext(job.expiresAt)}</small>{isOwner ? <Button variant="secondary" block href="/recruitment/dashboard">Manage this role</Button> : user?.recruitmentRole === "recruiter" ? <p>Recruiter accounts can inspect roles but cannot apply.</p> : alreadyApplied ? <div className="recruitment-state"><strong>Application sent</strong><p>Track it from your applicant dashboard.</p></div> : <Button variant="brand" block onClick={startApply}>Apply now</Button>}<small>{job.applicationCount} {job.applicationCount === 1 ? "application" : "applications"} recorded</small></aside><div className="bn-side-ad"><ApiAdvertisingSlot imageOnly showFallback={false} placement="recruitment_home" kind="native" context="Sponsored" summary="" action="View opportunity" /></div></div>
    </div>
  </div>
  <div className="bn-bottom-ad is-850"><ApiAdvertisingSlot compact placement="recruitment_home" kind="native" context="Sponsored near role details" summary="A clearly labelled hiring placement, separate from the role’s employer facts and application path." action="View opportunity" /></div>
  {/* Phones: Apply stays one tap away while reading the role (same floating bar as "Contact seller"). */}
  {!isOwner && user?.recruitmentRole !== "recruiter" && !alreadyApplied && <button type="button" className="ld-mobile-cta" onClick={startApply}>Apply now</button>}
  <ContactAuthModal purpose="apply" open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setApplyOpen(true)} />
  {applyOpen && <ApplyModal open={applyOpen} job={job} onClose={() => setApplyOpen(false)} onApplied={() => setAlreadyApplied(true)} />}
  </div>;
}

export default function JobDetailPage() { return <RecruitmentGate><JobDetailInner /></RecruitmentGate>; }
