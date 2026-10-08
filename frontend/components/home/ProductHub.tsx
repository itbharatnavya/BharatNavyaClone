"use client";

// Home: "One account. Three ways in." A live hub instead of a scroll-pinned tour. The Bharat
// Navya core sits in the middle of two slow rings; Directory, Recruitment and Ask Navya orbit it.
// Every few seconds one beam lights up, a pulse travels out to that product and a preview card
// shows what you get there (real company / job from the API). The list on the left follows along
// with a progress bar, and clicking an item jumps to it. It plays only while on screen, never
// locks scrolling and has no pause; under reduced motion it rests on the first product.
// Styles: .hub-* in app/counter-soft-system.css.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Row { name?: string; meta?: string; tag?: string }

const CYCLE = 3800;
const CORE = { x: 200, y: 186 };
const NODES = [
  { x: 200, y: 56 },
  { x: 62, y: 232 },
  { x: 338, y: 232 },
];
const ITEMS = [
  { key: "directory", name: "Directory", line: "Find suppliers and services", href: "/directory", cta: "Open Directory", icon: "M4 21V7l8-4 8 4v14|M8 10h2|M14 10h2|M8 14h2|M14 14h2|M9 21v-3h6v3" },
  { key: "recruitment", name: "Recruitment", line: "Find a job or hire", href: "/recruitment", cta: "Open Recruitment", icon: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16" },
  { key: "ask", name: "Ask Navya", line: "Ask in plain words", href: "#ask-navya", cta: "Try Ask Navya", icon: "M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01" },
];

function Glyph({ d, size = 24 }: { d: string; size?: number }) {
  return <>{d.split("|").map((path) => <path key={path} d={path} transform={size === 24 ? undefined : `scale(${size / 24})`} />)}</>;
}

// A gentle curve from the core to a node, bowed outwards.
function beam(i: number) {
  const n = NODES[i];
  const mx = (CORE.x + n.x) / 2, my = (CORE.y + n.y) / 2;
  const dx = n.x - CORE.x, dy = n.y - CORE.y;
  const bow = 0.18;
  return `M${CORE.x} ${CORE.y} Q${mx - dy * bow} ${my + dx * bow} ${n.x} ${n.y}`;
}

export default function ProductHub({ companies, roles }: { companies: Row[]; roles: Row[] }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting && !document.hidden), { threshold: 0.35 });
    io.observe(el);
    const vis = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const running = playing && !reduced;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setActive((i) => (i + 1) % ITEMS.length), CYCLE);
    return () => window.clearTimeout(timer);
  }, [running, active]);

  const company = companies[0] || {};
  const job = roles[0] || {};
  const item = ITEMS[active];

  return <div ref={ref} className={`hub-panel${running ? " is-running" : ""}`} style={{ ["--hub-cycle" as string]: `${CYCLE}ms` }}>
    <h2 id="hub-title" className="hub-title">One account. <span>Three ways in.</span></h2>

    <ol className="hub-list">
      {ITEMS.map((entry, i) => <li key={entry.key}>
        <button type="button" aria-pressed={i === active} onClick={() => setActive(i)}>
          <span className="hub-list-icon"><svg aria-hidden viewBox="0 0 24 24"><Glyph d={entry.icon} /></svg></span>
          <span className="hub-list-copy"><strong>{entry.name}</strong><small>{entry.line}</small></span>
          {i === active && <i key={`${active}-${running}`} className="hub-progress" aria-hidden />}
        </button>
      </li>)}
    </ol>
    <Link className="hub-cta" href={item.href}>{item.cta}<svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>

    <div className="hub-stage" aria-hidden>
      <svg className="hub-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMin slice">
        <defs>
          <pattern id="hub-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="rgb(255 255 255 / 0.16)" /></pattern>
          <radialGradient id="hub-fade" cx="50%" cy="46%" r="55%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <mask id="hub-mask"><rect width="400" height="400" fill="url(#hub-fade)" /></mask>
          <radialGradient id="hub-core" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#dbe6ff" /></radialGradient>
          <radialGradient id="hub-halo" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#7fb2ff" stopOpacity="0.55" /><stop offset="100%" stopColor="#7fb2ff" stopOpacity="0" /></radialGradient>
          <linearGradient id="hub-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffbe2e" /><stop offset="100%" stopColor="#9cc4ff" /></linearGradient>
          <filter id="hub-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>

        <rect width="400" height="400" fill="url(#hub-dots)" mask="url(#hub-mask)" />
        <circle cx={CORE.x} cy={CORE.y} r="92" fill="url(#hub-halo)" className="hub-breathe" />
        <g className="hub-ring is-a"><circle cx={CORE.x} cy={CORE.y} r="78" fill="none" stroke="rgb(255 255 255 / 0.22)" strokeDasharray="2 7" /></g>
        <g className="hub-ring is-b"><circle cx={CORE.x} cy={CORE.y} r="148" fill="none" stroke="rgb(255 255 255 / 0.14)" strokeDasharray="1 11" /><circle cx={CORE.x + 148} cy={CORE.y} r="3" fill="#9cc4ff" /></g>

        {NODES.map((_, i) => <path key={`base-${i}`} d={beam(i)} className="hub-beam-base" />)}
        <path key={`glow-${active}`} d={beam(active)} className="hub-beam-glow" filter="url(#hub-glow)" />
        <path key={`flow-${active}`} d={beam(active)} className="hub-beam-flow" />
        {!reduced && <circle key={`pkt-${active}`} r="5" className="hub-packet"><animateMotion dur="1.2s" repeatCount="indefinite" path={beam(active)} /></circle>}

        {NODES.map((node, i) => <g key={`node-${i}`} className={`hub-node${i === active ? " is-active" : ""}`}>
          {i === active && !reduced && <circle key={`pulse-${active}`} cx={node.x} cy={node.y} r="28" className="hub-pulse" />}
          <circle cx={node.x} cy={node.y} r="28" className="hub-node-disc" />
          <g transform={`translate(${node.x - 11} ${node.y - 11})`} className="hub-node-icon"><Glyph d={ITEMS[i].icon} size={22} /></g>
          <text x={node.x} y={node.y + (i === 0 ? -40 : 48)} textAnchor="middle" className="hub-node-label">{ITEMS[i].name}</text>
        </g>)}

        <circle cx={CORE.x} cy={CORE.y} r="44" fill="url(#hub-core)" className="hub-core" />
        <image href="/bharat-navya-logo.png" x={CORE.x - 26} y={CORE.y - 26} width="52" height="52" />
      </svg>

      <div key={active} className="hub-card">
        {active === 0 && <>
          <p className="hub-card-query"><svg viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><path d="m20 20-4-4" /></svg>Packaging suppliers, Pune</p>
          <div className="hub-card-row"><b>{(company.name || "B").charAt(0)}</b><span><strong>{company.name || "Loading companies"}</strong><small>{company.meta || " "}</small></span><em>Verified</em></div>
        </>}
        {active === 1 && <>
          <p className="hub-card-query"><svg viewBox="0 0 24 24"><path d="M4 8h16v11H4z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>New job</p>
          <div className="hub-card-row"><b>{(job.name || "J").charAt(0)}</b><span><strong>{job.name || "Loading jobs"}</strong><small>{job.meta || " "}</small></span><em className="is-solid">Apply</em></div>
        </>}
        {active === 2 && <>
          <p className="hub-card-bubble is-user">Who makes cartons in Pune?</p>
          <p className="hub-card-bubble">I found 3 verified suppliers near you.</p>
        </>}
      </div>
    </div>
  </div>;
}
