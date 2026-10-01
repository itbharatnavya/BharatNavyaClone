"use client";

// About page. Six parts, each with its own motion idea:
//   hero        the Home hero treatment (amber title phrase on the blue panel)
//   problem     three "before / with Bharat Navya" pairs: as each scrolls through,
//               the old way is struck through and the new way wipes in (scrubbed)
//   principles  four beliefs; pointer tilt on desktop
//   live        what exists today: a line draws across and each product lights up
//   articles    a featured article (its photo drifts inside the frame) and three more
//   closing     headline revealed word by word under a rising panel
// Content is complete without motion; see useStory. Styles: .ab-* (plus shared .hs-*)
// in app/counter-soft-system.css.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getBlogs } from "@/lib/api";
import { useStory } from "@/components/home/useStory";
import type { Blog } from "@/lib/types";

const Icon = ({ d }: { d: string }) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;
const ARROW = "M5 12h14|M13 6l6 6-6 6";

const PAIRS = [
  { before: "A listing with a name, a category and a phone number.", after: "A record with identity, evidence and terms you can inspect." },
  { before: "Applying for a role and never hearing back.", after: "A clear application status, visible to both sides." },
  { before: "One tool for suppliers, another for hiring, none connected.", after: "One account across companies, products, services and roles." },
];

const PRINCIPLES = [
  { icon: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z|m9 12 2 2 4-4", title: "Evidence over claims", body: "Show what a business has done and what it offers, not just what it says about itself." },
  { icon: "M4 19V9|M10 19V5|M16 19v-7|M20 19H2", title: "Clarity before contact", body: "Terms, context and status are visible before anyone has to send a message." },
  { icon: "M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20|M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3|M15.5 4.3a3.5 3.5 0 0 1 0 6.4", title: "Two sides, one account", body: "Offering, buying, hiring and applying all work from the same identity." },
  { icon: "M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01", title: "Never a dead end", body: "Search and Ask Navya always point somewhere useful, even for a vague question." },
];

const LIVE = [
  { name: "Directory", line: "Companies, products and services you can inspect and enquire from.", status: "Live", href: "/directory" },
  { name: "Recruitment", line: "Roles with context, and application status both sides can see.", status: "Live", href: "/recruitment" },
  { name: "Ask Navya", line: "Plain-language help that points to the right place.", status: "Live", href: "/#ask-navya" },
  { name: "Growth OS", line: "Business intelligence for companies already on the platform.", status: "Coming soon", href: "" },
];

const CLOSING = "Explore what comes next.".split(" ");

export default function AboutSections() {
  const root = useRef<HTMLDivElement>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  useEffect(() => { getBlogs().then((list) => setBlogs(list.filter((blog) => blog.coverImage))).catch(() => setBlogs([])); }, []);
  const [feature, ...more] = blogs.slice().sort((a, b) => +new Date(b.publishedAt || 0) - +new Date(a.publishedAt || 0)).slice(0, 4);

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

    gsap.fromTo(q(".ab-feature img"), { yPercent: -7, scale: 1.14 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: ".ab-feature", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(q(".ab-more li"), { y: 28, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: once(".ab-more") });

    const panel = q(".hs-close-panel")[0];
    gsap.fromTo(panel, { scale: 0.94, y: 40 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: panel, start: "top 100%", end: "top 55%", scrub: true } });
    gsap.from(q(".hs-w i"), { yPercent: 115, duration: 0.8, stagger: 0.06, ease: "power3.out", scrollTrigger: once(panel, "top 62%") });
    gsap.from(q(".hs-close-panel .hs-fade"), { y: 16, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.5, ease: "power2.out", scrollTrigger: once(panel, "top 62%") });
    gsap.fromTo(q(".hs-close-glow"), { xPercent: -20 }, { xPercent: 20, ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true } });
    return () => cleanups.forEach((cleanup) => cleanup());
  });

  return <div ref={root} className="le-page counter-home-page hs ab">
    <section className="le-hero bn-home-hero" aria-labelledby="about-title"><div className="le-shell">
      <h1 id="about-title"><span>Building a better way</span> to navigate the business market.</h1>
      <p>Bharat Navya brings businesses, products, services, roles and opportunities into one connected B2B platform, so it is easier to discover what exists, understand what matters and choose the right next step.</p>
      <div className="ab-hero-actions">
        <Link className="le-button is-primary" href="/directory">Explore the Directory</Link>
        <Link className="le-button" href="/recruitment">Explore Recruitment</Link>
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="problem-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="problem-title">Business information is scattered. We are putting it in one place.</h2></div><p>Most of the friction in B2B comes from not knowing enough, early enough. Here is what we set out to change.</p></header>
      <div className="ab-pairs">
        {PAIRS.map((pair) => <article key={pair.before} className="ab-pair">
          <p className="ab-before"><span>Before</span><em>{pair.before}</em></p>
          <span className="ab-pair-arrow" aria-hidden><Icon d={ARROW} /></span>
          <p className="ab-after"><span>With Bharat Navya</span><strong>{pair.after}</strong></p>
        </article>)}
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="beliefs-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="beliefs-title">What we believe.</h2></div><p>Four ideas shape every page, filter and record on the platform.</p></header>
      <div className="ab-beliefs">
        {PRINCIPLES.map((item) => <article key={item.title} className="ab-belief">
          <span className="hs-prod-icon"><Icon d={item.icon} /></span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>)}
      </div>
    </div></section>

    <section className="hs-sec" aria-labelledby="live-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="live-title">What you can use today.</h2></div><p>One account opens everything that is live, and what is coming is shown plainly.</p></header>
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

    {feature && <section className="hs-sec" aria-labelledby="articles-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="articles-title">Ideas shaping better business decisions.</h2></div><p>Practical context from companies and employers across Bharat Navya.</p><Link className="le-button" href="/blog">View all articles</Link></header>
      <div className="ab-articles">
        <Link href={`/blog/${feature.slug}`} className="ab-feature">
          <span className="ab-feature-media">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={feature.coverImage!} alt="" /></span>
          <span className="ab-feature-copy"><small>{feature.author?.companyName || feature.authorName || "Bharat Navya"}</small><strong>{feature.title}</strong><em>Read the article<Icon d={ARROW} /></em></span>
        </Link>
        <ul className="ab-more">{more.map((blog) => <li key={blog.id}><Link href={`/blog/${blog.slug}`}>
          <span className="ps-thumb">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={blog.coverImage!} alt="" loading="lazy" /></span>
          <span className="ps-story-copy"><small>{blog.author?.companyName || blog.authorName || "Bharat Navya"}</small><strong>{blog.title}</strong></span>
        </Link></li>)}</ul>
      </div>
    </div></section>}

    <section className="hs-sec hs-close" aria-labelledby="about-close-title"><div className="le-shell">
      <div className="hs-close-panel">
        <span className="hs-close-glow" aria-hidden />
        <p className="hs-eyebrow hs-fade">From intent to action</p>
        <h2 id="about-close-title" aria-label={CLOSING.join(" ")}>{CLOSING.map((word, index) => <span key={index} className="hs-w" aria-hidden><i>{word}</i></span>)}</h2>
        <p className="hs-fade">Whether you need a business, a product, a service or a role, Bharat Navya gives you a clear way to continue.</p>
        <div className="hs-close-actions hs-fade">
          <Link className="le-button is-primary" href="/directory">Explore the Directory</Link>
          <Link className="le-button" href="/recruitment">Explore Recruitment</Link>
        </div>
      </div>
    </div></section>
  </div>;
}
