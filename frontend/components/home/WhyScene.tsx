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

// An outline of India projected from longitude and latitude into a 120 x 130 box, and the cities used.
const OUTLINE = "M44.0 11.2 L47.6 14.4 L48.9 18.6 L49.6 21.0 L47.6 22.8 L46.6 25.6 L47.3 27.4 L48.3 29.4 L51.6 29.4 L54.2 31.6 L51.9 34.4 L54.5 36.4 L57.8 38.2 L62.1 39.6 L65.4 41.0 L70.4 42.4 L75.3 43.1 L78.0 42.8 L77.6 39.9 L78.3 37.9 L80.6 37.5 L80.6 39.9 L82.9 41.7 L85.6 41.4 L90.2 41.0 L91.2 41.4 L90.8 38.2 L94.8 36.1 L99.1 32.9 L104.0 32.6 L106.4 36.1 L108.7 36.8 L107.3 39.9 L104.7 40.3 L101.4 44.5 L99.8 47.3 L98.1 51.5 L95.5 55.0 L94.8 57.4 L93.8 58.5 L92.2 55.4 L91.8 52.6 L89.5 51.1 L90.5 47.6 L87.5 47.3 L83.9 46.9 L83.6 44.5 L81.0 43.8 L80.6 47.3 L79.3 50.4 L78.0 49.4 L80.0 54.3 L81.0 57.1 L80.0 59.9 L76.0 59.9 L74.0 60.9 L72.7 64.4 L69.4 66.6 L67.1 68.6 L62.8 72.5 L59.5 76.0 L56.2 78.5 L53.2 80.5 L51.9 85.8 L51.9 89.3 L50.9 93.5 L50.6 97.4 L48.9 99.5 L48.6 103.0 L45.0 106.1 L43.0 107.1 L40.0 104.4 L38.7 100.9 L37.1 96.0 L34.4 90.7 L32.8 85.5 L30.8 81.2 L29.1 76.0 L27.8 69.0 L27.5 65.5 L27.2 62.0 L26.8 60.2 L25.5 61.6 L21.5 62.7 L19.2 61.3 L14.9 57.8 L18.2 55.7 L14.3 53.9 L12.3 52.6 L16.6 50.8 L19.9 50.1 L21.9 49.8 L19.6 45.6 L18.2 42.4 L19.2 38.2 L21.5 38.2 L24.5 36.8 L27.8 34.0 L31.1 30.9 L32.8 27.0 L33.8 23.5 L33.8 21.4 L32.8 18.6 L31.1 15.8 L32.4 14.0 L34.8 12.3 L39.7 10.2Z";
const CITIES = [
  { name: "Delhi", x: 42.0, y: 35.4 },
  { name: "Mumbai", x: 27.8, y: 68.6 },
  { name: "Kolkata", x: 79.0, y: 56.4 },
  { name: "Bengaluru", x: 43.3, y: 90.0 },
  { name: "Chennai", x: 52.2, y: 89.6 },
  { name: "Ahmedabad", x: 26.8, y: 55.0 },
  { name: "Hyderabad", x: 46.3, y: 74.6 },
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
  return <svg className="wy is-map" viewBox="0 0 120 130" aria-hidden focusable="false">
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
