"use client";

// About > Our story (/about). One of the About pages (see components/about/company.tsx); the blog
// section moved out to /blog. Parts, each with its own motion idea:
//   hero        the Home hero treatment (amber title phrase on the blue panel)
//   problem     three "before / with Bharat Navya" pairs: as each scrolls through,
//               the old way is struck through and the new way wipes in (scrubbed)
//   principles  four beliefs; pointer tilt on desktop
//   live        what exists today: a line draws across and each product lights up
//   closing     headline revealed word by word under a rising panel
// Content is complete without motion; see useStory. Styles: .ab-* (plus shared .hs-*)
// in app/counter-soft-system.css.

import { useRef } from "react";
import Link from "next/link";
import { useStory } from "@/components/home/useStory";

const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;
const ARROW = "M5 12h14|M13 6l6 6-6 6";

const PAIRS = [
  { before: "A name and a phone number.", after: "A verified profile you can check." },
  { before: "Applying and never hearing back.", after: "Status both sides can see." },
  { before: "Separate tools for buying and hiring.", after: "One account for everything." },
];

const PRINCIPLES = [
  { icon: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z|m9 12 2 2 4-4", title: "Proof, not claims", body: "Show what you have done, not just what you say." },
  { icon: "M4 19V9|M10 19V5|M16 19v-7|M20 19H2", title: "Clear before contact", body: "See the details before you send a message." },
  { icon: "M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20|M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3|M15.5 4.3a3.5 3.5 0 0 1 0 6.4", title: "One account", body: "Sell, buy, hire or apply with the same login." },
  { icon: "M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01", title: "Always an answer", body: "Search and Ask Navya always point you somewhere useful." },
];

const LIVE = [
  { name: "Directory", line: "Find companies, products and services.", status: "Live", href: "/directory" },
  { name: "Recruitment", line: "Find jobs and track applications.", status: "Live", href: "/recruitment" },
  { name: "Ask Navya", line: "Ask in plain words.", status: "Live", href: "/#ask-navya" },
  { name: "Growth OS", line: "Business insights for listed companies.", status: "Coming soon", href: "" },
];

const CLOSING = "Get started.".split(" ");

export default function AboutSections() {
  const root = useRef<HTMLDivElement>(null);

  useStory(root, ({ gsap, q, fine }) => {
    const once = (trigger: string | Element, start = "top 86%") => ({ trigger, start, once: true });

    q(".ab-pair").forEach((pair) => {
      gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: pair, start: "top 78%", end: "top 42%", scrub: 0.5 } })
        .fromTo(pair.querySelector(".ab-before em"), { "--p": "0%" }, { "--p": "100%" }, 0)
        .to(pair.querySelector(".ab-before"), { opacity: 0.45 }, 0)
        .fromTo(pair.querySelector(".ab-after"), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, 0.2);
    });

    gsap.from(q(".ab-belief"), { y: 40, rotateX: 12, transformPerspective: 900, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: once(".ab-beliefs") });
    const cleanups: Array<() => void> = [];
    if (fine) q(".ab-belief").forEach((card) => {
      const rx = gsap.quickTo(card, "rotateX", { duration: 0.5, ease: "power3.out" });
      const ry = gsap.quickTo(card, "rotateY", { duration: 0.5, ease: "power3.out" });
      const move = (event: PointerEvent) => { const box = card.getBoundingClientRect(); ry(((event.clientX - box.left) / box.width - 0.5) * 8); rx(-((event.clientY - box.top) / box.height - 0.5) * 8); };
      const leave = () => { rx(0); ry(0); };
      card.addEventListener("pointermove", move); card.addEventListener("pointerleave", leave);
      cleanups.push(() => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerleave", leave); });
    });

    const stops = q(".ab-stop");
    const line = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".ab-live-track", start: "top 75%", end: "bottom 55%", scrub: 0.5 } });
    line.fromTo(".ab-live-line i", { scaleX: 0 }, { scaleX: 1, duration: stops.length }, 0);
    stops.forEach((stop, index) => line.fromTo(stop, { opacity: 0.35, y: 18 }, { opacity: 1, y: 0, duration: 0.6 }, index * 0.9));


    const panel = q(".hs-close-panel")[0];
    gsap.fromTo(panel, { scale: 0.94, y: 40 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: panel, start: "top 100%", end: "top 55%", scrub: true } });
    gsap.from(q(".hs-w i"), { yPercent: 115, duration: 0.8, stagger: 0.06, ease: "power3.out", scrollTrigger: once(panel, "top 62%") });
    gsap.from(q(".hs-close-panel .hs-fade"), { y: 16, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.5, ease: "power2.out", scrollTrigger: once(panel, "top 62%") });
    gsap.fromTo(q(".hs-close-glow"), { xPercent: -20 }, { xPercent: 20, ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true } });
    return () => cleanups.forEach((cleanup) => cleanup());
  });

  return <div ref={root} className="le-page counter-home-page hs ab ap">
    <section className="le-hero bn-home-hero" aria-labelledby="about-title"><div className="le-shell">
      <h1 id="about-title"><span>Business in India,</span> made easier to find.</h1>
      <p>Companies, products, services and jobs in one place.</p>
      <div className="ab-hero-actions">
        <Link className="le-button is-primary" href="/directory">Explore the Directory</Link>
        <Link className="le-button" href="/recruitment">Explore Recruitment</Link>
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="problem-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="problem-title">Why we started</h2></div></header>
      <div className="ab-pairs">
        {PAIRS.map((pair) => <article key={pair.before} className="ab-pair">
          <p className="ab-before"><span>Before</span><em><i>{pair.before}</i></em></p>
          <span className="ab-pair-arrow" aria-hidden><Icon d={ARROW} /></span>
          <p className="ab-after"><span>With Bharat Navya</span><strong>{pair.after}</strong></p>
        </article>)}
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="beliefs-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="beliefs-title">What we believe.</h2></div></header>
      <div className="ab-beliefs">
        {PRINCIPLES.map((item) => <article key={item.title} className="ab-belief">
          <span className="hs-prod-icon"><Icon d={item.icon} /></span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>)}
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="live-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="live-title">Live today</h2></div></header>
      <div className="ab-live">
        <div className="ab-live-line" aria-hidden><i /></div>
        <ol className="ab-live-track">
          {LIVE.map((item) => <li key={item.name} className="ab-stop">
            <span className={`ab-status${item.status === "Live" ? " is-live" : ""}`}>{item.status}</span>
            <h3>{item.name}</h3>
            <p>{item.line}</p>
            {item.href && <Link className="hs-link" href={item.href}>Open<Icon d={ARROW} /></Link>}
          </li>)}
        </ol>
      </div>
    </div></section>

    <section className="hs-sec hs-close" aria-labelledby="about-close-title"><div className="le-shell">
      <div className="hs-close-panel">
        <span className="hs-close-glow" aria-hidden />
        <h2 id="about-close-title" aria-label={CLOSING.join(" ")}>{CLOSING.map((word, index) => <span key={index} className="hs-w" aria-hidden><i>{word}</i></span>)}</h2>
        <div className="hs-close-actions hs-fade">
          <Link className="le-button is-primary" href="/directory">Explore the Directory</Link>
          <Link className="le-button" href="/recruitment">Explore Recruitment</Link>
        </div>
      </div>
    </div></section>
  </div>;
}
