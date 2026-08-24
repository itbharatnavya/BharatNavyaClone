"use client";

// Employer public profile — company header + open roles. Recruitment's analog of
// Directory's seller profile page, but company-forward rather than storefront-forward
// (no reviews/stories yet — those are dashboard-adjacent, deferred).

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import JobCard from "@/components/recruitment/JobCard";
import RecruitmentGate from "@/components/recruitment/RecruitmentGate";
import { getEmployer } from "@/lib/api";
import type { PublicEmployer } from "@/lib/api";
import type { Job } from "@/lib/types";

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export default function EmployerProfilePage() {
  return (
    <RecruitmentGate>
      <EmployerProfilePageInner />
    </RecruitmentGate>
  );
}

function EmployerProfilePageInner() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [employer, setEmployer] = useState<PublicEmployer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getEmployer(slug)
      .then((r) => {
        if (cancelled) return;
        setEmployer(r.employer);
        setJobs(r.jobs);
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container-bs section-pad-sm">
        <div className="skeleton" style={{ height: 160, borderRadius: 16, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  if (notFound || !employer) {
    return (
      <div className="container-bs" style={{ paddingTop: 100, paddingBottom: 100, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>This company profile doesn't exist</h1>
        <Button variant="green" href="/recruitment/jobs">Browse open roles</Button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="ep-cover"
        style={employer.coverImage ? { backgroundImage: `url(${employer.coverImage})` } : undefined}
      />
      <div className="container-bs">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "Recruitment", href: "/recruitment" }, { label: employer.companyName }]}
          className="ep-breadcrumbs"
        />

        <div className="ep-header">
          <div className="ep-logo-wrap">
            <Avatar src={employer.logo} name={employer.companyName} size={84} className="ep-logo" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="ep-name-row">
              <h1 className="ep-name">{employer.companyName}</h1>
              {employer.isVerified && (
                <span className="ep-verified"><CheckIcon /> Verified</span>
              )}
            </div>
            <div className="ep-meta-row">
              {(employer.location?.city || employer.location?.state) && (
                <span className="ep-meta-item">
                  <PinIcon /> {[employer.location.city, employer.location.state].filter(Boolean).join(", ")}
                </span>
              )}
              {employer.industry && <span className="ep-meta-item">{employer.industry}</span>}
              {employer.website && (
                <a href={employer.website} target="_blank" rel="noreferrer" className="ep-meta-item ep-link">
                  <GlobeIcon /> Website
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="ep-layout section-pad-sm">
          <div style={{ minWidth: 0 }}>
            <h2 className="ep-h2">Open roles ({jobs.length})</h2>
            {jobs.length === 0 ? (
              <div className="card card-flat" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                No open roles from {employer.companyName} right now.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {jobs.map((j) => (
                  <JobCard key={j.id} job={{ ...j, employer: { id: employer.id, companyName: employer.companyName, slug: employer.slug, logo: employer.logo ?? null, city: employer.location?.city ?? null, state: employer.location?.state ?? null, isVerified: employer.isVerified } }} />
                ))}
              </div>
            )}
          </div>

          <aside className="ep-aside">
            {employer.about && (
              <div className="card card-flat" style={{ padding: 20, marginBottom: 16 }}>
                <h3 className="ep-aside-title">About</h3>
                <p className="ep-about">{employer.about}</p>
              </div>
            )}
            <div className="card card-flat" style={{ padding: 20 }}>
              <h3 className="ep-aside-title">Company details</h3>
              <dl className="ep-details">
                {employer.industry && (
                  <>
                    <dt>Industry</dt>
                    <dd>{employer.industry}</dd>
                  </>
                )}
                {employer.companySize && (
                  <>
                    <dt>Company size</dt>
                    <dd>{employer.companySize}</dd>
                  </>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .ep-cover {
          height: 160px;
          background: linear-gradient(120deg, var(--tricolor-green-tint), var(--action-tint));
          background-size: cover;
          background-position: center;
        }
        .ep-breadcrumbs {
          padding-top: 16px;
        }
        .ep-header {
          display: flex;
          align-items: flex-end;
          gap: 18px;
          margin-top: 28px;
          padding-bottom: 8px;
        }
        /* Only the logo overlaps the cover image (a wrapper of its own, pulled up by
           less than .ep-header's own top margin) — the header row itself sits at a
           normal positive offset below the cover, so the company name/breadcrumb never
           sit on top of the (often busy) cover photo. An earlier version pulled the
           whole header row up together, which dragged the name text onto the image
           too; a second pass pulled the logo up further than .ep-header's margin could
           absorb, clipping into the breadcrumb row instead — this value stays safely
           inside that margin at every viewport tested (390/1440px).  */
        .ep-logo-wrap {
          margin-top: -34px;
          flex-shrink: 0;
        }
        .ep-header :global(.ep-logo) {
          border: 4px solid #fff;
          box-shadow: var(--shadow-card);
        }
        .ep-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding-bottom: 4px;
        }
        .ep-name {
          font-size: clamp(22px, 3vw, 28px);
          font-weight: 800;
          color: var(--ink);
        }
        .ep-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--tricolor-green-hover);
          background: var(--tricolor-green-tint);
          border-radius: 999px;
          padding: 4px 10px;
        }
        .ep-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          margin-top: 6px;
          font-size: 13.5px;
          color: var(--muted);
        }
        .ep-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .ep-link {
          color: var(--tricolor-green-hover);
          font-weight: 600;
        }
        .ep-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 28px;
          align-items: start;
        }
        .ep-h2 {
          font-size: 19px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 16px;
        }
        .ep-aside {
          position: sticky;
          top: 96px;
        }
        .ep-aside-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 10px;
        }
        .ep-about {
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.6;
        }
        .ep-details {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 8px 12px;
          font-size: 13px;
        }
        .ep-details dt {
          color: var(--faint);
        }
        .ep-details dd {
          color: var(--ink);
          font-weight: 500;
        }

        @media (max-width: 860px) {
          .ep-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .ep-aside {
            position: static;
            order: -1;
          }
        }
        @media (max-width: 560px) {
          .ep-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
