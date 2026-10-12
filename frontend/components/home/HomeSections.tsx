"use client";

// Home page below the hero. Four sections, each with one authored motion idea:
//   proof     live counts + an ambient category marquee
//   hub       a live hub that cycles Directory, Recruitment and Ask Navya (ProductHub)
//   why       three animated cards: connected, verifiable, all of India (WhyScene)
//   close     a headline revealed word by word under a panel that rises into place
// Everything is plain readable content first: motion only ever starts from the
// final layout (see useStory), so reduced motion, small screens and no-JS all get
// the same content without pinning or scrubbing. Styles: .hs-* in counter-soft-system.css.

import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCategories, getFeaturedSellers, getJobs, getListings } from "@/lib/api";
import { mapSeller } from "@/components/home/FeaturedSellers";
import { formatSalary, jobLocation } from "@/lib/recruitmentDesign";
import { useStory, type StoryKit } from "@/components/home/useStory";
import Count from "@/components/home/Count";
import WhyScene from "@/components/home/WhyScene";
import ProductHub from "@/components/home/ProductHub";

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

const CLOSING = "Start with what you need.".split(" ");

/* ------------------------------------------------------------------ motion */

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

  useStory(root, (kit) => { riseClosing(kit); });

  return <div ref={root} className="hs">
    <section className="hs-sec hs-proof" aria-label="Bharat Navya at a glance"><div className="le-shell">
      <div className="hs-proof-row">
      <div className="hs-proof-card">
        <ul className="hs-proof-stats">
          <li><strong><Count to={data.categoryCount} /></strong><span>Categories</span></li>
          <li><strong><Count to={data.listings} /></strong><span>Listings</span></li>
          <li><strong><Count to={data.jobs} /></strong><span>Open jobs</span></li>
        </ul>
        {data.categories.length > 0 && <div className="hs-marquee" aria-hidden>
          <div className="hs-marquee-track">{[...data.categories, ...data.categories].map((name, index) => <span key={index}>{name}</span>)}</div>
        </div>}
      </div>
      <div className="hs-proof-ad"><ApiAdvertisingSlot imageOnly showFallback={false} placement="home_hero" kind="native" context="Sponsored" summary="" action="View promotion" /></div>
      </div>
    </div></section>

    <section className="hs-sec hub" aria-labelledby="hub-title"><div className="le-shell">
      <ProductHub companies={data.companies} roles={data.roles} />
    </div></section>

    <WhyScene />

    {children}

    <section className="hs-sec hs-close" aria-labelledby="close-title"><div className="le-shell">
      <div className="hs-close-panel">
        <span className="hs-close-glow" aria-hidden />
        <h2 id="close-title" aria-label={CLOSING.join(" ")}>{CLOSING.map((word, index) => <span key={index} className="hs-w" aria-hidden><i>{word}</i></span>)}</h2>
        <div className="hs-close-actions hs-fade">
          <Link className="le-button is-primary" href="/register">Create your account</Link>
        </div>
      </div>
    </div></section>
  </div>;
}
