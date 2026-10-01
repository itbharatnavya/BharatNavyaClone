"use client";

// "Without / With" comparison. Motion: the left side dims as the right side wipes in
// from the left, row by row, while the arrow settles (scrubbed to scroll).

import { useRef } from "react";
import { useStory } from "@/components/home/useStory";

export interface CompareItem { icon: string; title: string; body: string }

const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

export default function Compare({ id, title, lead, labelWithout, labelWith, without, withItems }: {
  id: string; title: string; lead: string; labelWithout: string; labelWith: string; without: CompareItem[]; withItems: CompareItem[];
}) {
  const root = useRef<HTMLElement>(null);
  useStory(root, ({ gsap, q }) => {
    const board = q(".cmp-board")[0];
    gsap.from(q(".cmp-without li"), { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: board, start: "top 85%", once: true } });
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: board, start: "top 68%", end: "top 28%", scrub: 0.5 } })
      .to(q(".cmp-without"), { opacity: 0.6, scale: 0.98 }, 0)
      .fromTo(q(".cmp-arrow"), { scale: 0.6, opacity: 0.4 }, { scale: 1, opacity: 1 }, 0)
      .fromTo(q(".cmp-with"), { clipPath: "inset(0% 100% 0% 0% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 24px)" }, 0.1)
      .fromTo(q(".cmp-with li"), { x: -18, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.15, duration: 0.3 }, 0.2);
  });
  return <section ref={root} className="ps-sec cmp" aria-labelledby={id}><div className="le-shell">
    <header className="le-section-head"><div><h2 id={id}>{title}</h2></div><p>{lead}</p></header>
    <div className="cmp-board">
      <div className="cmp-side cmp-without"><h3>{labelWithout}</h3><ul>{without.map((item) => <li key={item.title}><span><Icon d={item.icon} /></span><div><strong>{item.title}</strong><p>{item.body}</p></div></li>)}</ul></div>
      <span className="cmp-arrow" aria-hidden><Icon d="M5 12h14|M13 6l6 6-6 6" /></span>
      <div className="cmp-side cmp-with"><h3>{labelWith}</h3><ul>{withItems.map((item) => <li key={item.title}><span><Icon d={item.icon} /></span><div><strong>{item.title}</strong><p>{item.body}</p></div></li>)}</ul></div>
    </div>
  </div></section>;
}
