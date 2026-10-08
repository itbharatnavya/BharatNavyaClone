"use client";

// Recruitment: "Tell us what you want, see what is out there." Three choice groups
// (workplace, level, type) drive a live count of matching open roles from the jobs
// API; a field of dots lights up in proportion and the button opens the jobs page
// with the same filters. Styles: .rf-*.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getJobs, type JobQuery } from "@/lib/api";
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

export default function RoleFinder() {
  const root = useRef<HTMLElement>(null);
  const [choice, setChoice] = useState<Record<Key, string>>({ workplaceType: "", experienceLevel: "", employmentType: "" });
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    const query: JobQuery = { limit: 1 };
    (Object.keys(choice) as Key[]).forEach((key) => { if (choice[key]) (query as Record<string, unknown>)[key] = choice[key]; });
    const timer = window.setTimeout(() => {
      getJobs(query).then((response) => { if (!live) return; setCount(response.total); if (!Object.values(choice).some(Boolean)) setTotal(response.total); }).catch(() => {});
    }, 180);
    return () => { live = false; window.clearTimeout(timer); };
  }, [choice]);
  useEffect(() => { getJobs({ limit: 1 }).then((response) => setTotal(response.total)).catch(() => {}); }, []);

  useStory(root, ({ gsap, q }) => {
    // The whole board wipes in as one piece, left to right; the choices settle in behind the wipe.
    const trigger = () => ({ trigger: q(".rf-board")[0], start: "top 82%", once: true });
    gsap.fromTo(q(".rf-board"), { clipPath: "inset(0% 100% 0% 0% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 1.1, ease: "power3.inOut", clearProps: "clipPath", scrollTrigger: trigger() });
    gsap.from(q(".rf-group"), { x: -16, opacity: 0, duration: 0.6, stagger: 0.08, delay: 0.25, ease: "power2.out", scrollTrigger: trigger() });
  });

  const shown = count ?? total;
  const lit = shown && total ? Math.max(1, Math.round((DOTS * shown) / total)) : 0;
  const params = new URLSearchParams();
  (Object.keys(choice) as Key[]).forEach((key) => { if (choice[key]) params.set(key, choice[key]); });
  const href = `/recruitment/jobs${params.toString() ? `?${params}` : ""}`;

  return <section ref={root} className="ps-sec rf" aria-labelledby="rf-title"><div className="le-shell">
    <header className="le-section-head"><div><h2 id="rf-title">What job do you want?</h2></div></header>
    <div className="rf-board">
      <div className="rf-controls">
        {GROUPS.map((group) => <div key={group.key} className="rf-group" role="group" aria-label={group.label}>
          <h3>{group.label}</h3>
          <div>{group.options.map(([value, label]) => <button key={value || "any"} type="button" aria-pressed={choice[group.key] === value} onClick={() => setChoice((current) => ({ ...current, [group.key]: value }))}>{label}</button>)}</div>
        </div>)}
      </div>
      <span className="rf-blend" aria-hidden />
      <div className="rf-result" aria-live="polite">
        <p className="hs-eyebrow">Matching jobs</p>
        <strong className="rf-number"><Figure value={shown} /></strong>
        <div className="rf-dots" aria-hidden>{Array.from({ length: DOTS }, (_, i) => <i key={i} className={i < lit ? "is-lit" : undefined} style={{ ["--i" as string]: i }} />)}</div>
        <Link className="le-button is-primary" href={href}>{shown > 0 ? `See ${shown} ${shown === 1 ? "job" : "jobs"}` : "Browse all jobs"}</Link>
      </div>
    </div>
  </div></section>;
}
