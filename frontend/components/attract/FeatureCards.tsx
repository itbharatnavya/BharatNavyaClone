"use client";

// Three feature cards, each with a small looping illustration that starts when the
// card scrolls into view (motion: cards rise in 3D, then their art goes live).

import { useRef } from "react";
import Art, { type ArtName } from "@/components/attract/Art";
import { useStory } from "@/components/home/useStory";

export interface Feature { art: ArtName; title: string; body: string }

export default function FeatureCards({ id, title, lead, features }: { id: string; title: string; lead: string; features: Feature[] }) {
  const root = useRef<HTMLElement>(null);
  useStory(root, ({ gsap, ScrollTrigger, q }) => {
    const cards = q(".feat-card");
    gsap.from(cards, { y: 44, rotateX: 12, transformPerspective: 900, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", clearProps: "transform", scrollTrigger: { trigger: ".feat-grid", start: "top 85%", once: true } });
    cards.forEach((card) => ScrollTrigger.create({ trigger: card, start: "top 80%", end: "bottom 10%", onToggle: (self) => card.classList.toggle("is-live", self.isActive) }));
  });
  return <section ref={root} className="ps-sec feat" aria-labelledby={id}><div className="le-shell">
    <header className="le-section-head"><div><h2 id={id}>{title}</h2></div><p>{lead}</p></header>
    <ul className="feat-grid">
      {features.map((feature) => <li key={feature.title} className="feat-card">
        <h3>{feature.title}</h3>
        <p>{feature.body}</p>
        <div className="feat-art"><Art name={feature.art} /></div>
      </li>)}
    </ul>
  </div></section>;
}
