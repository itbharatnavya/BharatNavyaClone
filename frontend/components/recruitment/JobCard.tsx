"use client";

// JobCard — Recruitment's role-first card, deliberately not a reskin of Directory's
// ListingCard: no product photo, the role title carries the hierarchy, and the accent
// color is Recruitment's own (--tricolor-green, frontend-design-guide.md's
// color-to-module mapping) instead of Directory's blue/orange. Default layout is a
// dense list ROW (one role per row) — job boards read as lists, not image tiles — with
// a compact "grid" variant for rails (e.g. the homepage's Featured roles).
//
// JobMeta/JobChips are separate components, each owning its OWN <style jsx> block —
// not JSX built as a local `const` and spliced into the parent's return via
// `{Meta}`/`{Chips}`. styled-jsx's babel transform only reliably injects a component's
// scope class onto JSX that's part of that component's own static return tree; a JSX
// value merely referenced through a variable doesn't get scoped, so the CSS silently
// never applied (verified via screenshot: chips/meta rendered with zero styling before
// this was split out). Mirrors ListingCard.tsx's MetaLine/SpecChips, which use the same
// self-contained-subcomponent shape for exactly this reason.

import React from "react";
import Link from "next/link";
import type { Job } from "@/lib/types";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth";

export interface JobCardProps {
  job: Job;
  href?: string;
  className?: string;
  layout?: "row" | "grid";
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function salaryLabel(job: Job): string {
  const sr = job.salaryRange;
  if (!sr || sr.isDisclosed === false) return "Confidential";
  if (sr.min != null && sr.max != null) return `₹${formatINR(sr.min)} – ₹${formatINR(sr.max)}`;
  if (sr.min != null) return `₹${formatINR(sr.min)}+`;
  if (sr.max != null) return `Up to ₹${formatINR(sr.max)}`;
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

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins <= 1 ? "Just posted" : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="1.8" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.2l3 1.8" />
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

// Self-contained: location/experience/employment-type row. Icon + text pairs are
// inline-styled directly (not a CSS class) since they're built from a .map() rather
// than literal JSX — same "styled-jsx can't see into a variable" reasoning as above,
// cheaper to sidestep than to route through yet another sub-component.
function JobMeta({ job }: { job: Job }) {
  const loc = job.location || {};
  const locationLabel = loc.remote ? (loc.city ? `${loc.city} · Remote` : "Remote") : loc.city || "Location not specified";
  const items: { icon: React.ReactNode; text: string }[] = [
    { icon: <PinIcon />, text: locationLabel },
    { icon: <BriefcaseIcon />, text: experienceLabel(job.experienceLevel) },
    { icon: <ClockIcon />, text: employmentLabel(job.employmentType) },
  ].filter((i) => i.text);

  return (
    <div className="jc-meta">
      {items.map((item, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          {item.icon}
          {item.text}
        </span>
      ))}
      <style jsx>{`
        .jc-meta { display: flex; flex-wrap: wrap; gap: 7px 18px; font-size: var(--fs-xs); color: var(--muted); }
      `}</style>
    </div>
  );
}

// Self-contained skill-chip row — see file header for why this is its own component.
function JobChips({ skills, max }: { skills: string[]; max: number }) {
  const visible = skills.slice(0, max);
  const more = skills.length - visible.length;
  if (visible.length === 0) return null;
  return (
    <div className="jc-chips">
      {visible.map((s) => (
        <span key={s} className="jc-chip">{s}</span>
      ))}
      {more > 0 && <span className="jc-chip jc-chip-more">+{more}</span>}
      <style jsx>{`
        .jc-chips { display: flex; flex-wrap: wrap; gap: 7px; }
        .jc-chip { font-size: var(--fs-xs); font-weight: 500; color: var(--tricolor-green-hover); background: var(--tricolor-green-tint); border: 1px solid #cdebd7; border-radius: var(--r-pill); padding: 3px 10px; white-space: nowrap; }
        .jc-chip-more { color: var(--muted); background: var(--bg-subtle); border-color: var(--border); }
      `}</style>
    </div>
  );
}

export default function JobCard({ job, href, className = "", layout = "row" }: JobCardProps) {
  const detailHref = href || `/job/${job.id}`;
  const companyName = job.employer?.companyName || "Company";
  // A recruiter account browsing the marketplace can never apply (RECRUITMENT.md §6) —
  // this card's CTA just links through to the job detail page either way (no separate
  // apply flow lives here), but the label shouldn't promise an action a recruiter can't
  // take once they get there (build plan Phase 7).
  const { user } = useAuth();
  const ctaLabel = user?.recruitmentRole === "recruiter" ? "View" : "Apply";

  if (layout === "grid") {
    return (
      <article className={["card jc-grid", className].filter(Boolean).join(" ")}>
        <Link href={detailHref} className="jc-grid-link">
          <div className="jc-grid-top">
            <Avatar src={job.employer?.logo} name={companyName} size={40} />
            {job.employer?.isVerified && (
              <span className="jc-verified" title="Verified employer"><CheckIcon /></span>
            )}
          </div>
          <h3 className="line-clamp-2 jc-grid-title">{job.title}</h3>
          <p className="line-clamp-1 jc-grid-company">{companyName}</p>
          <JobMeta job={job} />
          <div className="jc-grid-chips">
            <JobChips skills={job.skills || []} max={2} />
          </div>
        </Link>
        <div className="jc-grid-bottom">
          <span className="jc-salary">{salaryLabel(job)}</span>
          <Button size="sm" variant="green" href={detailHref}>{ctaLabel}</Button>
        </div>
        <style jsx>{`
          /* height:100% + the grid item's own reveal wrapper also set to
             height:100% (see recruitment/page.tsx) makes every card in a row
             match the tallest one, with the Apply row pinned to the bottom via
             margin-top:auto below — instead of each card sizing to its own
             content and leaving ragged rows. */
          .jc-grid { display: flex; flex-direction: column; height: 100%; padding: 16px; gap: 10px; transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease; }
          .jc-grid:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover, 0 12px 28px rgba(15, 23, 42, 0.12)); border-color: var(--tricolor-green); }
          .jc-grid-link { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
          .jc-grid-top { display: flex; align-items: center; justify-content: space-between; }
          .jc-verified { display: inline-flex; align-items: center; color: var(--tricolor-green); }
          .jc-grid-title { font-size: var(--fs-sm); font-weight: 700; color: var(--ink); line-height: 1.32; min-height: 2.64em; }
          .jc-grid-company { font-size: var(--fs-xs); color: var(--muted); }
          .jc-grid-chips { min-height: 24px; }
          .jc-grid-bottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 4px; }
          .jc-salary { font-size: var(--fs-sm); font-weight: 700; color: var(--ink); }
          @media (prefers-reduced-motion: reduce) {
            .jc-grid { transition: none; }
            .jc-grid:hover { transform: none; }
          }
        `}</style>
      </article>
    );
  }

  // ---------- ROW (default) ----------
  return (
    <article className={["card jc-row", className].filter(Boolean).join(" ")}>
      <Link href={detailHref} className="jc-row-logo">
        <Avatar src={job.employer?.logo} name={companyName} size={48} />
      </Link>

      <div className="jc-row-body">
        <div className="jc-row-headline">
          <Link href={detailHref} style={{ minWidth: 0 }}>
            <h3 className="line-clamp-1 jc-row-title">{job.title}</h3>
          </Link>
          {timeAgo(job.postedAt) && <span className="jc-posted">{timeAgo(job.postedAt)}</span>}
        </div>
        <div className="jc-row-company">
          <span className="line-clamp-1">{companyName}</span>
          {job.employer?.isVerified && (
            <span className="jc-verified" title="Verified employer">
              <CheckIcon /> Verified
            </span>
          )}
        </div>
        <JobMeta job={job} />
        <JobChips skills={job.skills || []} max={4} />
      </div>

      <div className="jc-row-side">
        <span className="jc-salary">{salaryLabel(job)}</span>
        <Button size="sm" variant="green" href={detailHref}>{ctaLabel}</Button>
      </div>

      <style jsx>{`
        .jc-row { display: flex; align-items: flex-start; gap: 16px; padding: 18px; transition: box-shadow 200ms ease, border-color 200ms ease, transform 200ms ease; }
        .jc-row:hover { border-color: var(--tricolor-green); box-shadow: var(--shadow-card-hover); transform: translateY(-2px); }
        .jc-row-logo { flex-shrink: 0; }
        .jc-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
        .jc-row-headline { display: flex; align-items: baseline; gap: 10px; }
        .jc-row-title { font-size: var(--fs-md); font-weight: 700; color: var(--ink); flex: 1; min-width: 0; }
        .jc-posted { flex-shrink: 0; font-size: var(--fs-xs); color: var(--faint); white-space: nowrap; }
        .jc-row-company { display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); color: var(--muted); font-weight: 500; min-width: 0; }
        .jc-verified { flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px; font-size: var(--fs-xs); font-weight: 700; color: var(--tricolor-green-hover); white-space: nowrap; }
        .jc-row-side { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; padding-top: 2px; }
        .jc-salary { font-size: var(--fs-sm); font-weight: 700; color: var(--ink); white-space: nowrap; }

        @media (max-width: 640px) {
          .jc-row { flex-wrap: wrap; }
          .jc-row-side { flex-direction: row-reverse; align-items: center; width: 100%; justify-content: space-between; padding-top: 4px; border-top: 1px solid var(--border); margin-top: 4px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .jc-row { transition: none; }
          .jc-row:hover { transform: none; }
        }
      `}</style>
    </article>
  );
}
