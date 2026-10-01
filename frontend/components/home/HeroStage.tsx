"use client";

// Home hero: four cards in a row. One card at a time grows and plays a short
// scripted scene (a cursor, typing, a click) inside a miniature screen of that
// product, then collapses and hands over to the next. Every scene is a pure
// function of its clock `t` (ms), so pausing is just stopping the clock, and
// cards at rest show the scene's final frame. Rows and names come from the
// live API; where nothing has loaded yet the rows render as skeleton bars.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import HomeAgent from "@/components/home/HomeAgent";
import { mapSeller } from "@/components/home/FeaturedSellers";
import { getFeaturedSellers, getJobs } from "@/lib/api";
import { formatSalary, jobLocation } from "@/lib/recruitmentDesign";

interface Row { name?: string; meta?: string }
interface SceneProps { t: number; end: number; companies: Row[]; jobs: Row[] }

const TICK = 50;
const LEAD = 450; // card growth runs before the scene starts
const HOLD = 1400; // rest on the finished frame before handing over
const QUERY = "Packaging suppliers in Pune";

const ENDS = [7000, 6800, 6600, 4600];
const CARD_COUNT = ENDS.length;

function Icon({ d }: { d: string }) { return <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>; }
const ICONS = {
  agent: "M8.5 3.5h7|M12 2v3|M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01",
  directory: "M4 21V7l8-4 8 4v14|M8 10h2|M14 10h2|M8 14h2|M14 14h2|M9 21v-3h6v3",
  recruitment: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16",
  growth: "M4 19V9|M10 19V5|M16 19v-7|M20 19H2|M4 9l6-4 6 7 4-5",
  send: "m4 12 16-8-6 16-2.5-6.5L4 12Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|m20 20-4-4",
  check: "m5 12.5 4.5 4.5L19 7.5",
  arrow: "M5 12h14|M13 6l6 6-6 6",
};

function Cursor({ x, y, show, press }: { x: number; y: number; show: boolean; press?: boolean }) {
  return <span className={`bn-scene-cursor${show ? " is-on" : ""}${press ? " is-press" : ""}`} style={{ transform: `translate(${x}rem, ${y}rem)` }} aria-hidden>
    <svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.5L10 19 5 3z" /></svg>
  </span>;
}

function Person({ row }: { row: Row }) {
  return <>
    <span className="bn-scene-avatar">{row.name ? row.name.trim().charAt(0).toUpperCase() : <i className="bn-sk" />}</span>
    <span className="bn-scene-text">{row.name ? <><strong>{row.name}</strong><small>{row.meta}</small></> : <><i className="bn-sk is-wide" /><i className="bn-sk is-thin" /></>}</span>
  </>;
}

function AskScene({ t, end, companies }: SceneProps) {
  const at = (ms: number) => t >= ms;
  const typed = QUERY.slice(0, Math.min(QUERY.length, Math.max(0, Math.floor((t - 700) / 55))));
  const typing = at(700) && typed.length < QUERY.length;
  const cursor = !at(2400) ? { x: 21, y: 13 } : !at(4700) ? { x: 22.1, y: 2.4 } : { x: 12, y: 7.4 };
  const rows = [0, 1, 2].map((index) => companies[index] || {});
  return <div className="bn-scene">
    <div className={`bn-scene-bar${at(0) ? " is-open" : ""}`}>
      <Icon d={ICONS.search} />
      <span className="bn-scene-typed">{typed}{(typing || (at(700) && !at(3400))) && <i className="bn-scene-caret" />}</span>
      <b className={`bn-scene-send${at(2300) ? " is-ready" : ""}${at(3300) && !at(3550) ? " is-press" : ""}`}><Icon d={ICONS.send} /></b>
    </div>
    <p className={`bn-scene-label${at(3500) ? " is-in" : ""}`}>Matching records</p>
    {rows.map((row, index) => <div key={index} className={`bn-scene-row${at(3600 + index * 300) ? " is-in" : ""}${index === 0 && at(5200) ? " is-hover" : ""}`}>
      <Person row={row} />
      <em className="bn-scene-tag">Verified</em>
    </div>)}
    <Cursor x={cursor.x} y={cursor.y} show={at(2400) && t < end - 500} press={at(3300) && !at(3550)} />
  </div>;
}

function DirectoryScene({ t, end, companies }: SceneProps) {
  const at = (ms: number) => t >= ms;
  const rows = [0, 1, 2].map((index) => companies[index] || {});
  const cursor = !at(1000) ? { x: 20, y: 12 } : !at(3200) ? { x: 5.2, y: 3.5 } : { x: 21.4, y: 6.6 };
  const sent = at(4200);
  return <div className="bn-scene">
    <div className="bn-scene-head"><Icon d={ICONS.search} /><strong>Companies</strong></div>
    <div className="bn-scene-chips">
      <span className={!at(1900) ? "is-on" : ""}>All</span>
      <span className={at(1900) ? "is-on" : ""}>Verified</span>
      <span>Pune</span>
    </div>
    {rows.map((row, index) => <div key={index} className={`bn-scene-row${at(200 + index * 200) ? " is-in" : ""}${index === 1 && at(2100) ? " is-out" : ""}`}>
      <Person row={row} />
      {index === 0 && <span className={`bn-scene-button${sent ? " is-done" : ""}${at(3900) && !at(4200) ? " is-press" : ""}`}>{sent ? <><Icon d={ICONS.check} />Sent</> : "Enquire"}</span>}
      {index === 2 && <em className={`bn-scene-tag is-stamp${at(2600) ? " is-in" : ""}`}>Verified</em>}
    </div>)}
    <Cursor x={cursor.x} y={cursor.y} show={at(1000) && t < end - 500} press={(at(1700) && !at(1950)) || (at(3900) && !at(4200))} />
  </div>;
}

function RecruitmentScene({ t, end, jobs }: SceneProps) {
  const at = (ms: number) => t >= ms;
  const rows = [0, 1, 2].map((index) => jobs[index] || {});
  const cursor = !at(1000) ? { x: 20, y: 12 } : !at(2900) ? { x: 10, y: 4.3 } : { x: 20.4, y: 8.7 };
  const applied = at(3900);
  return <div className="bn-scene">
    <div className="bn-scene-head"><Icon d={ICONS.recruitment} /><strong>Open roles</strong></div>
    {rows.map((row, index) => <div key={index} className={`bn-scene-row is-job${at(200 + index * 200) ? " is-in" : ""}${index === 0 && at(1700) ? " is-hover" : ""}${index === 0 && at(2100) ? " is-open" : ""}`}>
      <Person row={row} />
      {index === 0 && <div className="bn-scene-detail">
        <span className="bn-scene-lines"><i className="bn-sk is-wide" /><i className="bn-sk is-thin" /></span>
        <span className={`bn-scene-button${applied ? " is-done" : ""}${at(3600) && !applied ? " is-press" : ""}`}>{applied ? <><Icon d={ICONS.check} />Applied</> : "Apply"}</span>
      </div>}
    </div>)}
    <Cursor x={cursor.x} y={cursor.y} show={at(1000) && t < end - 500} press={at(3600) && !applied} />
  </div>;
}

const BARS = [38, 52, 44, 66, 58, 80, 92];
function GrowthScene({ t }: SceneProps) {
  const at = (ms: number) => t >= ms;
  return <div className="bn-scene is-chart">
    <div className="bn-scene-head"><Icon d={ICONS.growth} /><strong>Overview</strong></div>
    <div className="bn-scene-chart">
      {BARS.map((height, index) => <i key={index} style={{ height: at(300 + index * 160) ? `${height}%` : "6%" }} />)}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden><path pathLength={1} className={at(1000) ? "is-drawn" : ""} d="M2 34 L18 28 L34 31 L50 20 L66 23 L82 10 L98 4" /></svg>
    </div>
    <span className={`bn-scene-pill${at(3000) ? " is-in" : ""}`}>Coming soon</span>
  </div>;
}

function Label({ icon, title, detail, soon }: { icon: string; title: string; detail: string; soon?: boolean }) {
  return <>
    <span className="bn-hstage-icon"><Icon d={icon} /></span>
    <span className="bn-hstage-copy">{soon && <em>Coming soon</em>}<strong>{title}</strong><small>{detail}</small></span>
    {!soon && <b aria-hidden><Icon d={ICONS.arrow} /></b>}
  </>;
}

export default function HeroStage() {
  const [active, setActive] = useState(0);
  const [t, setT] = useState(-LEAD);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const [companies, setCompanies] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(query.matches); setHidden(document.hidden); };
    sync();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    if (stageRef.current) observer.observe(stageRef.current);
    return () => { query.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); observer.disconnect(); };
  }, []);

  useEffect(() => {
    getFeaturedSellers().then((list) => setCompanies(list.map(mapSeller).filter(Boolean).slice(0, 3).map((seller) => ({
      name: seller!.name,
      meta: [seller!.city, seller!.state].filter(Boolean).join(", ") || "India",
    })))).catch(() => {});
    getJobs({ limit: 3 }).then((response) => setJobs(response.jobs.slice(0, 3).map((job) => ({
      name: job.title,
      meta: `${job.employer?.companyName || "Company"} · ${jobLocation(job)} · ${formatSalary(job)}`,
    })))).catch(() => {});
  }, []);

  const running = !held && !reduced && !hidden && inView;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setT((value) => value + TICK), TICK);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (t < ENDS[active] + HOLD) return;
    setActive((index) => (index + 1) % CARD_COUNT);
    setT(-LEAD);
  }, [t, active]);

  const scenes = [AskScene, DirectoryScene, RecruitmentScene, GrowthScene];
  const card = (index: number): { className: string; scene: ReactNode } => {
    const Scene = scenes[index];
    const isActive = !reduced && active === index;
    return {
      className: `bn-hstage-card${isActive ? " is-active" : ""}`,
      scene: <div className="bn-hstage-scene" aria-hidden><Scene t={isActive ? t : ENDS[index]} end={ENDS[index]} companies={companies} jobs={jobs} /></div>,
    };
  };
  const ask = card(0), directory = card(1), recruitment = card(2), growth = card(3);

  return <div
    id="ask-navya"
    ref={stageRef}
    className="bn-hstage"
    role="group"
    aria-label="Explore Bharat Navya"
    onMouseEnter={() => setHeld(true)}
    onMouseLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false); }}
  >
    <HomeAgent variant="stage" stageClassName={`${ask.className} is-ask`} scene={ask.scene}>
      <Label icon={ICONS.agent} title="Ask Navya" detail="Ask anything, get pointed right" />
    </HomeAgent>
    <Link href="/directory" className={`${directory.className} is-directory`}>{directory.scene}<span className="bn-hstage-label"><Label icon={ICONS.directory} title="Directory" detail="Companies, products, services" /></span></Link>
    <Link href="/recruitment" className={`${recruitment.className} is-recruitment`}>{recruitment.scene}<span className="bn-hstage-label"><Label icon={ICONS.recruitment} title="Recruitment" detail="Roles, employers, workplaces" /></span></Link>
    <div className={`${growth.className} is-growth`} aria-disabled="true">{growth.scene}<span className="bn-hstage-label"><Label icon={ICONS.growth} title="Growth OS" detail="Business intelligence" soon /></span></div>
  </div>;
}
