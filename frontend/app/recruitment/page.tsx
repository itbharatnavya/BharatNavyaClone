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
import { getJobs, getJobFunctions, getBlogs, getRecruitmentRecentReviews } from "@/lib/api";
import type { RecruitmentRecentReview } from "@/lib/api";
import type { Job, JobFunction, JobEmployerMini, Blog } from "@/lib/types";

// First readable sentence(s) of a markdown body, for a card preview.
function excerptOf(body: string, max = 120): string {
  const plain = (body || "")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

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
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9L12 16.7l-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7L12 3.5z" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
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
    title: "Write a resume recruiters actually read",
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
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [totalOpenRoles, setTotalOpenRoles] = useState<number | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [testimonials, setTestimonials] = useState<RecruitmentRecentReview[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  // Real employer-authored career guides (GET /api/blogs?authorType=employer).
  // Falls back to the static GUIDES list below only if none are published yet.
  const [guides, setGuides] = useState<Blog[]>([]);

  useEffect(() => {
    getJobFunctions().then(setJobFunctions).catch(() => {});
    getBlogs({ authorType: "employer" }).then((b) => setGuides(b.slice(0, 4))).catch(() => {});
    // Fetch the full active-role set in one call (well under the API's 50-item cap) —
    // powers both the "Recently posted roles" grid (already sorted newest-first by the
    // backend) and the "Companies hiring now" rail's real per-company open-role counts,
    // instead of that rail only ever reflecting whichever 8 companies happened to be in
    // a small featured slice.
    getJobs({ limit: 50 })
      .then((r) => {
        setAllJobs(r.jobs);
        setTotalOpenRoles(r.total);
      })
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  const featured = useMemo(() => allJobs.slice(0, 8), [allJobs]);

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

  // Unique hiring companies + their real open-role count from the currently-fetched
  // job set — cheap to derive (no separate employers-list endpoint exists yet) and
  // always reflects genuinely open roles. Map insertion order follows allJobs' own
  // newest-first order, so the rail leads with whoever posted most recently.
  const companyStats = useMemo(() => {
    const map = new Map<string, { employer: JobEmployerMini; count: number }>();
    for (const j of allJobs) {
      const e = j.employer;
      if (!e) continue;
      const existing = map.get(e.id);
      if (existing) existing.count += 1;
      else map.set(e.id, { employer: e, count: 1 });
    }
    return Array.from(map.values());
  }, [allJobs]);

  // Latest messaged company reviews — one per company, capped server-side. A
  // single request to a dedicated endpoint (was previously one GET /api/reviews
  // per hiring company).
  useEffect(() => {
    let alive = true;
    getRecruitmentRecentReviews(6)
      .then((rows) => {
        if (alive) setTestimonials(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingTestimonials(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Custom scroll-progress indicator for the companies rail — see the render-site
  // comment for why this replaces relying on the native scrollbar. widthPct 100 means
  // "no overflow, nothing to scroll" (indicator stays hidden).
  const companiesRailRef = useRef<HTMLDivElement>(null);
  const [companiesScrollbar, setCompaniesScrollbar] = useState({ widthPct: 100, leftPct: 0 });

  useEffect(() => {
    const el = companiesRailRef.current;
    if (!el) return;
    function update() {
      const { scrollWidth, clientWidth, scrollLeft } = el!;
      if (scrollWidth <= clientWidth + 1) {
        setCompaniesScrollbar({ widthPct: 100, leftPct: 0 });
        return;
      }
      const widthPct = Math.max(12, (clientWidth / scrollWidth) * 100);
      const maxScroll = scrollWidth - clientWidth;
      const leftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - widthPct) : 0;
      setCompaniesScrollbar({ widthPct, leftPct });
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [companyStats.length]);

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

      {/* ---------------- 3 · COMPANIES HIRING NOW ----------------
          Deliberately the one dark, navy-gradient band on the page (--navy, a
          "decorative surface only" token per frontend-design-guide.md — never used
          for buttons/links/text elsewhere) instead of another light-green tint
          section: it's the moment meant to read as "real companies, actively
          hiring," and needs to visually break from the surrounding green/white
          rhythm to earn that weight. Horizontally-scrollable snap rail so it holds
          up to 12 companies on a phone without breaking layout. */}
      {companyStats.length > 0 && (
        <section className="rc-companies-band">
          <div className="container-bs">
            <Reveal>
              <div className="rc-companies-head">
                <span className="rc-companies-eyebrow">Now hiring</span>
                <h2 className="rc-companies-h2">Companies hiring on BharatSource</h2>
              </div>
            </Reveal>
            <div className="rc-companies-rail" ref={companiesRailRef}>
              {companyStats.slice(0, 12).map((c, i) => (
                // flex sizing lives on this Reveal wrapper, not on the Link inside it: the
                // wrapper is the rail's actual direct flex-item child, so flex-basis/shrink
                // set on the (grandchild) Link would be inert — a plain block element never
                // reads flex-* from its own CSS unless ITS OWN parent is the flex container.
                <Reveal key={c.employer.id} direction="right" delay={i * 50} style={{ flex: "0 0 208px", height: "100%", scrollSnapAlign: "start" }}>
                  <Link href={`/employer/${c.employer.slug || ""}`} className="rc-company-card">
                    <div className="rc-company-top">
                      <Avatar src={c.employer.logo || undefined} name={c.employer.companyName || "Company"} size={44} />
                      {c.employer.isVerified && (
                        <span className="rc-company-verified" title="Verified employer"><CheckIcon /></span>
                      )}
                    </div>
                    <h3 className="line-clamp-1 rc-company-name">{c.employer.companyName || "Company"}</h3>
                    <p className="line-clamp-1 rc-company-loc">
                      {[c.employer.city, c.employer.state].filter(Boolean).join(", ") || "India"}
                    </p>
                    <span className="rc-company-roles">
                      {c.count} open role{c.count === 1 ? "" : "s"} <ArrowIcon />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
            {/* Custom scroll-progress bar, native scrollbar hidden — the OS/browser-themed
                native scrollbar for a NESTED overflow-x rail (unlike the page's own root
                scrollbar) rendered as a chunky classic bar with end-arrows on this build
                regardless of ::-webkit-scrollbar/scrollbar-width styling, so this sidesteps
                that entirely with a small hand-tracked indicator that looks the same
                everywhere. */}
            {companiesScrollbar.widthPct < 100 && (
              <div className="rc-companies-scrollbar" aria-hidden="true">
                <div
                  className="rc-companies-scrollbar-thumb"
                  style={{ width: `${companiesScrollbar.widthPct}%`, left: `${companiesScrollbar.leftPct}%` }}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------- 4 · SPONSORED (self-serve, admin-approved — see RECRUITMENT.md) ----------------
          Orange (--action) eyebrow + CTA — the site's established primary-CTA/
          "sponsored" hue — so this reads as its own zone rather than blending into
          the surrounding green sections. */}
      <section className="container-bs rc-sponsored">
        <Reveal>
          <div className="rc-sponsored-head">
            <span className="rc-sponsored-eyebrow">Sponsored</span>
            <Link href={user ? "/post-job" : "/register?next=/post-job"} className="rc-sponsored-cta">
              Advertise your job here <ArrowIcon />
            </Link>
          </div>
        </Reveal>
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
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="card card-flat" style={{ padding: 16, height: 208 }}>
                    <div className="skeleton" style={{ height: "100%", borderRadius: 8 }} />
                  </div>
                ))
              : featured.map((job, i) => (
                  // height:100% so the grid's row-stretch reaches JobCard's own
                  // height:100% — every card in a row matches the tallest one
                  // instead of sizing to its own content (see JobCard.tsx).
                  <Reveal key={job.id} delay={i * 60} style={{ height: "100%" }}>
                    <JobCard job={job} layout="grid" />
                  </Reveal>
                ))}
          </div>
        </section>
      )}

      {/* ---------------- 5b · TESTIMONIALS ----------------
          Light violet tint band (--violet, decorative-surface-only per the design
          guide — never on buttons/links/text) — a third accent so the page reads
          as more than "green, then more green." Real seeded candidate reviews via
          the existing generic reviews.json, one per company for variety. */}
      {(loadingTestimonials || testimonials.length > 0) && (
        <section className="rc-testimonial-band">
          <div className="container-bs">
            <Reveal>
              <div className="rc-section-head">
                <div>
                  <span className="rc-testimonial-eyebrow">Candidate voices</span>
                  <h2 className="rc-h2">What people are saying</h2>
                </div>
              </div>
            </Reveal>
            <div className="rc-testimonial-grid">
              {loadingTestimonials
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="card card-flat" style={{ padding: 20, height: 178 }}>
                      <div className="skeleton" style={{ height: "100%", borderRadius: 8 }} />
                    </div>
                  ))
                : testimonials.map((t, i) => (
                    <Reveal key={t.reviewId} delay={i * 70}>
                      <div className="card card-flat rc-testimonial-card">
                        <div className="rc-testimonial-stars" aria-label={`${t.rating} out of 5 stars`}>
                          {Array.from({ length: 5 }).map((_, si) => (
                            <StarIcon key={si} filled={si < Math.round(t.rating)} />
                          ))}
                        </div>
                        <p className="line-clamp-3 rc-testimonial-text">&ldquo;{t.reviewText}&rdquo;</p>
                        <div className="rc-testimonial-meta">
                          <Avatar name={t.buyerName} size={32} />
                          <div className="rc-testimonial-who">
                            <span className="rc-testimonial-name">{t.buyerName}</span>
                            <span className="rc-testimonial-company line-clamp-1">on {t.company.name}</span>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
            </div>
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
              <Link href="/recruitment/blog" className="rc-see-all">
                View all guides →
              </Link>
            </div>
          </Reveal>
          <div className="rc-guides-grid">
            {guides.length > 0
              ? guides.map((b, i) => (
                  <Reveal key={b.id} delay={i * 60}>
                    <Link href={`/blog/${b.slug}`} className="card card-flat rc-guide">
                      {b.coverImage ? (
                        <span className="rc-guide-cover">
                          <img src={b.coverImage} alt="" aria-hidden loading="lazy" />
                        </span>
                      ) : (
                        <span className="rc-guide-icon"><DocIcon /></span>
                      )}
                      <h3 className="rc-guide-title">{b.title}</h3>
                      <p className="rc-guide-copy">{b.excerpt || excerptOf(b.body || "")}</p>
                      {b.authorName && <span className="rc-guide-author">{b.authorName}</span>}
                    </Link>
                  </Reveal>
                ))
              : GUIDES.map((g, i) => (
                  <Reveal key={g.title} delay={i * 60}>
                    <Link href="/recruitment/blog" className="card card-flat rc-guide">
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
                  resume stay with your one BharatSource account.
                </p>
                <Button variant="green" href="/recruitment/jobs">Browse roles</Button>
              </div>
              <div className="card card-flat rc-path rc-path-employer">
                <span className="rc-path-icon rc-path-icon-action"><BriefcaseIcon size={26} /></span>
                <h3 className="rc-path-title">Hiring for your team?</h3>
                <p className="rc-path-copy">
                  Post a role and review applicants directly — no recruiter fees, no bidding, just the
                  candidates who actually apply.
                </p>
                <Button
                  variant="primary"
                  href={user ? "/post-job" : "/register?next=/post-job"}
                >
                  {isEmployer ? "Post another role" : "Post a job — it's free"}
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
        /* :global() — styled-jsx only auto-scopes native elements (div, span, a…), never
           a custom component like next/link's <Link>: its babel transform can't know
           whether Link actually forwards the injected scope class onto the DOM node it
           renders. Every rule below that targets a <Link> (rc-func-chip, rc-company-card,
           rc-sponsored-cta, rc-see-all, rc-guide) needs :global() so the selector compiles
           without the scope-hash requirement — otherwise the rule silently never matches
           and Link renders with none of these styles (verified via CDP: the rendered
           className was the bare "rc-company-card", not "rc-company-card jsx-<hash>",
           which is what broke the mobile companies rail's flex sizing into overlapping
           51px-wide cards instead of the intended 208px). */
        :global(.rc-func-chip) {
          font-size: 13px;
          font-weight: 600;
          color: var(--tricolor-green-hover);
          background: #ffffff;
          border: 1px solid #cdebd7;
          border-radius: 999px;
          padding: 7px 15px;
          transition: background-color 140ms ease, border-color 140ms ease;
        }
        :global(.rc-func-chip):hover {
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
        .rc-stat {
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rc-stat:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-card, 0 8px 20px rgba(15, 23, 42, 0.08));
        }
        @media (prefers-reduced-motion: reduce) {
          .rc-stat {
            transition: none;
          }
          .rc-stat:hover {
            transform: none;
          }
        }

        /* ---- 3 · Companies hiring now (navy band) ---- */
        .rc-companies-band {
          margin-top: 40px;
          padding: clamp(32px, 5vw, 48px) 0;
          background: linear-gradient(120deg, var(--navy) 0%, var(--navy-mid) 55%, var(--navy-deep) 100%);
        }
        .rc-companies-head {
          margin-bottom: 22px;
        }
        .rc-companies-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8fd4a8;
        }
        .rc-companies-h2 {
          margin-top: 6px;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .rc-companies-rail {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x proximity;
          margin: 0 -2px;
          /* Native scrollbar hidden — see the custom .rc-companies-scrollbar indicator
             rendered below the rail instead (JSX comment at its call site has the why). */
          scrollbar-width: none;
        }
        .rc-companies-rail::-webkit-scrollbar {
          display: none;
        }
        .rc-companies-scrollbar {
          position: relative;
          height: 4px;
          margin-top: 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }
        .rc-companies-scrollbar-thumb {
          position: absolute;
          top: 0;
          height: 100%;
          background: rgba(255, 255, 255, 0.55);
          border-radius: 999px;
          transition: left 100ms linear;
        }
        :global(.rc-company-card) {
          /* Sizing (width/flex-basis) and scroll-snap-align live on the Reveal wrapper —
             see the .map() call site — since that wrapper is the rail's actual flex-item
             child. This just fills that box. */
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          padding: 16px;
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, border-color 200ms ease;
        }
        :global(.rc-company-card):hover {
          transform: translateY(-4px);
          background: rgba(255, 255, 255, 0.11);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .rc-company-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rc-company-verified {
          display: inline-flex;
          align-items: center;
          color: #8fd4a8;
        }
        .rc-company-name {
          font-size: 14.5px;
          font-weight: 700;
          color: #fff;
        }
        .rc-company-loc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }
        .rc-company-roles {
          margin-top: auto;
          padding-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12.5px;
          font-weight: 700;
          color: #8fd4a8;
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.rc-company-card) {
            transition: none;
          }
          :global(.rc-company-card):hover {
            transform: none;
          }
        }

        /* ---- 4 · Sponsored (orange) ---- */
        .rc-sponsored {
          padding-top: 32px;
        }
        .rc-sponsored-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .rc-sponsored-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--action-hover);
        }
        :global(.rc-sponsored-cta) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--action-hover);
          white-space: nowrap;
        }

        /* ---- 5b · Testimonials (light violet band) ---- */
        .rc-testimonial-band {
          margin-top: 8px;
          padding: clamp(32px, 5vw, 48px) 0;
          background: linear-gradient(180deg, #f6f1fd 0%, #ffffff 100%);
        }
        .rc-testimonial-eyebrow {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--violet);
        }
        .rc-testimonial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .rc-testimonial-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 20px;
          height: 100%;
          border-color: #e3d5f9;
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rc-testimonial-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-card, 0 8px 20px rgba(15, 23, 42, 0.08));
        }
        .rc-testimonial-stars {
          display: flex;
          gap: 2px;
          color: var(--violet);
        }
        .rc-testimonial-text {
          font-size: 14px;
          color: var(--ink);
          line-height: 1.6;
          flex: 1;
        }
        .rc-testimonial-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .rc-testimonial-who {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .rc-testimonial-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink);
        }
        .rc-testimonial-company {
          font-size: 12px;
          color: var(--muted);
        }
        @media (prefers-reduced-motion: reduce) {
          .rc-testimonial-card {
            transition: none;
          }
          .rc-testimonial-card:hover {
            transform: none;
          }
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
        :global(.rc-see-all) {
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
        :global(.rc-guide) {
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
        .rc-guide-cover {
          display: block;
          margin: -20px -20px 12px;
          height: 128px;
          overflow: hidden;
          background: var(--bg-subtle);
        }
        .rc-guide-cover :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .rc-guide-author {
          margin-top: auto;
          padding-top: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--tricolor-green-hover);
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
        .rc-path-employer {
          border-color: #f9d9b8;
        }
        .rc-path-icon-action {
          background: var(--action-tint);
          color: var(--action-hover);
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
