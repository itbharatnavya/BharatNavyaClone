"use client";

// Recruitment landing hero: headline, a one-row search and job-function shortcuts
// on the left; a small, quiet illustration on the right (people around a role,
// signals travelling in, a check popping on the role card); two audience paths
// along the bottom. The art is decorative SVG animated with CSS and SMIL; under
// reduced motion it holds still.

import type { ReactNode } from "react";
import Link from "next/link";
import type { Job } from "@/lib/types";

export interface FunctionShortcut { label: string; href: string; icon: ReactNode }

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
const icon = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;

const PEOPLE = [
  { x: 88, y: 110, delay: "0s" },
  { x: 392, y: 96, delay: "-1.6s" },
  { x: 70, y: 292, delay: "-3.1s" },
  { x: 410, y: 300, delay: "-4.4s" },
];

function HiringArt() {
  return <svg className="bn-ill" viewBox="0 0 480 400" aria-hidden focusable="false">
    <circle cx="240" cy="200" r="150" className="bn-ill-glow" />
    <circle cx="240" cy="200" r="100" className="bn-ill-glow is-inner" />
    <g className="bn-ill-orbit is-a"><circle cx="240" cy="200" r="120" className="bn-ill-ring" /><circle cx="360" cy="200" r="5" fill="#9db8ff" /></g>
    <g className="bn-ill-orbit is-b"><circle cx="240" cy="200" r="175" className="bn-ill-ring is-faint" /><circle cx="65" cy="200" r="4" fill="#ffbe2e" /></g>
    {PEOPLE.map((person, index) => <g key={index}>
      <line x1={person.x} y1={person.y} x2="240" y2="200" className="bn-ill-link" />
      <circle r="4.5" fill="#ffbe2e" className="bn-ill-pulse" opacity="0">
        <animateMotion dur="3.6s" begin={`${index * 0.9}s`} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.4;1" calcMode="linear" path={`M${person.x},${person.y} L240,200`} />
        <animate attributeName="opacity" dur="3.6s" begin={`${index * 0.9}s`} repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;0.04;0.34;0.4;1" />
      </circle>
    </g>)}
    {PEOPLE.map((person, index) => <g key={`p${index}`} className="bn-ill-person" style={{ animationDelay: person.delay }}>
      <circle cx={person.x} cy={person.y} r="27" fill="#fff" />
      <circle cx={person.x} cy={person.y - 6} r="7.5" fill="#1b3fa0" />
      <path d={`M${person.x - 13} ${person.y + 15} a13 11 0 0 1 26 0z`} fill="#1b3fa0" />
    </g>)}
    <circle cx="240" cy="200" r="46" className="bn-ill-pulse-ring" />
    <rect x="194" y="154" width="92" height="92" rx="24" fill="#fff" />
    <g transform="translate(214 174) scale(1.75)" fill="none" stroke="#1b3fa0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h16v11H4z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M4 13h16" /></g>
    <g className="bn-ill-check"><circle cx="284" cy="158" r="16" fill="#ffbe2e" /><path d="m276 158 6 6 10-11" fill="none" stroke="#12141b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>
    <circle cx="150" cy="56" r="5" fill="#ffbe2e" className="bn-ill-dot" />
    <circle cx="334" cy="352" r="4" fill="#9db8ff" className="bn-ill-dot is-late" />
  </svg>;
}

export default function RecruitmentHero({ id, title, search, shortcuts }: {
  id: string;
  title: string;
  search: ReactNode;
  shortcuts: FunctionShortcut[];
  jobs?: Job[];
}) {
  return <section className="le-hero bn-rhero" aria-labelledby={id}>
    <div className="le-shell bn-rhero-grid">
      <div className="bn-rhero-copy">
        <h1 id={id}>{title}</h1>
        {search}
        {shortcuts.length > 0 && <div className="bn-rhero-shortcuts" role="group" aria-label="Browse by job function">
          {shortcuts.map((item) => <Link key={item.href} href={item.href}>{item.icon}<span>{item.label}</span></Link>)}
        </div>}
      </div>
      <div className="bn-rhero-art"><HiringArt /></div>
    </div>
    <nav className="le-shell bn-rhero-paths" aria-label="Recruitment paths">
      <Link href="/recruitment/jobs" className="is-seeker">
        <span className="bn-rhero-path-icon">{icon("M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16")}</span>
        <span><small>Looking for work</small><strong>Find your next role</strong></span>
        <b aria-hidden><Arrow /></b>
      </Link>
      <Link href="/post-job" className="is-hirer">
        <span className="bn-rhero-path-icon">{icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 20a8 8 0 0 1 16 0|M18 8v4|M16 10h4")}</span>
        <span><small>Hiring</small><strong>Post a job</strong></span>
        <b aria-hidden><Arrow /></b>
      </Link>
    </nav>
  </section>;
}
