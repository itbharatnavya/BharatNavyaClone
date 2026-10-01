"use client";

// Recruitment, employer side: "Post a role. Meet the matches." A role post types
// itself out, its skills appear, sample candidates arrive with match scores, re-rank
// by score and the best match is shortlisted. Plays once when it scrolls into view. The role is the
// newest live job; the candidates are sample data and are labelled as such. Styles: .hire-*.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getJobs } from "@/lib/api";
import { useStory } from "@/components/home/useStory";

// Listed in final (ranked) order; START is where each one first appears.
const CANDIDATES = [
  { name: "Aarav S.", meta: "6 yrs · Pune", score: 96 },
  { name: "Neha K.", meta: "4 yrs · Bengaluru", score: 91 },
  { name: "Rohit M.", meta: "5 yrs · Hyderabad", score: 84 },
  { name: "Isha P.", meta: "3 yrs · Delhi", score: 72 },
];
const START = [2, 0, 3, 1];
const POINTS = ["Structured roles candidates can trust", "Matches ranked by skills and experience", "Shortlist and update status in one place"];

export default function HireScene() {
  const root = useRef<HTMLElement>(null);
  const [job, setJob] = useState({ title: "Customer Support Executive", skills: ["Communication", "Customer Service", "CRM"] });
  useEffect(() => { getJobs({ limit: 1 }).then((response) => { const first = response.jobs[0]; if (first) setJob({ title: first.title, skills: first.skills?.length ? first.skills.slice(0, 3) : ["Communication", "Customer Service", "CRM"] }); }).catch(() => {}); }, []);

  useStory(root, ({ gsap, q }) => {
    const title = q(".hire-title span")[0];
    const fullTitle = title.textContent || "";
    const scores = q(".hire-score");
    const rows = q(".hire-row");
    const proxy = { t: 0, s: 0 };
    // Text is written from the trigger as well as the tweens: GSAP skips tween callbacks when it re-measures.
    const sync = () => {
      title.textContent = fullTitle.slice(0, Math.round(fullTitle.length * proxy.t));
      scores.forEach((el, i) => { el.textContent = String(Math.round(CANDIDATES[i].score * proxy.s)); });
    };
    const step = () => (rows[0]?.offsetHeight || 64) + parseFloat(getComputedStyle(rows[0].parentElement!).rowGap || "0");
    gsap.set(q(".hire-skills li"), { scale: 0, opacity: 0 });
    gsap.set(rows, { opacity: 0, y: (i: number) => (START[i] - i) * step() + 14 });
    gsap.set(q(".hire-bar i"), { scaleX: 0 });
    gsap.set(q(".hire-best"), { scale: 0 });
    gsap.set(q(".hire-done"), { opacity: 0 });
    sync(); // start with the title and scores empty
    // Plays once, on its own, when the board comes into view (a scrubbed range can finish before, or after, it is on screen).
    gsap.timeline({ defaults: { ease: "power2.out" }, onUpdate: sync, scrollTrigger: { trigger: q(".hire-board")[0], start: "top 68%", once: true } })
      .to(proxy, { t: 1, duration: 1.1, ease: "none" }, 0)
      .fromTo(q(".hire-skills li"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.12 }, 1.2)
      .fromTo(rows, { opacity: 0, y: (i: number) => (START[i] - i) * step() + 14 }, { opacity: 1, y: (i: number) => (START[i] - i) * step(), duration: 0.5, stagger: 0.15 }, 1.8)
      .fromTo(q(".hire-bar i"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, stagger: 0.1, ease: "none" }, 2)
      .to(proxy, { s: 1, duration: 0.8, ease: "none" }, 2)
      .to(rows, { y: 0, duration: 0.8, ease: "power2.inOut" }, 3.2)
      .fromTo(q(".hire-best"), { scale: 0 }, { scale: 1, duration: 0.3 }, 4)
      .to(q(".hire-shortlist"), { scale: 0.94, duration: 0.1 }, 4.5)
      .to(q(".hire-shortlist"), { scale: 1, duration: 0.1 }, 4.6)
      .fromTo(q(".hire-done"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3 }, 4.7);
    return () => { title.textContent = fullTitle; scores.forEach((el, i) => { el.textContent = String(CANDIDATES[i].score); }); };
  });

  return <section ref={root} className="ps-sec hire" aria-labelledby="hire-title"><div className="le-shell"><div className="hire-stage">
    <div className="hire-copy">
      <p className="hs-eyebrow">For employers</p>
      <h2 id="hire-title">Post a role. Meet the matches.</h2>
      <ul>{POINTS.map((point) => <li key={point}><svg aria-hidden viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>{point}</li>)}</ul>
      <div className="hire-actions"><Link className="le-button is-primary" href="/post-job">Post a job</Link><Link className="le-button" href="/pricing">See pricing</Link></div>
    </div>
    <div className="hire-board" aria-hidden>
      <div className="hire-post">
        <small>New role</small>
        <p className="hire-title"><span>{job.title}</span><i className="rfq-caret" /></p>
        <ul className="hire-skills">{job.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>
      </div>
      <ol className="hire-rows">
        {CANDIDATES.map((candidate, i) => <li key={candidate.name} className={`hire-row${i === 0 ? " is-best" : ""}`}>
          <span className="hire-avatar">{candidate.name.charAt(0)}</span>
          <span className="hire-who"><strong>{candidate.name}</strong><small>{candidate.meta}</small></span>
          <span className="hire-bar"><i style={{ width: `${candidate.score}%` }} /></span>
          <b><span className="hire-score">{candidate.score}</span>%</b>
          {i === 0 && <>
            <em className="hire-best">Best match</em>
            <span className="hire-shortlist">Shortlist</span>
            <em className="hire-done"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>Shortlisted</em>
          </>}
        </li>)}
      </ol>
      <p className="hire-note">Sample candidates, shown for illustration.</p>
    </div>
  </div></div></section>;
}
