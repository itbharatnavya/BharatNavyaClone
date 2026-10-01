"use client";

// A staircase of live counts that widens downward, followed by a call-to-action
// banner. Motion: steps climb into place from the bottom, numbers count up.

import { useRef } from "react";
import Link from "next/link";
import Count from "@/components/attract/Count";
import { useStory } from "@/components/home/useStory";

export interface Step { label: string; sub: string; value: number; icon: string }
export interface Banner { title: string; body: string; primary: { href: string; label: string }; secondary: { href: string; label: string } }

const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

export default function Staircase({ id, title, lead, steps, banner }: { id: string; title: string; lead: string; steps: Step[]; banner: Banner }) {
  const root = useRef<HTMLElement>(null);
  useStory(root, ({ gsap, q }) => {
    const once = (trigger: string, start = "top 85%") => ({ trigger: q(trigger)[0], start, once: true });
    gsap.from(q(".stairs-step").reverse(), { y: 36, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", scrollTrigger: once(".stairs-list") });
    gsap.from(q(".cta-banner"), { y: 30, opacity: 0, clipPath: "inset(0% 0% 100% 0% round 24px)", duration: 0.9, ease: "power3.out", scrollTrigger: once(".cta-banner", "top 92%") });
  });
  return <section ref={root} className="ps-sec stairs" aria-labelledby={id}><div className="le-shell">
    <header className="le-section-head"><div><h2 id={id}>{title}</h2></div><p>{lead}</p></header>
    <ol className="stairs-list">
      {steps.map((step, index) => <li key={step.label} className="stairs-step" style={{ ["--w" as string]: `${58 + index * (42 / Math.max(1, steps.length - 1))}%` }}>
        <span className="stairs-icon"><Icon d={step.icon} /></span>
        <span className="stairs-copy"><strong>{step.label}</strong><small>{step.sub}</small></span>
        <b><Count to={step.value} /></b>
      </li>)}
    </ol>
    <div className="cta-banner">
      <div><h3>{banner.title}</h3><p><svg aria-hidden viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>{banner.body}</p></div>
      <div className="cta-banner-actions">
        <Link className="le-button is-primary" href={banner.primary.href}>{banner.primary.label}</Link>
        <Link className="le-button" href={banner.secondary.href}>{banner.secondary.label}</Link>
      </div>
    </div>
  </div></section>;
}
