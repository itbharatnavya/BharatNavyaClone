"use client";

// Recruitment landing hero. Deliberately different from the Directory hero
// (photo underlay + three actions): copy, search and job-function shortcuts on
// the left, a live "latest roles" board on the right, and two audience paths
// (looking for work / hiring) along the bottom. The board is real API data and
// is omitted entirely when there are no roles to show.

import type { ReactNode } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { formatSalary, jobFreshness, jobLocation } from "@/lib/recruitmentDesign";
import type { Job } from "@/lib/types";

export interface FunctionShortcut { label: string; href: string; icon: ReactNode }

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
const icon = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

export default function RecruitmentHero({ id, title, search, shortcuts, jobs }: {
  id: string;
  title: string;
  search: ReactNode;
  shortcuts: FunctionShortcut[];
  jobs: Job[];
}) {
  return <section className="le-hero bn-rhero" aria-labelledby={id}>
    <div className="le-shell bn-rhero-grid">
      <div className="bn-rhero-copy">
        <h1 id={id}>{title}</h1>
        {search}
        {shortcuts.length > 0 && <div className="bn-rhero-shortcuts" role="group" aria-label="Browse by job function">
          {shortcuts.map((item) => <Link key={item.href} href={item.href}>{item.icon}<span>{item.label}</span></Link>)}
        </div>}
      </div>
      {jobs.length > 0 && <aside className="bn-rhero-board" aria-label="Latest roles">
        <header><strong>Latest roles</strong><Link href="/recruitment/jobs">View all <Arrow /></Link></header>
        <ul>
          {jobs.map((job) => <li key={job.id}><Link href={`/job/${job.id}`}>
            <Avatar src={job.employer?.logo || undefined} name={job.employer?.companyName || "Company"} size={44} />
            <span><strong>{job.title}</strong><small>{job.employer?.companyName || "Company"} · {jobLocation(job)}</small></span>
            <span><b>{formatSalary(job)}</b><small>{jobFreshness(job.postedAt)}</small></span>
          </Link></li>)}
        </ul>
      </aside>}
    </div>
    <nav className="le-shell bn-rhero-paths" aria-label="Recruitment paths">
      <Link href="/recruitment/jobs" className="is-seeker">
        <span className="bn-rhero-path-icon">{icon("M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16")}</span>
        <span><small>Looking for work</small><strong>Find your next role</strong></span>
        <b aria-hidden><Arrow /></b>
      </Link>
      <Link href="/post-job" className="is-hirer">
        <span className="bn-rhero-path-icon">{icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 20a8 8 0 0 1 16 0|M18 8v4|M16 10h4")}</span>
        <span><small>Hiring</small><strong>Post a job</strong></span>
        <b aria-hidden><Arrow /></b>
      </Link>
    </nav>
  </section>;
}
