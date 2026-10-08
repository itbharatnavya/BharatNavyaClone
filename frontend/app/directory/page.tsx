"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StoryRail from "@/components/StoryRail";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import { useCategoryTree } from "@/lib/catalog";
import { imgFor } from "@/lib/categoryImages";
import { iconFor } from "@/components/home/FeaturedCategories";
import LandingHero, { CategoryShowcase, HeroChips, type HeroAction, type HeroSlide } from "@/components/discovery/LandingHero";
import { getStories } from "@/lib/api";
import type { Category, StoryGroup } from "@/lib/types";
import type { MegaLeaf } from "@/components/discovery/CategoryMegaMenu";
import { DirectorySectionSearch } from "@/components/SectionSearchDock";
import { dockEdge, useSearchDock } from "@/lib/searchDock";
import DirectorySections from "@/components/directory/DirectorySections";

// Hero photos are presentation media from the local /demo set.
const directorySlides: HeroSlide[] = [
  { src: "/demo/packaging-1.jpg" },
  { src: "/demo/machinery-1.jpg" },
  { src: "/demo/apparel-1.jpg" },
  { src: "/demo/industry-1.jpg" },
  { src: "/demo/agriculture-2.jpg" },
];

const actionIcon = (d: string) => <svg aria-hidden viewBox="0 0 24 24">{d.split("|").map((path) => <path key={path} d={path} />)}</svg>;
const directoryActions: HeroAction[] = [
  { title: "Search the Directory", detail: "Companies, products and services", href: "/search", icon: actionIcon("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|m20 20-4-4") },
  { title: "List your business", detail: "Add your company for free", href: "/sell", icon: actionIcon("M4 9l1.5-5h13L20 9|M4 9h16v11H4z|M9 20v-6h6v6") },
  { title: "Promote your company", detail: "Get seen by more buyers", href: "/pricing", icon: actionIcon("M4 10v4l11 5V5z|M15 9a3 3 0 0 1 0 6|M7 15l1 5h3l-1-4") },
];


export default function DirectoryPage() {
  const router = useRouter();
  const { tree } = useCategoryTree();
  const { docked, setProgress, setQuery, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const heroFocusedRef = useRef(false);
  const pendingDockRef = useRef<boolean | null>(null);
  const [stories, setStories] = useState<StoryGroup[]>([]);

  useEffect(() => { getStories("seller").then(setStories).catch(() => setStories([])); }, []);
  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const edge = dockEdge(); const observer = new IntersectionObserver(([entry]) => { const shouldDock = !entry.isIntersecting && entry.boundingClientRect.bottom <= edge; if (heroFocusedRef.current && shouldDock) { pendingDockRef.current = true; return; } pendingDockRef.current = null; setProgress(shouldDock ? 1 : 0); }, { threshold: 0, rootMargin: `-${edge}px 0px 0px 0px` });
    observer.observe(anchor);
    return () => { observer.disconnect(); setProgress(0); };
  }, [setProgress]);
  useEffect(() => {
    searchAnchorRef.current?.toggleAttribute("inert", docked);
  }, [docked]);

  function runExample(item: string) { setQuery(item); markSearchNav(); router.push(`/search?q=${encodeURIComponent(item)}`); }
  const popularCategories = useMemo(() => [...tree].sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0) || a.order - b.order).slice(0, 4).map((category) => ({ label: category.name.split(/[,&]/)[0].trim(), href: `/search?category=${encodeURIComponent(category.slug)}`, icon: iconFor(category) })), [tree]);
  const categoryMenu = useMemo(() => {
    const leaf = (category: Category): MegaLeaf => ({ label: category.name, href: `/search?category=${encodeURIComponent(category.slug)}`, children: [...(category.children || [])].sort((a, b) => a.name.localeCompare(b.name)).map(leaf) });
    return [...tree].sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0) || a.order - b.order).map((category) => ({ ...leaf(category), image: `/demo/${imgFor(category)}.jpg`, count: category.listingCount || undefined }));
  }, [tree]);
  const categoryGroups = useMemo(() => [...tree].sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0) || a.order - b.order).map((category) => ({ key: category.slug, label: category.name, href: `/search?category=${encodeURIComponent(category.slug)}`, image: `/demo/${imgFor(category)}.jpg`, meta: category.listingCount ? `${category.listingCount.toLocaleString("en-IN")} listings` : undefined })), [tree]);

  return <div className="le-page counter-directory-page">
    <LandingHero
      id="directory-title"
      title="Turn business search into business action."
      search={<div ref={searchAnchorRef} data-dock-source className="le-hero-search" aria-hidden={docked || undefined} onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}><DirectorySectionSearch /></div>}
      chips={popularCategories.length ? <HeroChips label="Popular categories" items={popularCategories} menu={{ label: "All categories", groups: categoryMenu }} /> : <div className="le-examples"><span>Popular needs</span>{["GST and compliance","Website development","Marketing partner","Logistics provider"].map((item) => <button type="button" key={item} onClick={() => runExample(item)}>{item}</button>)}</div>}
      slides={directorySlides}
      actions={directoryActions}
      actionsLabel="Directory actions"
    />

    <section className="le-shell bn-feed" aria-label="Company statuses, sponsored company and categories">
      <StoryRail
        groups={stories}
        className="counter-story-rail"
        addStory={{ href: "/dashboard?tab=stories" }}
      />
      <div className="counter-status-promotion">
        <ApiAdvertisingSlot imageOnly placement="category_top" kind="native" context="Boosted company · Directory" summary="A clearly labelled company placement, kept separate from verification and organic ranking." action="View company" compact />
      </div>
      <CategoryShowcase id="directory-categories-title" title="Browse by category" groups={categoryGroups} allHref="/categories" allLabel="All categories" />
    </section>

    <DirectorySections />
  </div>;
}
