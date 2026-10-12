"use client";

// Recruitment: "Tell us what you want, see what is out there." Three choice groups
// (workplace, level, type) drive a live count of matching open roles; a field of dots
// lights up in proportion, the middle shows the first few matching jobs, and the button
// opens the jobs page with the same filters. All open jobs are fetched once and counted
// here (same rules as the jobs API), so each option shows how many jobs it would leave and
// options that would leave none are disabled: the count never reaches 0. Styles: .rf-*.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getJobs } from "@/lib/api";
import type { Job } from "@/lib/types";
import { useStory } from "@/components/home/useStory";

type Key = "workplaceType" | "experienceLevel" | "employmentType";
const GROUPS: { key: Key; label: string; options: [string, string][] }[] = [
  { key: "workplaceType", label: "Where?", options: [["", "Anywhere"], ["onsite", "On-site"], ["hybrid", "Hybrid"], ["remote", "Remote"]] },
  { key: "experienceLevel", label: "Your level?", options: [["", "Any level"], ["entry", "Entry"], ["mid", "Mid"], ["senior", "Senior"]] },
  { key: "employmentType", label: "Job type?", options: [["", "Any type"], ["full-time", "Full-time"], ["contract", "Contract"], ["internship", "Internship"]] },
];
const DOTS = 24;

/** Number that eases from its previous value to the new one. */
function Figure({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { shown.current = value; el.textContent = String(value); return; }
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 600);
      shown.current = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      el.textContent = String(Math.round(shown.current));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span ref={ref} />;
}

const valueOf = (job: Job, key: Key) => {
  const j = job as unknown as Record<string, unknown> & { location?: { workplaceType?: string; remote?: boolean } };
  return key === "workplaceType" ? (j.location?.workplaceType || (j.location?.remote ? "remote" : "onsite")) : String(j[key] || "");
};
const matches = (job: Job, choice: Record<Key, string>) => (Object.keys(choice) as Key[]).every((key) => !choice[key] || valueOf(job, key) === choice[key]);

export default function RoleFinder() {
  const root = useRef<HTMLElement>(null);
  const [choice, setChoice] = useState<Record<Key, string>>({ workplaceType: "", experienceLevel: "", employmentType: "" });
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { getJobs({ limit: 200 }).then((response) => setJobs(response.jobs || [])).catch(() => {}); }, []);

  const total = jobs.length;
  const matched = useMemo(() => jobs.filter((job) => matches(job, choice)), [jobs, choice]);
  // How many jobs each option would leave, given the other two choices.
  const countFor = (key: Key, value: string) => jobs.filter((job) => matches(job, { ...choice, [key]: value })).length;

  useStory(root, ({ gsap, q }) => {
    // The whole board wipes in as one piece, left to right; the choices settle in behind the wipe.
    const trigger = () => ({ trigger: q(".rf-board")[0], start: "top 82%", once: true });
    gsap.fromTo(q(".rf-board"), { clipPath: "inset(0% 100% 0% 0% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 1.1, ease: "power3.inOut", clearProps: "clipPath", scrollTrigger: trigger() });
    gsap.from(q(".rf-group"), { x: -16, opacity: 0, duration: 0.6, stagger: 0.08, delay: 0.25, ease: "power2.out", scrollTrigger: trigger() });
  });

  const shown = matched.length;
  const lit = shown && total ? Math.max(1, Math.round((DOTS * shown) / total)) : 0;
  const params = new URLSearchParams();
  (Object.keys(choice) as Key[]).forEach((key) => { if (choice[key]) params.set(key, choice[key]); });
  const href = `/recruitment/jobs${params.toString() ? `?${params}` : ""}`;

  return <section ref={root} className="ps-sec rf" aria-labelledby="rf-title"><div className="le-shell">
    <header className="le-section-head"><div><h2 id="rf-title">What job do you want?</h2></div></header>
    <div className="rf-board">
      <div className="rf-controls">
        <p className="rf-hint">Pick where, your level and the job type. The count and the jobs update as you choose.</p>
        {GROUPS.map((group) => <div key={group.key} className="rf-group" role="group" aria-label={group.label}>
          <h3>{group.label}</h3>
          <div>{group.options.map(([value, label]) => { const n = total ? countFor(group.key, value) : null; const empty = n === 0; return <button key={value || "any"} type="button" aria-pressed={choice[group.key] === value} disabled={empty} title={empty ? "No open jobs with your other choices" : undefined} onClick={() => setChoice((current) => ({ ...current, [group.key]: value }))}>{label}{n !== null && n > 0 && value && <i>{n}</i>}</button>; })}</div>
        </div>)}
      </div>
      <div className="rf-preview" aria-label="Matching jobs preview">
        <p className="hs-eyebrow">Top matches</p>
        <ul role="list">
          {matched.slice(0, 3).map((job) => { const e = (job as unknown as { employer?: { companyName?: string; city?: string } }).employer; const w = valueOf(job, "workplaceType"); return <li key={job.id}><Link href={`/job/${job.id}`}>
            <span className="rf-preview-avatar" aria-hidden>{(e?.companyName || job.title).charAt(0)}</span>
            <span className="rf-preview-copy"><strong>{job.title}</strong><small>{[e?.companyName, e?.city, w === "remote" ? "Remote" : w === "hybrid" ? "Hybrid" : null].filter(Boolean).join(" · ")}</small></span>
            <svg aria-hidden viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>
          </Link></li>; })}
          {!jobs.length && [0, 1, 2].map((i) => <li key={i} className="is-loading"><span /></li>)}
        </ul>
        {shown > 3 && <p className="rf-preview-more">+ {shown - 3} more {shown - 3 === 1 ? "job" : "jobs"}</p>}
      </div>
      <div className="rf-result" aria-live="polite">
        <p className="hs-eyebrow">Matching jobs</p>
        <strong className="rf-number"><Figure value={shown} /></strong>
        <div className="rf-dots" aria-hidden>{Array.from({ length: DOTS }, (_, i) => <i key={i} className={i < lit ? "is-lit" : undefined} style={{ ["--i" as string]: i }} />)}</div>
        <Link className="le-button is-primary" href={href}>{shown > 0 ? `See ${shown} ${shown === 1 ? "job" : "jobs"}` : "Browse all jobs"}</Link>
      </div>
    </div>
  </div></section>;
}
