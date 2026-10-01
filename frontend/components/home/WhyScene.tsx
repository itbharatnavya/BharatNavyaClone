"use client";

// Home: "What makes Bharat Navya different." Three cards, each with its own looping
// illustration that starts when the card scrolls into view: everything connected
// (a hub linking companies, products, services, roles and people), trust you can check
// (a profile whose checks tick and trust ring fills) and built for all of India
// (cities linked across a map). Illustrations are decorative SVG; every animation is
// CSS (transform, opacity, stroke-dashoffset), still under reduced motion. Styles: .wy-*.

import { useRef } from "react";
import { useStory } from "@/components/home/useStory";

const NODES = [
  { x: 44, y: 38, d: "M4 21V7l8-4 8 4v14|M9 21v-4h6v4", delay: "0s" },
  { x: 120, y: 18, d: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2", delay: "0.3s" },
  { x: 196, y: 38, d: "M21 8l-9-5-9 5 9 5z|M3 8v8l9 5 9-5V8", delay: "0.6s" },
  { x: 200, y: 114, d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", delay: "0.9s" },
  { x: 40, y: 114, d: "M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3z", delay: "1.2s" },
];
const CHECKS = ["Registered business", "Address confirmed", "Reviews from buyers"];

// A rough outline of India (lon/lat projected into a 120 x 130 box) and the cities used.
const OUTLINE = "M20 9L24 4 30 8 36 6 36 12 34 18 37 22 44 23 54 28 56 31 59 33 63 31 70 32 75 31 78 28 80 32 76 35 72 42 70 49 66 52 60 56 55 54 56 60 58 63 52 70 49 77 44 84 40 90 36 94 35 96 32 92 27 81 24 72 24 60 20 50 16 45 20 40 8 38 5 34 10 31 18 28 14 22 16 16Z";
const CITIES = [
  { name: "Delhi", x: 38, y: 29 }, { name: "Mumbai", x: 22, y: 62 }, { name: "Kolkata", x: 66, y: 50 },
  { name: "Bengaluru", x: 36, y: 86 }, { name: "Chennai", x: 48, y: 85 }, { name: "Ahmedabad", x: 20, y: 47 }, { name: "Hyderabad", x: 41, y: 70 },
];
const ARCS = [[0, 1], [0, 2], [1, 3], [5, 4], [2, 6], [0, 6]];

function Icon({ d, x, y, size = 18 }: { d: string; x: number; y: number; size?: number }) {
  return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`} fill="none" stroke="#1b3fa0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d.split("|").map((path) => <path key={path} d={path} />)}</g>;
}

function Connected() {
  return <svg className="wy" viewBox="0 0 240 150" aria-hidden focusable="false">
    {NODES.map((node, i) => <g key={i}>
      <line x1="120" y1="78" x2={node.x} y2={node.y} className="wy-wire" />
      <line x1="120" y1="78" x2={node.x} y2={node.y} pathLength="100" className="wy-signal" style={{ animationDelay: `${i * 0.5}s` }} />
    </g>)}
    <circle cx="120" cy="78" r="26" className="wy-ping" />
    <circle cx="120" cy="78" r="22" fill="#1b3fa0" />
    <text x="120" y="83" textAnchor="middle" className="wy-hub">BN</text>
    {NODES.map((node, i) => <g key={`n${i}`} className="wy-node" style={{ animationDelay: node.delay, transformOrigin: `${node.x}px ${node.y}px` }}>
      <circle cx={node.x} cy={node.y} r="17" fill="#fff" stroke="#b9cce6" />
      <Icon d={node.d} x={node.x} y={node.y} />
    </g>)}
  </svg>;
}

function Trust() {
  return <svg className="wy" viewBox="0 0 240 150" aria-hidden focusable="false">
    <rect x="18" y="14" width="140" height="122" rx="14" fill="#fff" stroke="#b9cce6" />
    <circle cx="44" cy="40" r="14" fill="#dbe4fb" /><circle cx="44" cy="37" r="5" fill="#1b3fa0" /><path d="M35 49a9 7 0 0 1 18 0z" fill="#1b3fa0" />
    <rect x="66" y="31" width="72" height="7" rx="3.5" fill="#dbe4fb" /><rect x="66" y="44" width="46" height="6" rx="3" fill="#eef2fb" />
    {CHECKS.map((label, i) => <g key={label}>
      <circle cx="34" cy={74 + i * 22} r="7" fill="#dbe4fb" />
      <g className="wy-tick" style={{ animationDelay: `${0.8 + i * 0.9}s`, transformOrigin: `34px ${74 + i * 22}px` }}><circle cx="34" cy={74 + i * 22} r="7" fill="#16834f" /><path d={`m30.5 ${74 + i * 22} 2.5 2.5 4.5-5`} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></g>
      <text x="48" y={77 + i * 22} className="wy-label">{label}</text>
    </g>)}
    <g>
      <circle cx="196" cy="62" r="30" fill="none" stroke="#dbe4fb" strokeWidth="9" />
      <circle cx="196" cy="62" r="30" pathLength="100" className="wy-ring" />
      <text x="196" y="68" textAnchor="middle" className="wy-score">92</text>
      <text x="196" y="108" textAnchor="middle" className="wy-caption">Trust score</text>
    </g>
    <g className="wy-stamp"><rect x="150" y="116" width="76" height="22" rx="11" fill="#16834f" /><path d="m160 127 3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><text x="194" y="131" textAnchor="middle" className="wy-stamp-text">Verified</text></g>
  </svg>;
}

function India() {
  return <svg className="wy" viewBox="0 0 120 130" aria-hidden focusable="false">
    <path d={OUTLINE} className="wy-land" />
    {ARCS.map(([a, b], i) => {
      const from = CITIES[a], to = CITIES[b];
      const path = `M${from.x} ${from.y} Q${(from.x + to.x) / 2 + (i % 2 ? 10 : -10)} ${(from.y + to.y) / 2 - 12} ${to.x} ${to.y}`;
      return <g key={i}><path d={path} className="wy-wire" /><path d={path} pathLength="100" className="wy-signal" style={{ animationDelay: `${i * 0.6}s` }} /></g>;
    })}
    {CITIES.map((city, i) => <g key={city.name}>
      <circle cx={city.x} cy={city.y} r="3" className="wy-ping is-city" style={{ animationDelay: `${i * 0.35}s`, transformOrigin: `${city.x}px ${city.y}px` }} />
      <circle cx={city.x} cy={city.y} r="2.6" fill="#1b3fa0" />
    </g>)}
  </svg>;
}

const CARDS = [
  { art: <Connected />, title: "Everything connected", body: "Companies, products, services, roles and people live in one place, so you never have to start over somewhere else." },
  { art: <Trust />, title: "Trust you can check", body: "Verification, ratings and company details sit on every record, so you can judge before you reach out." },
  { art: <India />, title: "Built for all of India", body: "From metro hubs to industrial towns, find and be found by businesses wherever they are." },
];

export default function WhyScene() {
  const root = useRef<HTMLElement>(null);
  useStory(root, ({ gsap, ScrollTrigger, q }) => {
    const cards = q(".wy-card");
    gsap.from(cards, { y: 44, rotateX: 12, transformPerspective: 900, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", clearProps: "transform", scrollTrigger: { trigger: q(".wy-grid")[0], start: "top 85%", once: true } });
    cards.forEach((card) => ScrollTrigger.create({ trigger: card, start: "top 85%", end: "bottom 5%", onToggle: (self) => card.classList.toggle("is-live", self.isActive) }));
  });
  return <section ref={root} className="hs-sec wy" aria-labelledby="why-title"><div className="le-shell">
    <header className="le-section-head"><div><h2 id="why-title">What makes Bharat Navya different.</h2></div><p>Three ideas behind every page, search and record on the platform.</p></header>
    <ul className="wy-grid">
      {CARDS.map((card) => <li key={card.title} className="wy-card">
        <h3>{card.title}</h3>
        <p>{card.body}</p>
        <div className="wy-art">{card.art}</div>
      </li>)}
    </ul>
  </div></section>;
}
