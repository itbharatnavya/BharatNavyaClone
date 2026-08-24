"use client";

// Job detail — role/description/requirements on the left, a sticky Apply card on the
// right (Recruitment's analog of Directory's SellerContactCard: same login-gate shape,
// different action — Apply, not Call/WhatsApp). Green identity throughout, list-first
// composition, no image gallery (jobs don't have photos).

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import ContactAuthModal from "@/components/auth/ContactAuthModal";
import ApplyModal from "@/components/recruitment/ApplyModal";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";
import JobCard from "@/components/recruitment/JobCard";
import { useAuth } from "@/lib/auth";
import { getJob, getJobs, getMyApplications } from "@/lib/api";
import type { Job } from "@/lib/types";

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}
function salaryLabel(job: Job): string {
  const sr = job.salaryRange;
  if (!sr || sr.isDisclosed === false) return "Confidential";
  if (sr.min != null && sr.max != null) return `₹${formatINR(sr.min)} – ₹${formatINR(sr.max)} / yr`;
  if (sr.min != null) return `₹${formatINR(sr.min)}+ / yr`;
  if (sr.max != null) return `Up to ₹${formatINR(sr.max)} / yr`;
  return "Not disclosed";
}
function employmentLabel(t: Job["employmentType"]): string {
  switch (t) {
    case "full-time": return "Full-time";
    case "part-time": return "Part-time";
    case "contract": return "Contract";
    case "internship": return "Internship";
    case "freelance": return "Freelance";
    default: return "";
  }
}
function experienceLabel(l: Job["experienceLevel"]): string {
  switch (l) {
    case "entry": return "Entry level";
    case "mid": return "Mid level";
    case "senior": return "Senior";
    case "lead": return "Lead";
    case "executive": return "Executive";
    default: return "";
  }
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.2l3 1.8" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Inline-styled throughout — TagList is a separate component invoked as <TagList/>,
// and styled-jsx never scopes a parent's <style jsx> classes onto a child component's
// own rendered elements (confirmed by screenshot: .jd-h2/.jd-list silently didn't
// apply here). Matches the same fix already applied to JobCard's meta row.
function TagList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>{title}</h2>
      <ul style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55 }}>
            <span style={{ flexShrink: 0, marginTop: 4, color: "var(--tricolor-green)" }}><CheckIcon /></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <RecruitmentGate>
      <JobDetailPageInner />
    </RecruitmentGate>
  );
}

function JobDetailPageInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [related, setRelated] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      let loaded: Job | null = null;
      try {
        loaded = await getJob(id);
        if (!cancelled) setJob(loaded);
      } catch {
        if (!cancelled) setNotFound(true);
      }
      if (loaded && loaded.jobFunction) {
        getJobs({ jobFunction: loaded.jobFunction, limit: 4 })
          .then((r) => !cancelled && setRelated(r.jobs.filter((j) => j.id !== loaded!.id).slice(0, 3)))
          .catch(() => {});
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !job) return;
    let cancelled = false;
    getMyApplications()
      .then((apps) => !cancelled && setAlreadyApplied(apps.some((a) => a.jobId === job.id)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, job]);

  function handleApplyClick() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setApplyOpen(true);
  }

  if (loading) {
    return (
      <div className="container-bs section-pad-sm">
        <div className="skeleton" style={{ height: 24, width: 240, borderRadius: 6, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="container-bs" style={{ paddingTop: 100, paddingBottom: 100, textAlign: "center" }}>
        <span className="rc-eyebrow-plain">Role not found</span>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "10px 0 20px" }}>This role isn't available anymore</h1>
        <Button variant="green" href="/recruitment/jobs">Browse open roles</Button>
      </div>
    );
  }

  const companyName = job.employer?.companyName || "Company";
  const loc = job.location || {};
  const locationLabel = loc.remote ? (loc.city ? `${loc.city} · Remote` : "Remote") : loc.city || "Location not specified";
  const isOwner = user?.id === job.employerId;

  return (
    <div className="container-bs section-pad-sm">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Recruitment", href: "/recruitment" },
          { label: "Roles", href: "/recruitment/jobs" },
          { label: job.title },
        ]}
      />

      <div className="jd-layout">
        {/* MAIN */}
        <div style={{ minWidth: 0 }}>
          <div className="jd-header">
            <Avatar src={job.employer?.logo} name={companyName} size={56} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 className="jd-title">{job.title}</h1>
              <div className="jd-company-row">
                {job.employer?.slug ? (
                  <Link href={`/employer/${job.employer.slug}`} className="jd-company-link">
                    {companyName}
                  </Link>
                ) : (
                  <span>{companyName}</span>
                )}
                {job.employer?.isVerified && (
                  <span className="jd-verified"><CheckIcon /> Verified</span>
                )}
              </div>
            </div>
          </div>

          <div className="jd-meta-row">
            <span className="jd-meta-item"><PinIcon /> {locationLabel}</span>
            {experienceLabel(job.experienceLevel) && (
              <span className="jd-meta-item"><BriefcaseIcon /> {experienceLabel(job.experienceLevel)}</span>
            )}
            {employmentLabel(job.employmentType) && (
              <span className="jd-meta-item"><ClockIcon /> {employmentLabel(job.employmentType)}</span>
            )}
          </div>

          {job.skills.length > 0 && (
            <div className="jd-chips">
              {job.skills.map((s) => (
                <span key={s} className="jd-chip">{s}</span>
              ))}
            </div>
          )}

          <div className="jd-sections">
            <div>
              <h2 className="jd-h2">About this role</h2>
              <p className="jd-description">{job.description || "No description provided."}</p>
            </div>
            <TagList title="Responsibilities" items={job.responsibilities} />
            <TagList title="What we're looking for" items={job.requirements} />
            <TagList title="Benefits" items={job.benefits} />
          </div>

          {related.length > 0 && (
            <div className="jd-related">
              <h2 className="jd-h2">Similar roles</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {related.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* APPLY CARD */}
        <aside className="jd-aside">
          <div className="card jd-apply-card">
            <div className="jd-salary">{salaryLabel(job)}</div>
            <div className="jd-openings">{job.openings} opening{job.openings === 1 ? "" : "s"}</div>

            {isOwner ? (
              <Button variant="secondary" block href="/recruitment/dashboard">
                This is your job posting
              </Button>
            ) : user?.recruitmentRole === "recruiter" ? (
              <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", margin: 0 }}>
                Recruiter accounts can browse roles but can't apply.
              </p>
            ) : alreadyApplied ? (
              <div className="jd-applied">
                <CheckIcon /> Application sent
              </div>
            ) : (
              <Button variant="green" block onClick={handleApplyClick}>
                Apply now
              </Button>
            )}

            <p className="jd-apply-note">
              {job.applicationCount} candidate{job.applicationCount === 1 ? "" : "s"} applied so far
            </p>
          </div>
        </aside>
      </div>

      <ContactAuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setApplyOpen(true)} />

      {/* Mounted only once open — ApplyModal's useState(cp?.resumeUrl) initializer only
          runs on mount, so mounting it unconditionally on page load would capture
          candidateProfile before useAuth()'s async fetch resolves and never re-sync,
          forcing every applicant through the CV step even with one already on file. */}
      {applyOpen && (
        <ApplyModal
          open={applyOpen}
          job={job}
          onClose={() => setApplyOpen(false)}
          onApplied={() => setAlreadyApplied(true)}
        />
      )}

      <style jsx>{`
        .rc-eyebrow-plain {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--faint);
        }
        .jd-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 32px;
          align-items: start;
          margin-top: 20px;
        }
        .jd-aside {
          position: sticky;
          top: 124px;
        }
        .jd-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .jd-title {
          font-size: clamp(22px, 3.2vw, 30px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          line-height: 1.2;
        }
        .jd-company-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 6px;
          font-size: 15px;
          color: var(--muted);
        }
        .jd-company-link {
          font-weight: 600;
          color: var(--tricolor-green-hover);
        }
        .jd-verified {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 700;
          color: var(--tricolor-green-hover);
        }
        .jd-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 20px;
          margin-top: 18px;
          font-size: 14px;
          color: var(--muted);
        }
        .jd-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .jd-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        .jd-chip {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--tricolor-green-hover);
          background: var(--tricolor-green-tint);
          border: 1px solid #cdebd7;
          border-radius: 999px;
          padding: 5px 12px;
        }
        .jd-sections {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-top: 32px;
        }
        .jd-h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 10px;
        }
        .jd-description {
          font-size: 15px;
          color: var(--muted);
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .jd-related {
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid var(--border);
        }

        .jd-apply-card {
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .jd-salary {
          font-size: 20px;
          font-weight: 800;
          color: var(--ink);
        }
        .jd-openings {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 14px;
        }
        .jd-apply-note {
          font-size: 12.5px;
          color: var(--faint);
          text-align: center;
          margin-top: 12px;
        }
        .jd-applied {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--tricolor-green-tint);
          color: var(--tricolor-green-hover);
          border-radius: 999px;
          padding: 12px;
          font-size: 14.5px;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .jd-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .jd-aside {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
