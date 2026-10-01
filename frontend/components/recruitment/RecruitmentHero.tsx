"use client";

// Recruitment landing hero. Not a list of roles: it explains the one thing a job
// board rarely shows, what happens after you apply, and that both sides see it.
// Left: headline, search and job-function shortcuts. Right: a short looping scene
// where a candidate profile matches a real open role and the application moves
// Applied, Viewed, Shortlisted, Hired, with what each side sees at every step.
// Two audience paths sit along the bottom. Under reduced motion the scene rests
// on the Shortlisted step.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { formatSalary, jobLocation } from "@/lib/recruitmentDesign";
import type { Job } from "@/lib/types";

export interface FunctionShortcut { label: string; href: string; icon: ReactNode }

const STEPS = [
  { label: "Applied", you: "You applied with your saved profile.", them: "A new application lands in the inbox." },
  { label: "Viewed", you: "You are told when your profile is opened.", them: "The team reviews skills and experience." },
  { label: "Shortlisted", you: "You are shortlisted for the next round.", them: "The candidate is moved to interview." },
  { label: "Hired", you: "You get a clear final outcome.", them: "The role is filled and the post closes." },
];
const FALLBACK_SKILLS = ["Your skills", "Your experience", "Your preferences"];

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
const icon = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

function MatchScene({ job }: { job?: Job }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(2); return; }
    let live = true;
    let timer = 0;
    const tick = (index: number) => {
      if (!live) return;
      setStep(index);
      timer = window.setTimeout(() => tick((index + 1) % STEPS.length), index === STEPS.length - 1 ? 2600 : 1900);
    };
    tick(0);
    return () => { live = false; window.clearTimeout(timer); };
  }, []);

  const skills = job?.skills?.length ? job.skills.slice(0, 3) : FALLBACK_SKILLS;
  const company = job?.employer?.companyName || "A hiring company";
  const current = STEPS[step];
  return <aside className="bn-rmatch" aria-label="How hiring works on Bharat Navya">
    <header><strong>Two sides, one clear process</strong><span>Live example</span></header>
    <div className="bn-rmatch-pair">
      <article className="bn-rmatch-side">
        <small>You</small>
        <span className="bn-rmatch-id"><Avatar name="You" size={40} /><strong>Your profile</strong></span>
        <ul>{skills.map((skill) => <li key={skill} className={step >= 0 ? "is-match" : undefined}>{icon("m5 12.5 4.5 4.5L19 7.5")}{skill}</li>)}</ul>
      </article>
      <span className="bn-rmatch-bridge" aria-hidden><i /><b>{job?.skills?.length ? `${skills.length} of ${skills.length} skills match` : "Profile matches"}</b></span>
      <article className="bn-rmatch-side is-role">
        <small>The role</small>
        <span className="bn-rmatch-id"><Avatar src={job?.employer?.logo || undefined} name={company} size={40} /><strong>{job?.title || "Open role"}</strong></span>
        <p>{company}{job ? ` · ${jobLocation(job)}` : ""}</p>
        {job && <b>{formatSalary(job)}</b>}
      </article>
    </div>
    <ol className="bn-rmatch-track" aria-label="Application status">
      {STEPS.map((item, index) => <li key={item.label} className={index < step ? "is-done" : index === step ? "is-current" : undefined}><i aria-hidden /><span>{item.label}</span></li>)}
    </ol>
    <div className="bn-rmatch-views" aria-live="off">
      <p key={`y${step}`}><small>You see</small>{current.you}</p>
      <p key={`t${step}`}><small>The employer sees</small>{current.them}</p>
    </div>
  </aside>;
}

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
      <MatchScene job={jobs[0]} />
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
