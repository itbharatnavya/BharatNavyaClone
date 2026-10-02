"use client";

// Recruitment, candidate side: "Never wonder where your application is." Five stages
// run down the left (what you see, what the employer sees); a phone on the right
// stays in view and its notifications arrive as each stage scrolls past. On small
// screens the phone is dropped and each stage shows its notification inline.
// The employer and role are the newest live job. Styles: .trk-*.

import { useEffect, useRef, useState } from "react";
import { getJobs } from "@/lib/api";
import { useStory } from "@/components/home/useStory";

const STAGES = [
  { title: "Applied", you: "Your profile goes straight to the employer.", them: "A new application arrives in the inbox.", note: (company: string) => `Application sent to ${company}` },
  { title: "Viewed", you: "You are told when someone opens your profile.", them: "The team reviews skills and experience.", note: (company: string) => `${company} viewed your profile` },
  { title: "Shortlisted", you: "You can see you are through to the next round.", them: "The candidate moves onto the shortlist.", note: () => "You are on the shortlist" },
  { title: "Interview", you: "The time and place arrive with the invite.", them: "The interview is scheduled from the same screen.", note: () => "Interview invite: Tue, 11:00 am" },
  { title: "Hired", you: "You get a clear, final outcome.", them: "The role is filled and the post closes.", note: (company: string) => `Offer received from ${company}` },
];

export default function TrackerScene() {
  const root = useRef<HTMLElement>(null);
  const [job, setJob] = useState<{ title: string; company: string } | null>(null);
  useEffect(() => { getJobs({ limit: 1 }).then((response) => { const first = response.jobs[0]; if (first) setJob({ title: first.title, company: first.employer?.companyName || "the employer" }); }).catch(() => {}); }, []);
  const title = job?.title || "Customer Support Executive";
  const company = job?.company || "the employer";

  useStory(root, ({ gsap, ScrollTrigger, q }) => {
    const section = root.current!;
    const steps = q(".trk-step");
    const notes = q(".trk-notes li");
    const phone = q(".trk-phone")[0];
    const label = q(".trk-stage")[0];
    section.dataset.live = "true";
    const set = (index: number) => {
      steps.forEach((step, i) => step.classList.toggle("is-active", i === index));
      notes.forEach((note, i) => note.classList.toggle("is-in", i <= index));
      phone.style.setProperty("--p", String((index + 1) / STAGES.length));
      label.textContent = STAGES[index].title;
    };
    set(0);
    // The active stage is the last one whose top has passed 45% of the viewport. Read from
    // live positions on every update, so it never depends on triggers measured earlier.
    let current = 0;
    const pick = () => {
      const line = window.innerHeight * 0.45;
      let best = 0;
      steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= line) best = i; });
      // The list ends before the last stage reaches the line, so once it is fully in view it counts as reached.
      if (steps[steps.length - 1].getBoundingClientRect().bottom <= window.innerHeight * 0.92) best = steps.length - 1;
      if (best !== current) { current = best; set(best); }
    };
    ScrollTrigger.create({ trigger: q(".trk-steps")[0], start: "top bottom", end: "bottom top", onUpdate: pick, onRefresh: pick });
    // The list itself fades in: its rows carry their own CSS opacity transition, which fights a per-row tween.
    gsap.from(q(".trk-steps"), { y: 30, opacity: 0, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: q(".trk-steps")[0], start: "top 85%", once: true } });
    return () => { delete section.dataset.live; steps.forEach((step) => step.classList.remove("is-active")); notes.forEach((note) => note.classList.remove("is-in")); };
  });

  return <section ref={root} className="ps-sec trk" aria-labelledby="trk-title"><div className="le-shell">
    <header className="le-section-head"><div><h2 id="trk-title">Never wonder where your application is.</h2></div><p>Every application moves through the same five stages, and you and the employer both see where it stands.</p></header>
    <div className="trk-board">
      <ol className="trk-steps">
        {STAGES.map((stage, i) => <li key={stage.title} className="trk-step">
          <span className="trk-num">{i + 1}</span>
          <div>
            <h3>{stage.title}</h3>
            <p><b>You see</b>{stage.you}</p>
            <p><b>Employer sees</b>{stage.them}</p>
            <p className="trk-bubble">{stage.note(company)}</p>
          </div>
        </li>)}
      </ol>
      <div className="trk-phone" aria-hidden><div className="trk-screen">
        <span className="trk-notch" />
        <p className="trk-job"><strong>{title}</strong><small>{company}</small></p>
        <div className="trk-progress"><i /></div>
        <span className="trk-stage">Applied</span>
        <ul className="trk-notes">{STAGES.map((stage, i) => <li key={stage.title} className="is-in"><span>{i + 1}</span>{stage.note(company)}</li>)}</ul>
      </div></div>
    </div>
  </div></section>;
}
