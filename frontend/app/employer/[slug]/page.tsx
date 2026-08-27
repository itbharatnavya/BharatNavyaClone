"use client";

// Employer public profile — company header + open roles. Recruitment's analog of
// Directory's seller profile page, but company-forward rather than storefront-forward
// (no reviews/stories yet — those are dashboard-adjacent, deferred).

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Rating from "@/components/Rating";
import JobCard from "@/components/recruitment/JobCard";
import EmployerReviewsSection from "@/components/employer/EmployerReviewsSection";
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
function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
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
  const [reviewAgg, setReviewAgg] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });

  // Stable identity + no-op guard so the child's aggregate effect doesn't loop.
  const handleAggregate = useCallback((avg: number, count: number) => {
    setReviewAgg((prev) => (prev.avg === avg && prev.count === count ? prev : { avg, count }));
  }, []);

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

  const locationText = [employer.location?.city, employer.location?.state].filter(Boolean).join(", ");

  return (
    <div>
      <div className="container-bs">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Recruitment", href: "/recruitment" },
            { label: employer.companyName },
          ]}
          className="ep-breadcrumbs"
        />
      </div>
      <div
        className="ep-cover"
        style={employer.coverImage ? { backgroundImage: `url(${employer.coverImage})` } : undefined}
      >
        <span className="ep-cover-scrim" aria-hidden />
      </div>
      <div className="container-bs">

        <div className="card ep-header-card">
          <div className="ep-logo-wrap">
            <Avatar src={employer.logo} name={employer.companyName} size={88} className="ep-logo" />
          </div>
          <div className="ep-header-main">
            <div className="ep-name-row">
              <h1 className="ep-name">{employer.companyName}</h1>
              {employer.isVerified && (
                <span className="ep-verified"><CheckIcon /> Verified</span>
              )}
            </div>
            <div className="ep-meta-row">
              {locationText && (
                <span className="ep-meta-item">
                  <PinIcon /> {locationText}
                </span>
              )}
              {employer.industry && <span className="ep-meta-item">{employer.industry}</span>}
              {employer.website && (
                <a href={employer.website} target="_blank" rel="noreferrer" className="ep-meta-item ep-link">
                  <GlobeIcon /> Website
                </a>
              )}
            </div>
            <div className="ep-stat-row">
              <span className="ep-stat">
                <strong>{jobs.length}</strong> open {jobs.length === 1 ? "role" : "roles"}
              </span>
              {reviewAgg.count > 0 && (
                <span className="ep-stat ep-stat-rating">
                  <Rating value={reviewAgg.avg} size={13} />
                  <span>· {reviewAgg.count} {reviewAgg.count === 1 ? "review" : "reviews"}</span>
                </span>
              )}
              {employer.companySize && <span className="ep-stat">{employer.companySize} people</span>}
            </div>
          </div>
        </div>

        <div className="ep-layout section-pad-sm">
          <div style={{ minWidth: 0 }}>
            <div className="ep-roles-head">
              <h2 className="ep-h2">Open roles</h2>
              <span className="ep-count">{jobs.length}</span>
            </div>
            {jobs.length === 0 ? (
              <div className="card card-flat ep-empty">
                <span className="ep-empty-icon" aria-hidden>
                  <BriefcaseIcon />
                </span>
                <p className="ep-empty-title">No open roles right now</p>
                <p className="ep-empty-sub">{employer.companyName} isn&apos;t hiring at the moment. Check back soon or browse other companies.</p>
                <Button variant="green" href="/recruitment/jobs">Browse all roles</Button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {jobs.map((j) => (
                  <JobCard key={j.id} job={{ ...j, employer: { id: employer.id, companyName: employer.companyName, slug: employer.slug, logo: employer.logo ?? null, city: employer.location?.city ?? null, state: employer.location?.state ?? null, isVerified: employer.isVerified } }} />
                ))}
              </div>
            )}

            <div className="ep-roles-head" style={{ marginTop: 36 }}>
              <h2 className="ep-h2">Reviews</h2>
              {reviewAgg.count > 0 && <span className="ep-count">{reviewAgg.count}</span>}
            </div>
            <EmployerReviewsSection
              targetUserId={employer.id}
              companyName={employer.companyName}
              onAggregate={handleAggregate}
            />
          </div>

          <aside className="ep-aside">
            {employer.about && (
              <div className="card card-flat ep-aside-card">
                <h3 className="ep-aside-title">About</h3>
                <p className="ep-about">{employer.about}</p>
              </div>
            )}
            {(employer.industry || employer.companySize || locationText || employer.website) && (
              <div className="card card-flat ep-aside-card">
                <h3 className="ep-aside-title">Company details</h3>
                <dl className="ep-details">
                  {locationText && (
                    <>
                      <dt>Location</dt>
                      <dd>{locationText}</dd>
                    </>
                  )}
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
                  {employer.website && (
                    <>
                      <dt>Website</dt>
                      <dd>
                        <a href={employer.website} target="_blank" rel="noreferrer" className="ep-link">
                          {employer.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </aside>
        </div>
      </div>

      <style jsx>{`
        .ep-cover {
          position: relative;
          height: clamp(120px, 22vw, 200px);
          background: linear-gradient(120deg, var(--tricolor-green-tint), var(--action-tint));
          background-size: cover;
          background-position: center;
        }
        /* Soft fade at the foot of the cover so an uploaded photo's hard bottom
           edge blends into the page instead of cutting off sharply. */
        .ep-cover-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0) 55%, rgba(15, 23, 42, 0.12) 100%);
        }
        .ep-breadcrumbs {
          margin: 20px 0 14px;
        }

        /* The header sits in its own raised white card that lifts up over the
           cover — the logo and company name never overlap the (often busy) cover
           photo directly, and the card edge gives the page a clear anchor. */
        .ep-header-card {
          position: relative;
          z-index: 1;
          margin-top: clamp(-64px, -7vw, -44px);
          display: flex;
          align-items: flex-end;
          gap: 20px;
          padding: 20px 22px;
        }
        .ep-logo-wrap {
          flex-shrink: 0;
          margin-top: -52px;
        }
        .ep-header-card :global(.ep-logo) {
          border: 4px solid var(--canvas, #fff);
          box-shadow: var(--shadow-card);
          background: var(--canvas, #fff);
        }
        .ep-header-main {
          min-width: 0;
          flex: 1;
        }
        .ep-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ep-name {
          font-size: clamp(21px, 3vw, 28px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          min-width: 0;
        }
        .ep-verified {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: var(--tricolor-green-hover);
          background: var(--tricolor-green-tint);
          border: 1px solid #cdebd7;
          border-radius: 999px;
          padding: 3px 9px;
        }
        .ep-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 16px;
          margin-top: 8px;
          font-size: 13px;
          color: var(--muted);
        }
        .ep-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
        }
        .ep-link {
          color: var(--tricolor-green-hover);
          font-weight: 600;
        }
        .ep-link:hover {
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .ep-stat-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .ep-stat {
          font-size: 12.5px;
          color: var(--muted);
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px 11px;
        }
        .ep-stat strong {
          color: var(--ink);
          font-weight: 700;
        }
        .ep-stat-rating {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ep-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 288px;
          gap: 28px;
          align-items: start;
        }
        .ep-roles-head {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 16px;
        }
        .ep-h2 {
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--ink);
        }
        .ep-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 7px;
          font-size: 12px;
          font-weight: 700;
          color: var(--tricolor-green-hover);
          background: var(--tricolor-green-tint);
          border-radius: 999px;
        }
        .ep-empty {
          padding: 40px 28px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .ep-empty-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          margin-bottom: 6px;
          color: var(--tricolor-green);
          background: var(--tricolor-green-tint);
        }
        .ep-empty-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink);
        }
        .ep-empty-sub {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.6;
          max-width: 340px;
          margin-bottom: 8px;
        }
        .ep-aside {
          position: sticky;
          top: 96px;
        }
        .ep-aside-card + .ep-aside-card {
          margin-top: 16px;
        }
        .ep-aside-card {
          padding: 20px;
        }
        .ep-aside-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--faint);
          margin-bottom: 12px;
        }
        .ep-about {
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.65;
          white-space: pre-line;
        }
        .ep-details {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px 14px;
          font-size: 13px;
        }
        .ep-details dt {
          color: var(--faint);
          white-space: nowrap;
        }
        .ep-details dd {
          color: var(--ink);
          font-weight: 500;
          min-width: 0;
          word-break: break-word;
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
          .ep-header-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .ep-logo-wrap {
            margin-top: -56px;
          }
        }
      `}</style>
    </div>
  );
}
