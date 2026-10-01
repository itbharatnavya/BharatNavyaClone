"use client";

// Home page below the hero. Five sections, each with one authored motion idea:
//   proof     live counts + an ambient category marquee
//   showcase  pinned, scrubbed three-state sequence (Directory, Recruitment, Ask Navya)
//   record    a scroll-scrubbed wipe from a thin listing to a Bharat Navya record
//   audience  two sides of business converge, with pointer tilt on desktop
//   close     a headline revealed word by word under a panel that rises into place
// Everything is plain readable content first: motion only ever starts from the
// final layout (see useStory), so reduced motion, small screens and no-JS all get
// the same content without pinning or scrubbing. Styles: .hs-* in counter-soft-system.css.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCategories, getFeaturedSellers, getJobs, getListings } from "@/lib/api";
import { mapSeller } from "@/components/home/FeaturedSellers";
import { formatSalary, jobLocation } from "@/lib/recruitmentDesign";
import { useStory, type StoryKit } from "@/components/home/useStory";

interface Row { name?: string; meta?: string; tag?: string }
interface Data { categories: string[]; categoryCount: number; listings: number; jobs: number; companies: Row[]; roles: Row[] }

function useHomeData(): Data {
  const [data, setData] = useState<Data>({ categories: [], categoryCount: 0, listings: 0, jobs: 0, companies: [], roles: [] });
  useEffect(() => {
    let live = true;
    const put = (patch: Partial<Data>) => { if (live) setData((current) => ({ ...current, ...patch })); };
    getCategories().then((list) => put({ categories: list.filter((category) => !category.parentId).map((category) => category.name), categoryCount: list.length })).catch(() => {});
    getListings({ limit: 1 }).then((response) => put({ listings: response.total })).catch(() => {});
    getJobs({ limit: 3 }).then((response) => put({
      jobs: response.total,
      roles: response.jobs.slice(0, 3).map((job) => ({ name: job.title, meta: `${job.employer?.companyName || "Company"} · ${jobLocation(job)}`, tag: formatSalary(job) })),
    })).catch(() => {});
    getFeaturedSellers().then((list) => put({
      companies: list.map(mapSeller).filter(Boolean).slice(0, 3).map((seller) => ({ name: seller!.name, meta: [seller!.city, seller!.state].filter(Boolean).join(", ") || "India" })),
    })).catch(() => {});
    return () => { live = false; };
  }, []);
  return data;
}

function Icon({ d }: { d: string }) { return <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>; }
const PATHS = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|m20 20-4-4",
  check: "m5 12.5 4.5 4.5L19 7.5",
  arrow: "M5 12h14|M13 6l6 6-6 6",
  send: "m4 12 16-8-6 16-2.5-6.5L4 12Z",
  id: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z|m9 12 2 2 4-4",
  proof: "M4 19V9|M10 19V5|M16 19v-7|M20 19H2",
  terms: "M6 3h9l4 4v14H6z|M14 3v5h5|M9 13h7|M9 17h5",
  next: "M5 12h14|M13 6l6 6-6 6",
  building: "M4 21V7l8-4 8 4v14|M8 10h2|M14 10h2|M8 14h2|M14 14h2|M9 21v-3h6v3",
  people: "M16 20v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V20|M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3|M15.5 4.3a3.5 3.5 0 0 1 0 6.4",
};

/** Whole number that counts up once when it scrolls into view. No React children:
 *  the text is owned by the effect so the animation never fights a re-render. */
function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const format = (value: number) => Math.round(value).toLocaleString("en-IN");
    const final = () => { el.textContent = to ? format(to) : "–"; };
    final();
    if (!to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    el.textContent = "0";
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1400);
        el.textContent = format(to * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); final(); };
  }, [to]);
  return <span ref={ref} />;
}

function Person({ row }: { row: Row }) {
  return <>
    <span className="hs-m-avatar">{row.name ? row.name.trim().charAt(0).toUpperCase() : <i className="hs-sk" />}</span>
    <span className="hs-m-text">{row.name ? <><strong>{row.name}</strong><small>{row.meta}</small></> : <><i className="hs-sk is-wide" /><i className="hs-sk is-thin" /></>}</span>
  </>;
}

const SHOWCASE = [
  {
    key: "directory", label: "Directory", icon: PATHS.building,
    title: "Find the business, see the proof.",
    body: "Search companies, products and services across India. Every result is a record you can inspect, shortlist and enquire from.",
    points: ["Verified companies and listings", "Compare and shortlist side by side", "One requirement, many suppliers"],
    href: "/directory", cta: "Open the Directory",
  },
  {
    key: "recruitment", label: "Recruitment", icon: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16",
    title: "Roles from companies you can research.",
    body: "Browse live roles with pay, place and workplace up front, read about the employer, then apply without leaving the page.",
    points: ["Salary and location shown first", "Employer profiles and workplace updates", "Apply in a click"],
    href: "/recruitment", cta: "Browse roles",
  },
  {
    key: "ask", label: "Ask Navya", icon: "M6 7h12a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9l-4 2v-3.2A3 3 0 0 1 3 15v-5a3 3 0 0 1 3-3Z|M8 12h.01|M12 12h.01|M16 12h.01",
    title: "Not sure where to start? Just ask.",
    body: "Describe what you need in plain words. Navya points you to the right companies, products or roles and never leaves you with a blank page.",
    points: ["Plain-language search", "Pointed to the right place", "Always an answer, never a dead end"],
    href: "#ask-navya", cta: "Try Ask Navya",
  },
];

const RECORD = [
  { icon: PATHS.id, title: "Identity", body: "Who is behind it, where they are and whether they are verified." },
  { icon: PATHS.proof, title: "Evidence", body: "Products, capabilities, work samples and public reviews." },
  { icon: PATHS.terms, title: "Terms", body: "Minimum orders, pricing and timelines before you ask." },
  { icon: PATHS.next, title: "Next step", body: "Enquire, shortlist, compare or apply from the same page." },
];

const AUDIENCE = [
  {
    key: "business", icon: PATHS.building, kicker: "For businesses", title: "Be found by people ready to act.",
    points: ["A verified company profile that carries your proof", "Products and services buyers can compare", "Enquiries and requirements in one inbox", "Post roles and hire from the same account"],
    primary: { href: "/sell", label: "List your business" }, secondary: { href: "/post-job", label: "Post a job" },
  },
  {
    key: "buyer", icon: PATHS.people, kicker: "For buyers and job seekers", title: "Skip the guesswork.",
    points: ["See who is behind every listing", "Shortlist, compare and send enquiries", "Apply for roles with one profile", "Ask Navya whenever you are unsure"],
    primary: { href: "/directory", label: "Explore the Directory" }, secondary: { href: "/recruitment", label: "Find a role" },
  },
];

const CLOSING = "Start with what you need. We’ll show you the rest.".split(" ");

/* ------------------------------------------------------------------ motion */

function pinShowcase({ gsap, q, wide }: StoryKit, root: HTMLElement): (() => void) | void {
  const section = root.querySelector<HTMLElement>(".hs-show");
  const products = q(".hs-prod");
  if (!section || products.length === 0) return;

  if (!wide) {
    // Phones and short windows: ordinary scrolling, each product rises into view.
    products.forEach((product) => {
      gsap.from(product, { clipPath: "inset(10% 0% 0% 0% round 24px)", opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: product, start: "top 88%", once: true } });
      gsap.from(product.querySelectorAll(".hs-m-row, .hs-bubble"), { y: 14, opacity: 0, duration: 0.5, stagger: 0.08, delay: 0.2, ease: "power2.out", scrollTrigger: { trigger: product, start: "top 80%", once: true } });
    });
    return;
  }

  section.dataset.pinned = "true";
  const nav = q<HTMLButtonElement>(".hs-show-nav button");
  const bars = q(".hs-show-nav i");
  const last = products.length - 1;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section.querySelector(".hs-show-pin"),
      start: "top 96px",
      end: () => `+=${Math.round(window.innerHeight * 0.9 * (last + 0.4))}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: { snapTo: "labels", duration: { min: 0.2, max: 0.5 }, ease: "power1.inOut" },
      onUpdate: () => { const index = Math.min(last, Math.round(tl.time())); nav.forEach((button, i) => button.setAttribute("aria-current", String(i === index))); },
    },
  });

  tl.addLabel("s0", 0);
  gsap.set(bars[0], { scaleX: 1 });
  products.forEach((product, i) => {
    if (i === 0) return;
    const device = product.querySelector(".hs-device");
    const incoming = i - 0.6;
    tl.to(products[i - 1], { opacity: 0, scale: 0.95, yPercent: -3, duration: 0.6 }, incoming)
      .to(products[i - 1].querySelector(".hs-device"), { rotateY: -8, duration: 0.6 }, incoming)
      .fromTo(product, { clipPath: "inset(100% 0% 0% 0% round 24px)" }, { clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 0.6 }, incoming)
      .fromTo(device, { rotateY: 10 }, { rotateY: 0, duration: 0.6 }, incoming)
      .fromTo(product.querySelectorAll(".hs-prod-copy > *"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.3 }, incoming + 0.1)
      .fromTo(product.querySelectorAll(".hs-m-row, .hs-bubble"), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.3 }, incoming + 0.15)
      .fromTo(bars[i], { scaleX: 0 }, { scaleX: 1, duration: 0.6 }, incoming)
      .addLabel(`s${i}`, i);
  });
  tl.fromTo(section.querySelector(".hs-show-bg"), { yPercent: -8 }, { yPercent: 8, duration: last + 0.4 }, 0);
  tl.to({}, { duration: 0.4 }, last); // hold the last state before the page resumes

  const jump = (index: number) => () => {
    const trigger = tl.scrollTrigger;
    if (trigger) window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * (index / tl.duration()), behavior: "smooth" });
  };
  const handlers = nav.map((button, i) => { const handler = jump(i); button.addEventListener("click", handler); return handler; });
  return () => { nav.forEach((button, i) => button.removeEventListener("click", handlers[i])); delete section.dataset.pinned; };
}

function wipeRecord({ gsap, q }: StoryKit) {
  const rich = q(".hs-rich")[0];
  if (!rich) return;
  gsap.from(q(".hs-record-copy li"), { y: 24, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: ".hs-record-copy", start: "top 82%", once: true } });
  const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ".hs-compare", start: "top 78%", end: "bottom 55%", scrub: 0.5, invalidateOnRefresh: true } });
  tl.fromTo(rich, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }, 0)
    .fromTo(".hs-compare-edge", { left: "0%", opacity: 1 }, { left: "100%" }, 0)
    .to(".hs-compare-edge", { opacity: 0, duration: 0.08 }, 0.92)
    .fromTo(q(".hs-rich-row"), { x: -16, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.12, duration: 0.22 }, 0.08);
}

function convergeAudience({ gsap, q, fine }: StoryKit): (() => void) | void {
  const cards = q(".hs-aud-card");
  cards.forEach((card, i) => {
    const side = i === 0 ? -1 : 1;
    const enter = { trigger: card, start: "top 86%", once: true };
    gsap.from(card, { xPercent: side * 5, opacity: 0, clipPath: "inset(10% 0% 0% 0% round 24px)", duration: 0.9, ease: "power3.out", scrollTrigger: enter });
    gsap.from(card.querySelectorAll(".hs-aud-body > *"), { y: 18, opacity: 0, duration: 0.5, stagger: 0.07, delay: 0.25, ease: "power2.out", scrollTrigger: enter });
  });
  if (!fine) return;
  const cleanups = cards.map((card) => {
    const rx = gsap.quickTo(card, "rotateX", { duration: 0.5, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotateY", { duration: 0.5, ease: "power3.out" });
    const move = (event: PointerEvent) => {
      const box = card.getBoundingClientRect();
      ry(((event.clientX - box.left) / box.width - 0.5) * 6);
      rx(-((event.clientY - box.top) / box.height - 0.5) * 6);
    };
    const leave = () => { rx(0); ry(0); };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    return () => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerleave", leave); };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}

function riseClosing({ gsap, q }: StoryKit) {
  const panel = q(".hs-close-panel")[0];
  if (!panel) return;
  gsap.fromTo(panel, { scale: 0.94, y: 40 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: panel, start: "top 100%", end: "top 55%", scrub: true } });
  gsap.from(q(".hs-w i"), { yPercent: 115, duration: 0.8, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: panel, start: "top 62%", once: true } });
  gsap.from(q(".hs-close-panel .hs-fade"), { y: 16, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.5, ease: "power2.out", scrollTrigger: { trigger: panel, start: "top 62%", once: true } });
  gsap.fromTo(q(".hs-close-glow"), { xPercent: -20 }, { xPercent: 20, ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true } });
}

/* ---------------------------------------------------------------- sections */

export default function HomeSections({ children }: { children?: React.ReactNode }) {
  const data = useHomeData();
  const root = useRef<HTMLDivElement>(null);
  const first = data.companies[0];

  useStory(root, (kit) => {
    const cleanups = [pinShowcase(kit, root.current!), wipeRecord(kit), convergeAudience(kit), riseClosing(kit)];
    return () => cleanups.forEach((cleanup) => typeof cleanup === "function" && cleanup());
  });

  return <div ref={root} className="hs">
    <section className="hs-sec hs-proof" aria-label="Bharat Navya at a glance"><div className="le-shell">
      <div className="hs-proof-card">
        <ul className="hs-proof-stats">
          <li><strong><Count to={data.categoryCount} /></strong><span>Categories to explore</span></li>
          <li><strong><Count to={data.listings} /></strong><span>Products and services listed</span></li>
          <li><strong><Count to={data.jobs} /></strong><span>Open roles</span></li>
        </ul>
        {data.categories.length > 0 && <div className="hs-marquee" aria-hidden>
          <div className="hs-marquee-track">{[...data.categories, ...data.categories].map((name, index) => <span key={index}>{name}</span>)}</div>
        </div>}
      </div>
    </div></section>

    <section className="hs-sec hs-show" aria-labelledby="show-title"><div className="le-shell">
      <div className="hs-show-pin">
        <span className="hs-show-bg" aria-hidden />
        <header className="hs-show-head">
          <div><p className="hs-eyebrow">One platform</p><h2 id="show-title">Three ways to move business forward.</h2></div>
          <nav className="hs-show-nav" aria-label="Platform tour">
            {SHOWCASE.map((item, index) => <button key={item.key} type="button" aria-current={index === 0}><i aria-hidden /><span>{item.label}</span></button>)}
          </nav>
        </header>
        <div className="hs-deck">
          {SHOWCASE.map((item) => <article key={item.key} className={`hs-prod is-${item.key}`}>
            <div className="hs-prod-copy">
              <span className="hs-prod-icon"><Icon d={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <ul>{item.points.map((point) => <li key={point}><Icon d={PATHS.check} />{point}</li>)}</ul>
              <Link href={item.href} className="hs-link">{item.cta}<Icon d={PATHS.arrow} /></Link>
            </div>
            <div className="hs-prod-visual"><div className="hs-device-wrap"><div className="hs-device" aria-hidden>
              {item.key === "directory" && <>
                <div className="hs-m-head"><Icon d={PATHS.search} /><strong>Companies</strong></div>
                <div className="hs-m-chips"><span>All</span><span className="is-on">Verified</span><span>Pune</span></div>
                {[0, 1, 2].map((index) => <div key={index} className="hs-m-row"><Person row={data.companies[index] || {}} />{index === 0 ? <b className="hs-m-button">Enquire</b> : <em className="hs-m-tag">Verified</em>}</div>)}
              </>}
              {item.key === "recruitment" && <>
                <div className="hs-m-head"><Icon d={item.icon} /><strong>Open roles</strong></div>
                {[0, 1, 2].map((index) => <div key={index} className="hs-m-row"><Person row={data.roles[index] || {}} />{index === 0 ? <b className="hs-m-button">Apply</b> : data.roles[index]?.tag ? <em className="hs-m-tag">{data.roles[index].tag}</em> : null}</div>)}
              </>}
              {item.key === "ask" && <>
                <div className="hs-m-head"><Icon d={item.icon} /><strong>Ask Navya</strong></div>
                <p className="hs-bubble is-user">Packaging suppliers in Pune</p>
                <p className="hs-bubble">Here are verified companies that match.</p>
                {[0, 1].map((index) => <div key={index} className="hs-m-row"><Person row={data.companies[index] || {}} /><em className="hs-m-tag">Verified</em></div>)}
              </>}
            </div></div></div>
          </article>)}
        </div>
      </div>
    </div></section>

    <section className="hs-sec hs-record" aria-labelledby="record-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="record-title">More than a name and a phone number.</h2></div><p>A listing alone tells you little. Bharat Navya puts the identity, evidence and terms behind it within reach, so you can decide before you reach out.</p></header>
      <div className="hs-record-board">
        <ul className="hs-record-copy">{RECORD.map((item) => <li key={item.title}><span><Icon d={item.icon} /></span><div><strong>{item.title}</strong><p>{item.body}</p></div></li>)}</ul>
        <div className="hs-compare" aria-label="A thin listing compared with a Bharat Navya record">
          <article className="hs-thin">
            <span className="hs-tag">A thin listing</span>
            <strong>{first?.name || "Company name"}</strong>
            <p>Category · {first?.meta || "City"}</p>
            <b>Contact now</b>
          </article>
          <article className="hs-rich">
            <span className="hs-tag is-navya">A Bharat Navya record</span>
            <div className="hs-rich-head"><span className="hs-m-avatar">{(first?.name || "B").trim().charAt(0).toUpperCase()}</span><div><strong>{first?.name || "Company name"}</strong><p>{first?.meta || "City"}</p></div><em className="hs-m-tag">Verified</em></div>
            <ul>
              <li className="hs-rich-row"><Icon d={PATHS.id} /><span>Identity</span><b>Named and verified</b></li>
              <li className="hs-rich-row"><Icon d={PATHS.proof} /><span>Evidence</span><b>Products, samples, reviews</b></li>
              <li className="hs-rich-row"><Icon d={PATHS.terms} /><span>Terms</span><b>MOQ, price, timelines</b></li>
              <li className="hs-rich-row"><Icon d={PATHS.next} /><span>Next step</span><b>Enquire or shortlist</b></li>
            </ul>
          </article>
          <i className="hs-compare-edge" aria-hidden />
        </div>
      </div>
    </div></section>

    <section className="hs-sec hs-aud" aria-labelledby="aud-title"><div className="le-shell">
      <header className="le-section-head"><div><h2 id="aud-title">Built for both sides of business.</h2></div><p>The same account works whether you are offering, buying or hiring.</p></header>
      <div className="hs-aud-grid">
        {AUDIENCE.map((item) => <article key={item.key} className={`hs-aud-card is-${item.key}`}>
          <div className="hs-aud-body">
            <span className="hs-prod-icon"><Icon d={item.icon} /></span>
            <p className="hs-eyebrow">{item.kicker}</p>
            <h3>{item.title}</h3>
            <ul>{item.points.map((point) => <li key={point}><Icon d={PATHS.check} />{point}</li>)}</ul>
            <div className="hs-aud-actions">
              <Link className="le-button is-primary" href={item.primary.href}>{item.primary.label}</Link>
              <Link className="le-button" href={item.secondary.href}>{item.secondary.label}</Link>
            </div>
          </div>
        </article>)}
      </div>
    </div></section>

    {children}

    <section className="hs-sec hs-close" aria-labelledby="close-title"><div className="le-shell">
      <div className="hs-close-panel">
        <span className="hs-close-glow" aria-hidden />
        <p className="hs-eyebrow hs-fade">From intent to action</p>
        <h2 id="close-title" aria-label={CLOSING.join(" ")}>{CLOSING.map((word, index) => <span key={index} className="hs-w" aria-hidden><i>{word}</i></span>)}</h2>
        <p className="hs-fade">Search, compare and act on companies, products, services and roles in one place.</p>
        <div className="hs-close-actions hs-fade">
          <Link className="le-button is-primary" href="/register">Create your account</Link>
          <Link className="le-button" href="/directory">Explore the Directory</Link>
        </div>
      </div>
    </div></section>
  </div>;
}
