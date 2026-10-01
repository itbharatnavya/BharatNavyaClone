"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StoryRail from "@/components/StoryRail";
import UpdateFeature from "@/components/evidence/UpdateFeature";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import EvidenceRecord from "@/components/evidence/EvidenceRecord";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import DecisionJourney from "@/components/evidence/DecisionJourney";
import { useCategoryTree, useFeaturedSellers } from "@/lib/catalog";
import { imgFor } from "@/lib/categoryImages";
import { iconFor } from "@/components/home/FeaturedCategories";
import LandingHero, { CategoryShowcase, HeroChips, type HeroAction, type HeroSlide } from "@/components/discovery/LandingHero";
import { getBlogs, getRecentActivity, getStories } from "@/lib/api";
import type { Blog, RecentActivityItem, StoryGroup } from "@/lib/types";
import { isAlignedDirectoryCompany, mapDirectoryCompany } from "@/lib/productDesign";
import { resolvePublicUpdates, type EvidenceAsset } from "@/lib/livingEvidence";
import { DirectorySectionSearch } from "@/components/SectionSearchDock";
import { dockEdge, useSearchDock } from "@/lib/searchDock";
import ProductListingRail from "@/components/directory/ProductListingRail";

const families = [
  { name: "Finance, Legal & Compliance", outcome: "Manage the essentials behind every business", body: "Accounting, taxation, legal advisory, compliance, registrations, and financial support.", query: "compliance", media: "/seed-media/work/work-5.jpg" },
  { name: "Manufacturing & Suppliers", outcome: "Build, source and scale with the right partners", body: "Manufacturers, industrial suppliers, components, machinery, packaging, and production support.", query: "manufacturing", media: "/seed-media/company/company-3.jpg" },
  { name: "Technology & Software", outcome: "Build better systems for modern business", body: "Software development, IT services, SaaS solutions, cybersecurity, automation, and digital infrastructure.", query: "software", media: "/seed-media/work/work-2.jpg" },
  { name: "Marketing & Creative", outcome: "Turn your business into a stronger brand", body: "Digital marketing, branding, advertising, content, design, social media, and creative services.", query: "marketing", media: "/seed-media/work/work-1.jpg" },
  { name: "Logistics & Operations", outcome: "Keep products and operations moving", body: "Logistics, transportation, warehousing, freight, distribution, and supply-chain support.", query: "logistics", media: "/seed-media/work/work-4.jpg" },
  { name: "Professional Business Services", outcome: "Bring specialist expertise into your business", body: "Consulting, recruitment, HR, management, research, outsourcing, and specialised professional support.", query: "business services", media: "/seed-media/company/company-5.jpg" },
];

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
  { title: "List your business", detail: "Company profile and offerings", href: "/sell", icon: actionIcon("M4 9l1.5-5h13L20 9|M4 9h16v11H4z|M9 20v-6h6v6") },
  { title: "Promote your company", detail: "Clearly labelled placements", href: "/pricing", icon: actionIcon("M4 10v4l11 5V5z|M15 9a3 3 0 0 1 0 6|M7 15l1 5h3l-1-4") },
];

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function FamilyIcon() { return <svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 16h8M9 12h6M10 8h4"/></svg>; }

export default function DirectoryPage() {
  const router = useRouter();
  const { sellers, loading } = useFeaturedSellers();
  const { tree } = useCategoryTree();
  const { docked, setProgress, setQuery, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const updatesAnchorRef = useRef<HTMLElement>(null);
  const updatesRequestedRef = useRef(false);
  const heroFocusedRef = useRef(false);
  const pendingDockRef = useRef<boolean | null>(null);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [activeFamily, setActiveFamily] = useState(families[0]);
  const allowPrototype = process.env.NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW === "true";

  useEffect(() => { getStories("seller").then(setStories).catch(() => setStories([])); }, []);
  useEffect(() => {
    const anchor = updatesAnchorRef.current;
    if (!anchor || updatesRequestedRef.current) return;
    const loadUpdates = () => {
      if (updatesRequestedRef.current) return;
      updatesRequestedRef.current = true;
      Promise.allSettled([getBlogs({ authorType: "seller" }), getRecentActivity({ limit: 6 })]).then(([blogResult, activityResult]) => {
        if (blogResult.status === "fulfilled") setBlogs(blogResult.value);
        if (activityResult.status === "fulfilled") setActivity(activityResult.value);
      });
    };
    if (typeof IntersectionObserver === "undefined") { loadUpdates(); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { loadUpdates(); observer.disconnect(); } }, { rootMargin: "320px 0px" });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);
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

  const companies = useMemo(() => sellers.filter(isAlignedDirectoryCompany).map(mapDirectoryCompany).filter((company): company is NonNullable<typeof company> => Boolean(company)).slice(0, 6), [sellers]);
  const updates = useMemo(() => resolvePublicUpdates({ context: "directory", stories, blogs, reviews: activity, allowPrototype }), [stories, blogs, activity, allowPrototype]);
  function runExample(item: string) { setQuery(item); markSearchNav(); router.push(`/search?q=${encodeURIComponent(item)}`); }
  const popularCategories = useMemo(() => [...tree].sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0) || a.order - b.order).slice(0, 4).map((category) => ({ label: category.name.split(/[,&]/)[0].trim(), href: `/search?category=${encodeURIComponent(category.slug)}`, icon: iconFor(category) })), [tree]);
  const categoryGroups = useMemo(() => [...tree].sort((a, b) => (b.listingCount || 0) - (a.listingCount || 0) || a.order - b.order).map((category) => ({ key: category.slug, label: category.name, href: `/search?category=${encodeURIComponent(category.slug)}`, image: `/demo/${imgFor(category)}.jpg`, meta: category.listingCount ? `${category.listingCount.toLocaleString("en-IN")} listings` : undefined })), [tree]);
  const activeMedia: EvidenceAsset = { src: activeFamily.media, alt: `${activeFamily.name} team at work`, kind: "workplace", source: "prototype", attribution: "Prototype service-family media" };

  return <div className="le-page counter-directory-page">
    <LandingHero
      id="directory-title"
      title="Turn business search into business action."
      search={<div ref={searchAnchorRef} data-dock-source className="le-hero-search" aria-hidden={docked || undefined} onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}><DirectorySectionSearch /></div>}
      chips={popularCategories.length ? <HeroChips label="Popular categories" items={popularCategories} /> : <div className="le-examples"><span>Popular needs</span>{["GST and compliance","Website development","Marketing partner","Logistics provider"].map((item) => <button type="button" key={item} onClick={() => runExample(item)}>{item}</button>)}</div>}
      slides={directorySlides}
      actions={directoryActions}
      actionsLabel="Directory actions"
    />

    <section className="le-shell bn-feed" aria-label="Company statuses, sponsored company and categories">
      <StoryRail
        groups={stories}
        className="counter-story-rail"
      />
      <div className="counter-status-promotion">
        <ApiAdvertisingSlot imageOnly placement="category_top" kind="native" context="Boosted company · Directory" summary="A clearly labelled company placement, kept separate from verification and organic ranking." action="View company" compact />
      </div>
      <CategoryShowcase id="directory-categories-title" title="Browse by category" groups={categoryGroups} allHref="/categories" allLabel="All categories" />
    </section>


    <section className="le-section" aria-labelledby="families-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="families-title">Find the services behind every business need.</h2></div><p>From finance and compliance to manufacturing, technology, marketing, logistics, and professional services, explore specialised providers through six focused categories.</p></header><div className="le-index-showcase"><div className="le-index">{families.map((family) => <Link href={`/search?type=service&q=${encodeURIComponent(family.query)}`} className={family.name === activeFamily.name ? "is-active" : undefined} key={family.name} onMouseEnter={() => setActiveFamily(family)} onFocus={() => setActiveFamily(family)}><FamilyIcon /><span><strong>{family.name}</strong><small>{family.outcome}</small></span><Arrow /></Link>)}</div><aside className="le-index-preview"><EvidenceMedia key={activeFamily.name} asset={activeMedia} ratio="wide" /><div><span className="le-update-context is-directory">Service family</span><h3>{activeFamily.name}</h3><p>{activeFamily.body}</p><Link href={`/search?type=service&q=${encodeURIComponent(activeFamily.query)}`}>View matching services →</Link></div></aside></div></div></section>

    <section className="le-section is-tinted" aria-labelledby="companies-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="companies-title">Know the business behind the offering.</h2></div><p>Bharat Navya brings companies, suppliers, and service providers into clearer view. Review company information, capabilities, offerings, and relevant details in one place before making an enquiry.</p><Link className="le-button" href="/search">Browse all listings</Link></header><div className="le-discovery-grid"><article className="le-discovery-feature"><EvidenceMedia asset={{ src: "/seed-media/company/company-4.jpg", alt: "A company team sharing its work", kind: "work-sample", source: "prototype", attribution: "Prototype company media" }} ratio="wide" /><div className="le-discovery-feature-copy"><span><small>Provider evidence</small><strong>{companies[0]?.name || "Featured provider"}</strong><p>{companies[0] ? `${companies[0].location} · ${companies[0].serviceFamily}` : "Aligned provider evidence will appear here."}</p></span><Link href={companies[0] ? `/seller/${companies[0].slug}` : "/search"}>Inspect provider record →</Link></div></article><div className="le-record-stack">{(loading ? [] : companies.slice(1, 5)).map((company, index) => <EvidenceRecord key={company.id} href={`/seller/${company.slug}`} title={company.name} meta={`${company.location} · ${company.verified ? "Identity verified" : "Profile available"}`} detail={company.capabilities.slice(0, 2).join(" · ")} logo={company.logo} media={index < 2 ? { src: `/seed-media/work/work-${index + 2}.jpg`, alt: `Work evidence from ${company.name}`, kind: "work-sample", source: "prototype", attribution: "Prototype company media" } : undefined} label={company.serviceFamily} />)}{!loading && companies.length === 0 && <div className="le-empty">Aligned provider records are temporarily unavailable. Search remains ready.</div>}</div></div></div></section>

    <section className="le-section counter-products-section" aria-labelledby="products-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="products-title">Where products meet possibility.</h2></div><p>Every product represents a capability, a supplier, and a potential business requirement. Explore offerings across industries and categories while keeping the supplier and relevant listing details in view.</p><Link className="le-button" href="/search?type=product">Explore products</Link></header><ProductListingRail /></div></section>

    <DecisionJourney
      id="directory-journey-title"
      title="From what you need to what comes next."
      context="directory"
      steps={[
        { label: "Describe", detail: "Share the requirement, product need, service request, or business objective you are exploring." },
        { label: "Inspect", detail: "Review company information, offerings, capabilities, and relevant details before deciding." },
        { label: "Shortlist", detail: "Keep the businesses, products, or services that best fit your requirement." },
        { label: "Inquire", detail: "Send an enquiry and move from useful information to a meaningful business conversation." },
      ]}
    />

    <section ref={updatesAnchorRef} className="le-section" aria-labelledby="directory-updates-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="directory-updates-title">Business stories worth knowing.</h2></div><p>Ideas, insights, milestones, and perspectives from businesses on Bharat Navya offer a closer look at the people, work, and thinking shaping different industries.</p></header>{updates.length ? <UpdateFeature updates={updates} title="Company insights" /> : <div className="le-empty">Company insights will appear as businesses publish public evidence.</div>}</div></section>

    <section className="le-closing"><div className="le-shell"><div><h2>The right place for what you offer—and what you need.</h2><p>Find relevant businesses, products, and services, or represent your own company with a structured presence built for B2B visibility.</p></div><div className="le-closing-actions"><Link className="le-button is-primary" href="/search">Explore the Directory</Link><Link className="le-button" href="/sell">List your business</Link></div></div></section>
  </div>;
}
