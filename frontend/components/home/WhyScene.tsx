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

// India's outline (Natural Earth, public domain, India's worldview boundary at 1:10m, simplified) fitted to a 120 x 130 box, and the cities used.
const OUTLINE = "M45.3 20.3 L47.4 20.8 L46.9 21.9 L48.0 23.0 L47.3 23.8 L46.8 23.5 L45.4 24.6 L44.6 23.4 L43.3 23.7 L43.5 25.0 L44.6 26.1 L44.6 28.9 L45.3 29.0 L46.1 28.3 L47.2 30.0 L48.9 30.3 L50.3 31.2 L50.1 32.0 L53.3 33.4 L50.9 35.3 L50.3 36.7 L50.4 37.6 L49.6 39.1 L50.7 39.9 L51.3 40.2 L51.6 39.7 L53.9 41.0 L54.4 42.0 L56.6 43.1 L57.2 42.9 L58.7 43.9 L59.7 43.8 L60.0 44.6 L62.0 45.3 L62.4 44.7 L64.2 45.2 L64.1 44.9 L65.2 44.5 L67.1 45.4 L67.2 46.5 L69.7 47.8 L70.9 47.3 L71.8 48.5 L73.5 48.3 L75.2 49.1 L76.4 48.4 L76.7 49.1 L77.4 49.4 L79.6 48.9 L80.1 49.3 L80.8 47.7 L80.0 46.2 L80.7 43.5 L80.5 42.8 L82.4 42.1 L83.4 43.1 L83.0 44.5 L83.5 45.4 L82.9 46.0 L84.3 47.4 L87.1 47.9 L89.1 47.1 L90.5 47.6 L92.7 47.6 L93.2 47.2 L95.0 47.5 L95.7 47.1 L95.4 46.2 L95.8 45.5 L95.4 44.7 L93.9 44.5 L93.8 43.1 L95.3 43.7 L96.4 43.1 L96.6 43.4 L97.6 43.2 L98.3 42.6 L98.0 42.0 L100.1 41.1 L100.5 40.0 L102.8 39.7 L103.1 39.0 L104.4 38.3 L104.2 37.8 L105.4 37.1 L106.1 37.7 L108.4 38.2 L110.0 36.9 L112.1 37.3 L111.4 37.9 L111.5 38.6 L112.5 38.4 L113.1 39.6 L111.9 40.8 L115.1 41.0 L115.9 41.6 L116.0 42.6 L114.1 44.2 L115.1 46.3 L113.5 45.2 L111.3 45.6 L108.5 47.9 L107.4 48.3 L107.1 49.6 L107.5 50.6 L106.9 51.1 L107.0 51.9 L105.4 53.3 L105.2 54.1 L105.8 54.8 L103.6 59.7 L100.5 58.8 L100.9 60.4 L100.7 62.7 L99.8 63.1 L99.6 64.5 L99.9 66.3 L98.8 67.5 L98.1 66.7 L97.7 67.4 L96.4 60.3 L95.5 60.6 L95.1 60.2 L95.2 61.2 L94.5 62.1 L94.7 62.8 L93.9 63.4 L93.1 62.1 L92.8 62.8 L92.1 60.6 L93.0 58.7 L93.8 58.7 L94.4 58.1 L95.0 58.4 L95.1 57.7 L95.9 57.4 L96.3 55.4 L96.9 55.6 L97.3 55.2 L95.6 54.2 L89.2 54.3 L87.1 53.8 L87.1 50.9 L86.4 49.9 L86.0 51.0 L85.2 50.8 L84.4 50.2 L84.1 49.2 L83.5 49.2 L84.0 49.8 L82.7 49.7 L82.6 49.1 L81.5 48.3 L81.3 48.9 L82.0 49.3 L80.7 50.2 L80.4 51.5 L83.9 53.8 L83.7 54.2 L81.8 54.1 L81.4 55.5 L80.6 55.3 L80.2 56.4 L81.9 57.8 L82.9 57.9 L82.9 59.4 L82.2 60.5 L83.1 61.2 L82.8 62.2 L83.8 62.4 L83.3 63.3 L84.2 66.7 L84.2 67.6 L83.6 67.5 L84.3 68.9 L83.4 68.3 L83.4 68.8 L82.8 69.1 L83.0 66.8 L82.5 67.6 L82.6 66.5 L82.3 69.2 L82.0 69.2 L82.0 67.5 L81.9 68.9 L81.4 68.5 L81.3 68.9 L81.1 68.2 L81.1 69.2 L80.9 66.6 L79.8 65.6 L80.7 67.0 L79.5 68.5 L77.1 69.2 L76.0 70.1 L75.7 71.1 L76.1 72.3 L75.8 72.4 L76.4 72.7 L75.3 73.6 L75.3 74.3 L74.3 74.8 L74.1 75.6 L73.0 75.0 L73.9 75.7 L73.5 76.0 L70.5 77.0 L70.8 76.1 L69.6 76.5 L69.1 77.8 L69.6 77.0 L70.1 76.9 L69.9 77.4 L70.8 76.9 L67.6 79.1 L65.2 82.6 L62.7 84.2 L61.9 85.6 L58.5 87.6 L58.1 88.3 L58.5 88.4 L58.3 89.7 L56.2 90.8 L54.3 90.8 L53.3 93.1 L52.9 92.0 L52.5 93.3 L52.0 92.5 L50.5 93.4 L49.7 95.9 L50.2 98.1 L49.6 99.6 L50.0 99.5 L50.7 102.7 L50.0 101.5 L49.7 102.0 L50.7 102.8 L50.7 103.7 L50.1 106.5 L48.6 109.6 L48.8 111.2 L48.2 111.6 L48.8 111.4 L48.9 115.7 L46.7 115.9 L46.7 116.8 L45.3 119.1 L45.9 119.8 L46.9 119.8 L47.4 120.4 L45.6 119.9 L43.4 120.7 L42.5 121.6 L42.0 123.7 L39.9 124.9 L37.9 123.7 L36.2 121.4 L36.7 121.1 L36.1 121.3 L35.5 119.7 L35.0 117.1 L35.4 118.2 L35.5 117.7 L35.5 118.9 L36.0 118.9 L34.8 116.5 L35.0 116.0 L34.7 116.0 L33.1 111.3 L31.5 109.1 L31.8 108.8 L31.0 108.6 L29.6 105.3 L30.1 105.0 L29.6 105.1 L29.3 101.8 L28.3 100.3 L28.1 98.4 L26.8 97.1 L27.4 96.8 L26.9 96.9 L26.1 95.9 L25.6 94.6 L26.3 94.7 L25.4 93.9 L25.8 93.5 L25.4 93.7 L24.3 91.9 L23.4 85.6 L22.3 82.9 L22.8 83.1 L22.9 82.7 L22.3 82.4 L22.3 81.7 L22.7 81.9 L22.1 81.1 L22.3 80.5 L22.6 80.9 L22.2 80.2 L22.8 79.7 L22.5 79.1 L21.7 80.0 L21.8 78.4 L22.8 78.8 L21.7 78.2 L22.2 77.5 L21.6 77.5 L21.3 76.2 L22.4 72.5 L21.9 70.9 L21.1 71.0 L21.6 70.6 L20.9 69.9 L23.1 68.3 L20.9 68.7 L21.6 67.4 L20.7 67.4 L21.0 66.5 L22.3 66.2 L20.6 66.4 L20.3 65.8 L20.0 66.3 L19.4 66.2 L20.0 66.4 L20.0 67.0 L19.2 67.3 L18.9 67.6 L19.4 68.0 L19.0 67.8 L18.8 68.2 L19.4 68.2 L19.9 68.9 L19.2 70.6 L15.5 72.4 L14.0 72.6 L11.3 70.8 L7.1 66.1 L7.6 65.3 L8.1 66.2 L9.3 65.5 L9.6 65.9 L10.1 65.4 L11.8 65.0 L13.0 62.8 L12.6 63.4 L11.6 63.2 L9.5 64.2 L6.8 63.1 L5.1 61.4 L5.0 60.6 L6.6 59.6 L4.7 60.8 L4.0 60.7 L4.5 60.4 L4.1 60.1 L4.5 59.3 L6.2 59.2 L6.3 57.7 L6.7 58.1 L6.9 57.7 L11.0 58.4 L12.7 57.4 L13.3 57.3 L13.3 57.9 L14.0 58.1 L15.3 57.4 L14.8 56.7 L15.2 56.2 L13.6 53.3 L13.6 52.1 L12.1 52.0 L11.4 50.9 L11.7 48.6 L9.2 47.8 L9.3 46.1 L12.4 42.5 L13.2 42.5 L14.3 43.8 L18.3 42.7 L20.1 39.4 L22.3 38.2 L24.0 34.6 L26.2 33.5 L25.9 32.7 L27.7 30.6 L29.0 29.8 L28.4 29.4 L28.8 28.2 L28.6 26.7 L31.7 24.9 L30.4 24.1 L29.1 24.0 L29.0 22.5 L27.8 22.8 L25.0 21.3 L24.3 15.6 L26.5 14.1 L26.9 13.2 L25.4 12.7 L25.6 11.4 L23.8 11.1 L23.0 10.0 L20.8 9.9 L21.0 8.4 L22.6 7.5 L22.9 6.6 L26.0 6.5 L25.3 5.8 L26.6 6.1 L29.0 5.1 L29.8 5.7 L30.7 5.3 L31.6 5.7 L31.9 6.5 L33.1 6.5 L34.0 7.6 L36.9 8.8 L37.3 10.0 L39.7 10.9 L39.9 11.6 L42.2 11.4 L44.3 10.1 L46.1 10.1 L46.7 9.6 L48.4 10.3 L49.5 10.1 L50.7 11.6 L49.6 14.9 L48.9 15.0 L48.3 16.0 L47.6 16.0 L47.7 16.9 L47.2 17.6 L45.2 17.8 L45.7 19.2 L45.2 19.3Z";
const CITIES = [
  { name: "Delhi", x: 38.7, y: 40.1 },
  { name: "Mumbai", x: 22.2, y: 79.3 },
  { name: "Kolkata", x: 81.6, y: 64.9 },
  { name: "Bengaluru", x: 40.2, y: 104.5 },
  { name: "Chennai", x: 50.6, y: 104.1 },
  { name: "Ahmedabad", x: 21.1, y: 63.2 },
  { name: "Hyderabad", x: 43.7, y: 86.4 },
];
const ARCS = [[0, 1], [0, 2], [1, 3], [5, 4], [2, 6], [0, 6]];

function Icon({ d, x, y, size = 18 }: { d: string; x: number; y: number; size?: number }) {
  return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`} fill="none" stroke="#1b3fa0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d.split("|").map((path) => <path key={path} d={path} />)}</g>;
}

function Connected() {
  return <svg className="wy" viewBox="-12 -14 264 176" aria-hidden focusable="false">
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
