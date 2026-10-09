"use client";

// Shared frame for the About pages (Our story, Team, Careers, Contact): the home-style navy hero,
// a switcher row linking the sibling pages (Blog included), the page body, and a light motion pass
// (anything marked .ap-rise fades up as it scrolls in; content is complete without it).
// Styles: .ap-* in app/counter-soft-system.css.

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStory } from "@/components/home/useStory";
import { ABOUT_PAGES } from "./company";

export function AboutSwitcher() {
  const path = usePathname() || "/about";
  return <nav className="ap-switch" aria-label="About Bharat Navya">
    {ABOUT_PAGES.map((page) => <Link key={page.href} href={page.href} aria-current={page.match(path) ? "page" : undefined}>
      <span className="ap-switch-icon">{page.icon}</span>{page.label}
    </Link>)}
  </nav>;
}

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
    <div className="le-shell ap-switch-wrap"><AboutSwitcher /></div>
    {children}
  </div>;
}
