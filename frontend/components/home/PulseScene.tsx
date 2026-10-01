"use client";

// Home: "Something new, every day." A live feed of the newest products, roles and
// articles on the platform (all real data). Every few seconds a new entry drops in at
// the top and the rest shift down; hovering or focusing pauses it, and under reduced
// motion it stays still. Styles: .pulse-*.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getBlogs, getJobs, getListings } from "@/lib/api";
import { jobLocation } from "@/lib/recruitmentDesign";
import { useStory } from "@/components/home/useStory";

type Kind = "product" | "role" | "article";
interface Item { id: string; kind: Kind; title: string; meta: string; when: string; href: string }

const SLOTS = 5;
const ICONS: Record<Kind, string> = {
  product: "M21 8l-9-5-9 5 9 5z|M3 8v8l9 5 9-5V8",
  role: "M4 8h16v11H4z|M9 8V6a3 3 0 0 1 6 0v2|M4 13h16",
  article: "M6 3h9l4 4v14H6z|M14 3v5h5|M9 13h7|M9 17h5",
};
const LABELS: Record<Kind, string> = { product: "New product", role: "New role", article: "New article" };

function ago(value?: string | null) {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return "Recently";
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function PulseScene() {
  const root = useRef<HTMLElement>(null);
  const [pool, setPool] = useState<Item[]>([]);
  const [tick, setTick] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let live = true;
    Promise.allSettled([getListings({ sort: "newest", limit: 5 }), getJobs({ limit: 5 }), getBlogs()]).then(([listings, jobs, blogs]) => {
      if (!live) return;
      const products: Item[] = listings.status === "fulfilled" ? listings.value.listings.map((listing) => ({ id: `p${listing.id}`, kind: "product" as const, title: listing.title, meta: `${listing.seller?.companyName || listing.sellerName || "A seller"}${listing.seller?.city ? ` · ${listing.seller.city}` : ""}`, when: ago((listing as { createdAt?: string }).createdAt), href: `/listing/${listing.id}` })) : [];
      const roles: Item[] = jobs.status === "fulfilled" ? jobs.value.jobs.map((job) => ({ id: `r${job.id}`, kind: "role" as const, title: job.title, meta: `${job.employer?.companyName || "A company"} · ${jobLocation(job)}`, when: ago(job.postedAt), href: `/job/${job.id}` })) : [];
      const articles: Item[] = blogs.status === "fulfilled" ? [...blogs.value].sort((a, b) => +new Date(b.publishedAt || 0) - +new Date(a.publishedAt || 0)).slice(0, 5).map((blog) => ({ id: `a${blog.id}`, kind: "article" as const, title: blog.title, meta: blog.author?.companyName || blog.authorName || "Bharat Navya", when: ago(blog.publishedAt), href: `/blog/${blog.slug}` })) : [];
      const mixed: Item[] = [];
      for (let i = 0; i < 5; i += 1) [products[i], roles[i], articles[i]].forEach((item) => item && mixed.push(item));
      setPool(mixed);
    });
    return () => { live = false; };
  }, []);

  const rotating = pool.length > SLOTS && !reduced && !held;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 3200);
    return () => window.clearInterval(timer);
  }, [rotating]);

  // Slot 0 is the newest entry. Each tick the window moves back one item in the pool.
  const slots = useMemo(() => {
    if (!pool.length) return [] as { item: Item; slot: number }[];
    const count = Math.min(pool.length, SLOTS + 1);
    return Array.from({ length: count }, (_, slot) => ({ item: pool[(((-tick + slot) % pool.length) + pool.length) % pool.length], slot }));
  }, [pool, tick]);

  useStory(root, ({ gsap, q }) => {
    gsap.from(q(".pulse-copy > *"), { y: 24, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: q(".pulse-stage")[0], start: "top 82%", once: true } });
    gsap.from(q(".pulse-feed"), { clipPath: "inset(0% 0% 0% 100% round 24px)", duration: 0.9, ease: "power3.inOut", scrollTrigger: { trigger: q(".pulse-stage")[0], start: "top 82%", once: true } });
  });

  if (!pool.length) return <section ref={root} className="pulse" hidden />;
  return <section ref={root} className="hs-sec pulse" aria-labelledby="pulse-title"><div className="le-shell"><div className="pulse-stage">
    <div className="pulse-copy">
      <p className="hs-eyebrow">Live on Bharat Navya</p>
      <h2 id="pulse-title">Something new, every day.</h2>
      <p>New products, new roles and new articles land all the time. Here is the latest from across the platform.</p>
      <div className="pulse-links"><Link className="le-button is-primary" href="/directory">Browse the Directory</Link><Link className="le-button" href="/recruitment">See open roles</Link></div>
    </div>
    <div className="pulse-feed" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <header><span className="pulse-dot" aria-hidden />Latest activity</header>
      <ul style={{ ["--slots" as string]: SLOTS }}>
        {slots.map(({ item, slot }) => <li key={item.id} className={slot >= SLOTS ? "is-out" : undefined} style={{ ["--slot" as string]: slot }}>
          <Link href={item.href} tabIndex={slot >= SLOTS ? -1 : undefined}>
            <span className={`pulse-icon is-${item.kind}`}><svg aria-hidden viewBox="0 0 24 24">{ICONS[item.kind].split("|").map((path) => <path key={path} d={path} />)}</svg></span>
            <span className="pulse-text"><small>{LABELS[item.kind]} · {item.when}</small><strong>{item.title}</strong><em>{item.meta}</em></span>
          </Link>
        </li>)}
      </ul>
    </div>
  </div></div></section>;
}
