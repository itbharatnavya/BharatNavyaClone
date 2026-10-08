"use client";

// Home: "Say what you need. We find the right door." A need types itself out, a signal
// travels from it to the right product (Directory, Recruitment or Ask Navya) and that
// card opens with a live count of real matches. It shows the first need and only moves
// to another when a need is picked. Under reduced motion the text appears at once.
// Styles: .route-*.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getJobs, getListings } from "@/lib/api";
import { useStory } from "@/components/home/useStory";

const NEEDS = [
  { text: "Packaging suppliers in Pune", door: 0, label: "listings match", href: "/search?q=packaging", cta: "See results" },
  { text: "Sales manager in Bengaluru", door: 1, label: "jobs match", href: "/recruitment/jobs?q=sales", cta: "See jobs" },
  { text: "Help with GST filing", door: 2, label: "providers found", href: "#ask-navya", cta: "Ask Navya" },
];
const DOORS = [
  { name: "Directory", line: "Companies, products and services", icon: "M4 21V7l8-4 8 4v14|M8 10h2|M14 10h2|M8 14h2|M14 14h2|M9 21v-3h6v3" },
  { name: "Recruitment", line: "Jobs and employers", icon: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16" },
  { name: "Ask Navya", line: "Help in plain words", icon: "M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01" },
];

export default function RouteScene() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(NEEDS[0].text.length);
  const [counts, setCounts] = useState<number[]>([0, 0, 0]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let live = true;
    Promise.all([
      getListings({ q: "packaging", limit: 1 }).then((r) => r.total).catch(() => 0),
      getJobs({ q: "sales", limit: 1 }).then((r) => r.total).catch(() => 0),
      getListings({ q: "GST", limit: 1 }).then((r) => r.total).catch(() => 0),
    ]).then((values) => { if (live) setCounts(values); });
    return () => { live = false; };
  }, []);

  // Type the active need out, one letter at a time.
  useEffect(() => {
    if (reduced) { setTyped(NEEDS[active].text.length); return; }
    setTyped(0);
    const timer = window.setInterval(() => setTyped((value) => { if (value >= NEEDS[active].text.length) { window.clearInterval(timer); return value; } return value + 1; }), 45);
    return () => window.clearInterval(timer);
  }, [active, reduced]);

  useStory(root, ({ gsap, q }) => {
    gsap.from(q(".route-copy > *"), { y: 24, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: q(".route-stage")[0], start: "top 82%", once: true } });
    gsap.from(q(".route-board"), { clipPath: "inset(0% 0% 0% 100% round 24px)", duration: 0.9, ease: "power3.inOut", scrollTrigger: { trigger: q(".route-stage")[0], start: "top 82%", once: true } });
  });

  const need = NEEDS[active];
  return <section ref={root} className="hs-sec route" aria-labelledby="route-title"><div className="le-shell"><div className="route-stage">
    <div className="route-copy">
      <h2 id="route-title">Say what you need. We’ll find it.</h2>
      <div className="route-needs" role="group" aria-label="Try a need">
        {NEEDS.map((item, index) => <button key={item.text} type="button" aria-pressed={index === active} onClick={() => setActive(index)}>{item.text}</button>)}
      </div>
    </div>
    <div className="route-board">
      <div className="route-query">
        <small>You ask</small>
        <p aria-live="polite">{need.text.slice(0, typed)}<i className="route-caret" aria-hidden /></p>
      </div>
      <svg className="route-wires" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden focusable="false">
        {[50, 150, 250].map((y, door) => <g key={y}>
          <path d={`M0 150 C55 150 45 ${y} 100 ${y}`} className={`route-wire${door === need.door ? " is-active" : ""}`} />
          {door === need.door && <path key={active} d={`M0 150 C55 150 45 ${y} 100 ${y}`} className="route-signal" />}
        </g>)}
      </svg>
      <ol className="route-doors">
        {DOORS.map((door, index) => <li key={door.name} className={index === need.door ? "is-active" : undefined}>
          <span className="route-icon"><svg aria-hidden viewBox="0 0 24 24">{door.icon.split("|").map((path) => <path key={path} d={path} />)}</svg></span>
          <span className="route-door-copy"><strong>{door.name}</strong><small>{door.line}</small></span>
          <span className="route-result">
            <b>{counts[active].toLocaleString("en-IN")}</b> {need.label}
            <Link href={need.href} tabIndex={index === need.door ? undefined : -1}>{need.cta}<svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
          </span>
        </li>)}
      </ol>
    </div>
  </div></div></section>;
}
