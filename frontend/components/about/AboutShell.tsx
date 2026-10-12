"use client";

// Shared frame for the About pages (Our story, Team, Careers, Contact): the home-style navy hero,
// the page body (pages are reached from the navbar About menu), and a light motion pass
// (anything marked .ap-rise fades up as it scrolls in; content is complete without it).
// Styles: .ap-* in app/counter-soft-system.css.

import { useRef, type ReactNode } from "react";
import { useStory } from "@/components/home/useStory";

export default function AboutShell({ id, title, lead, children, actions }: {
  id: string;
  title: ReactNode;
  lead?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useStory(root, ({ gsap, q }) => {
    q(".ap-rise").forEach((el) => {
      gsap.from(el, { y: 28, opacity: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    q(".ap-stagger").forEach((group) => {
      gsap.from(group.children, { y: 22, opacity: 0, duration: 0.55, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: group, start: "top 86%", once: true } });
    });
  });

  return <div ref={root} className="le-page counter-home-page hs ap">
    <section className="le-hero bn-home-hero" aria-labelledby={id}><div className="le-shell">
      <h1 id={id}>{title}</h1>
      {lead && <p>{lead}</p>}
      {actions && <div className="ab-hero-actions">{actions}</div>}
    </div></section>
    {children}
  </div>;
}
