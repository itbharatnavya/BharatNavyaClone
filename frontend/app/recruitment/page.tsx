"use client";

// Recruitment — the product landing page (replaces the "Coming soon" placeholder).
// Deliberately not a Directory reskin: green (--tricolor-green) is Recruitment's
// identity color throughout (frontend-design-guide.md's color-to-module mapping), the
// hero is a structured role/city search rather than an AI-concierge box, and job cards
// carry a role-first hierarchy instead of Directory's product-photo-first grid. Same
// underlying system otherwise — Inter type scale, 8px spacing, existing radius/shadow
// tokens, no new hues.
//
// Signature hero element: the H1 cycles through role titles ("Find your next role as
// a [Software Engineer / Sales Executive / …]") — a live, ever-changing moment at the
// exact spot a visitor's eye lands first, the way hirist.tech/Naukri-style boards use
// motion to sell "there's a constant stream of real hiring happening here" without
// needing (possibly sparse, demo-stage) real-time data to back it. Respects
// prefers-reduced-motion (swaps instantly, no animation) per frontend-design's
// "quality floor" guidance.
//
// Scroll docking: mirrors components/home/HomeHero.tsx's pattern exactly (same
// IntersectionObserver shape, same lib/searchDock.tsx plumbing) so a compact
// RoleSearchBar docks into Navbar once this hero scrolls past the sticky header —
// see Navbar.tsx's isRecruitmentHome branch.

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import Reveal from "@/components/Reveal";
import Button from "@/components/Button";
import RoleSearchBar from "@/components/recruitment/RoleSearchBar";
import JobCard from "@/components/recruitment/JobCard";
import Avatar from "@/components/Avatar";
import AdSlider from "@/components/AdSlider";
import { useAuth } from "@/lib/auth";
import { useSearchDock } from "@/lib/searchDock";
import { getJobs, getJobFunctions } from "@/lib/api";
import type { Job, JobFunction } from "@/lib/types";

const ROTATING_ROLES = [
  "Software Engineer",
  "Sales Executive",
  "Product Manager",
  "Data Analyst",
  "Graphic Designer",
  "HR Manager",
  "Business Development Executive",
];

function useRotatingIndex(length: number, intervalMs = 2200): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % length), intervalMs);
    return () => window.clearInterval(id);
  }, [length, intervalMs]);
  return i;
}

function BriefcaseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}
function UsersIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16.5 4.3a3.2 3.2 0 010 6.2" />
      <path d="M21.5 20c0-3-1.9-5.2-4.7-5.8" />
    </svg>
  );
}
function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M15 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h7" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.8 8.8 0 01-3.4-.7L3 21l1.8-5.4A8.4 8.4 0 1121 11.5z" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h3l2-2h6l2 2h3v13H4V7z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}
function RupeeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4h12M6 9h12M6 4c4 0 7 2 7 5s-3 5-7 5h-1l8 6" />
    </svg>
  );
}

const GUIDES = [
  {
    icon: <DocIcon />,
    title: "Write a résumé recruiters actually read",
    copy: "Lead with impact, not duties — the six-second scan test and what to cut.",
  },
  {
    icon: <ChatIcon />,
    title: "Answering the salary expectation question",
    copy: "A simple range-and-reason script that keeps the offer conversation open.",
  },
  {
    icon: <CameraIcon />,
    title: "Acing a video interview",
    copy: "Lighting, framing and the two questions to ask before you hang up.",
  },
  {
    icon: <RupeeIcon />,
    title: "Following up without being pushy",
    copy: "When to check in after applying, and the one-line message that works.",
  },
];

export default function RecruitmentPage() {
  const { user } = useAuth();
  const { progress, setProgress, roleQuery, setRoleQuery, roleCity, setRoleCity } = useSearchDock();
  const searchRef = useRef<HTMLDivElement>(null);
  const rotatorIndex = useRotatingIndex(ROTATING_ROLES.length);

  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [featured, setFeatured] = useState<Job[]>([]);
  const [totalOpenRoles, setTotalOpenRoles] = useState<number | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    getJobFunctions().then(setJobFunctions).catch(() => {});
    getJobs({ limit: 8 })
      .then((r) => {
        setFeatured(r.jobs);
        setTotalOpenRoles(r.total);
      })
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  // Publish scroll-docking progress for Navbar's compact RoleSearchBar — see
  // components/home/HomeHero.tsx for the pattern this mirrors.
  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const thresholds = Array.from({ length: 41 }, (_, i) => i / 40);
    const io = new IntersectionObserver(
      ([entry]) => setProgress(1 - entry.intersectionRatio),
      { rootMargin: "-64px 0px 0px 0px", threshold: thresholds }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setProgress(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEmployer = !!user?.employerProfile;

  // Unique hiring companies from the currently-fetched featured roles — cheap to
  // derive (no separate endpoint) and always reflects genuinely open roles.
  const hiringCompanies = useMemo(() => {
    const seen = new Set<string>();
    const out: NonNullable<Job["employer"]>[] = [];
    for (const j of featured) {
      const e = j.employer;
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
    }
    return out;
  }, [featured]);

  return (
    <div>
      {/* ---------------- 0 · PRODUCT STRIP ---------------- */}
      <section style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        <div
          className="container-bs"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 12, paddingBottom: 12 }}
        >
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Recruitment" }]} />
          <span className="rc-eyebrow" style={{ whiteSpace: "nowrap" }}>
            BharatSource Recruitment
          </span>
        </div>
      </section>

      {/* ---------------- 1 · HERO ---------------- */}
      <section className="rc-hero">
        <div className="container-bs rc-hero-inner">
          <span className="rc-eyebrow">Hiring, the direct way</span>
          <h1 className="rc-h1">
            Find your next role as a{" "}
            <span className="rc-h1-rotator" aria-live="polite">
              <span key={ROTATING_ROLES[rotatorIndex]} className="rc-h1-rotator-word">
                {ROTATING_ROLES[rotatorIndex]}
              </span>
            </span>
          </h1>
          <p className="rc-hero-sub">
            Search open roles across verified Indian companies, or post a job and hear directly from
            candidates — no recruiters, no middlemen taking a cut.
          </p>
          <div
            ref={searchRef}
            className="rc-hero-search"
            style={{
              opacity: 1 - progress,
              transform: `translateY(${progress * -26}px) scale(${1 - progress * 0.04})`,
              transition: "opacity 180ms cubic-bezier(0.16,1,0.3,1), transform 180ms cubic-bezier(0.16,1,0.3,1)",
              pointerEvents: progress > 0.5 ? "none" : "auto",
            }}
          >
            <RoleSearchBar query={roleQuery} onQueryChange={setRoleQuery} city={roleCity} onCityChange={setRoleCity} />
          </div>
          {jobFunctions.length > 0 && (
            <div className="rc-func-rail">
              {jobFunctions.slice(0, 8).map((jf) => (
                <Link key={jf.id} href={`/recruitment/jobs?jobFunction=${jf.slug}`} className="rc-func-chip">
                  {jf.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- 2 · STATS (real, not illustrative — this is Recruitment's own product page) ---------------- */}
      <section className="container-bs" style={{ paddingTop: 8 }}>
        <Reveal>
          <div className="rc-stats">
            <div className="card card-flat rc-stat">
              <span className="rc-stat-icon"><BriefcaseIcon /></span>
              <div>
                <div className="rc-stat-value">{totalOpenRoles ?? "—"}</div>
                <div className="rc-stat-label">Open roles right now</div>
              </div>
            </div>
            <div className="card card-flat rc-stat">
              <span className="rc-stat-icon"><UsersIcon /></span>
              <div>
                <div className="rc-stat-value">1 account</div>
                <div className="rc-stat-label">Works across sourcing and hiring</div>
              </div>
            </div>
            <div className="card card-flat rc-stat">
              <span className="rc-stat-icon"><ShieldIcon /></span>
              <div>
                <div className="rc-stat-value">Verified</div>
                <div className="rc-stat-label">Companies reviewed before their roles go live</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- 3 · COMPANIES HIRING NOW ---------------- */}
      {hiringCompanies.length > 0 && (
        <section className="container-bs" style={{ paddingTop: 32 }}>
          <Reveal>
            <div className="rc-companies">
              <span className="rc-companies-label">Companies hiring now</span>
              <div className="rc-companies-rail">
                {hiringCompanies.map((c) => (
                  <Link key={c.id} href={`/employer/${c.slug || ""}`} className="rc-company-chip">
                    <Avatar src={c.logo || undefined} name={c.companyName || "Company"} size={26} />
                    <span className="line-clamp-1">{c.companyName || "Company"}</span>
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ---------------- 4 · SPONSORED (self-serve, admin-approved — see RECRUITMENT.md) ---------------- */}
      <section className="container-bs" style={{ paddingTop: 32 }}>
        <AdSlider placement="recruitment_home" />
      </section>

      {/* ---------------- 5 · FEATURED ROLES ---------------- */}
      {(loadingFeatured || featured.length > 0) && (
        <section className="container-bs section-pad-sm">
          <Reveal>
            <div className="rc-section-head">
              <div>
                <span className="rc-eyebrow">Fresh openings</span>
                <h2 className="rc-h2">Recently posted roles</h2>
              </div>
              <Link href="/recruitment/jobs" className="rc-see-all">
                Browse all roles →
              </Link>
            </div>
          </Reveal>
          <div className="rc-featured-grid">
            {loadingFeatured
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card card-flat" style={{ padding: 16, height: 180 }}>
                    <div className="skeleton" style={{ height: "100%", borderRadius: 8 }} />
                  </div>
                ))
              : featured.slice(0, 6).map((job, i) => (
                  <Reveal key={job.id} delay={i * 60}>
                    <JobCard job={job} layout="grid" />
                  </Reveal>
                ))}
          </div>
        </section>
      )}

      {/* ---------------- 6 · CAREER GUIDES ---------------- */}
      <section style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-bs section-pad-sm">
          <Reveal>
            <div className="rc-section-head">
              <div>
                <span className="rc-eyebrow">Before you apply</span>
                <h2 className="rc-h2">Career guides</h2>
              </div>
              <Link href="/blog" className="rc-see-all">
                View all guides →
              </Link>
            </div>
          </Reveal>
          <div className="rc-guides-grid">
            {GUIDES.map((g, i) => (
              <Reveal key={g.title} delay={i * 60}>
                <Link href="/blog" className="card card-flat rc-guide">
                  <span className="rc-guide-icon">{g.icon}</span>
                  <h3 className="rc-guide-title">{g.title}</h3>
                  <p className="rc-guide-copy">{g.copy}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 7 · TWO PATHS CTA ---------------- */}
      <section>
        <div className="container-bs section-pad">
          <Reveal>
            <div className="rc-paths">
              <div className="card card-flat rc-path">
                <span className="rc-path-icon"><UsersIcon size={26} /></span>
                <h3 className="rc-path-title">Looking for a role?</h3>
                <p className="rc-path-copy">
                  Search open positions by role, city or company, and apply directly — your profile and
                  résumé stay with your one BharatSource account.
                </p>
                <Button variant="green" href="/recruitment/jobs">Browse roles</Button>
              </div>
              <div className="card card-flat rc-path">
                <span className="rc-path-icon"><BriefcaseIcon size={26} /></span>
                <h3 className="rc-path-title">Hiring for your team?</h3>
                <p className="rc-path-copy">
                  Post a role and review applicants directly — no recruiter fees, no bidding, just the
                  candidates who actually apply.
                </p>
                <Button
                  variant="secondary"
                  href={user ? "/post-job" : "/register?next=/post-job"}
                >
                  {isEmployer ? "Post another role" : "Post a job"}
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <style jsx>{`
        .rc-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--tricolor-green-hover);
        }
        .rc-hero {
          position: relative;
          overflow: hidden;
          background: radial-gradient(
              ellipse 60% 50% at 15% 0%,
              var(--tricolor-green-tint) 0%,
              transparent 65%
            ),
            radial-gradient(ellipse 55% 45% at 100% 10%, var(--action-tint) 0%, transparent 60%);
        }
        .rc-hero-inner {
          padding-top: clamp(48px, 8vw, 84px);
          padding-bottom: clamp(40px, 6vw, 64px);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 780px;
        }
        .rc-h1 {
          margin-top: 12px;
          font-size: clamp(32px, 5vw, 54px);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.12;
          color: var(--ink);
        }
        .rc-h1-rotator {
          display: inline-block;
          color: var(--tricolor-green);
          position: relative;
        }
        .rc-h1-rotator-word {
          display: inline-block;
          animation: rc-rotate-in 420ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes rc-rotate-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rc-h1-rotator-word {
            animation: none;
          }
        }
        .rc-hero-sub {
          margin-top: 16px;
          font-size: 16px;
          color: var(--muted);
          max-width: 560px;
          line-height: 1.6;
        }
        .rc-hero-search {
          margin-top: 28px;
          width: 100%;
          max-width: 640px;
        }
        .rc-func-rail {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .rc-func-chip {
          font-size: 13px;
          font-weight: 600;
          color: var(--tricolor-green-hover);
          background: #ffffff;
          border: 1px solid #cdebd7;
          border-radius: 999px;
          padding: 7px 15px;
          transition: background-color 140ms ease, border-color 140ms ease;
        }
        .rc-func-chip:hover {
          background: var(--tricolor-green-tint);
          border-color: var(--tricolor-green);
        }

        .rc-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .rc-stat {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: clamp(18px, 2.6vw, 22px);
        }
        .rc-stat-icon {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--tricolor-green-tint);
          color: var(--tricolor-green-hover);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .rc-stat-value {
          font-size: 20px;
          font-weight: 800;
          color: var(--ink);
        }
        .rc-stat-label {
          font-size: 13px;
          color: var(--muted);
          margin-top: 2px;
        }

        .rc-companies {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .rc-companies-label {
          flex-shrink: 0;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--muted);
          white-space: nowrap;
        }
        .rc-companies-rail {
          flex: 1;
          min-width: 0;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .rc-company-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          max-width: 200px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 5px 14px 5px 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          transition: border-color 140ms ease;
        }
        .rc-company-chip:hover {
          border-color: var(--tricolor-green);
        }

        .rc-section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .rc-h2 {
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin-top: 6px;
        }
        .rc-see-all {
          font-size: 14px;
          font-weight: 600;
          color: var(--tricolor-green-hover);
          white-space: nowrap;
        }
        .rc-featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 18px;
        }

        .rc-guides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 16px;
        }
        .rc-guide {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        .rc-guide-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--tricolor-green-tint);
          color: var(--tricolor-green-hover);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
        }
        .rc-guide-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.3;
        }
        .rc-guide-copy {
          font-size: 13px;
          color: var(--muted);
          line-height: 1.55;
        }

        .rc-paths {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .rc-path {
          padding: clamp(22px, 3vw, 28px);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        .rc-path-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--tricolor-green-tint);
          color: var(--tricolor-green-hover);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .rc-path-title {
          font-size: 19px;
          font-weight: 700;
          color: var(--ink);
        }
        .rc-path-copy {
          font-size: 14.5px;
          color: var(--muted);
          line-height: 1.6;
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}
