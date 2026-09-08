"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UpdateRail from "@/components/evidence/UpdateRail";
import UpdateFeature from "@/components/evidence/UpdateFeature";
import EvidenceMedia from "@/components/evidence/EvidenceMedia";
import EvidenceRecord from "@/components/evidence/EvidenceRecord";
import AdvertisingSlot from "@/components/evidence/AdvertisingSlot";
import { useFeaturedSellers } from "@/lib/catalog";
import { getBlogs, getRecentActivity, getStories } from "@/lib/api";
import type { Blog, RecentActivityItem, StoryGroup } from "@/lib/types";
import { isAlignedDirectoryCompany, mapDirectoryCompany } from "@/lib/productDesign";
import { resolvePublicUpdates, type EvidenceAsset } from "@/lib/livingEvidence";
import { DirectorySectionSearch } from "@/components/SectionSearchDock";
import { useSearchDock } from "@/lib/searchDock";

const families = [
  { name: "Finance, Legal and Compliance", outcome: "Register, file and stay compliant", query: "compliance", media: "/seed-media/work/work-5.jpg" },
  { name: "Manufacturing and Suppliers", outcome: "Source, make and package", query: "manufacturing", media: "/seed-media/company/company-3.jpg" },
  { name: "Technology and Software", outcome: "Build and improve digital products", query: "software", media: "/seed-media/work/work-2.jpg" },
  { name: "Marketing and Creative", outcome: "Reach customers and strengthen your brand", query: "marketing", media: "/seed-media/work/work-1.jpg" },
  { name: "Logistics and Operations", outcome: "Move, fulfil and run reliably", query: "logistics", media: "/seed-media/work/work-4.jpg" },
  { name: "Professional Business Services", outcome: "Find specialist people and operational support", query: "business services", media: "/seed-media/company/company-5.jpg" },
];

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function FamilyIcon() { return <svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 16h8M9 12h6M10 8h4"/></svg>; }

export default function DirectoryPage() {
  const router = useRouter();
  const { sellers, loading } = useFeaturedSellers();
  const { docked, setProgress, setQuery, markSearchNav } = useSearchDock();
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const heroFocusedRef = useRef(false);
  const pendingDockRef = useRef<boolean | null>(null);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [activeFamily, setActiveFamily] = useState(families[0]);
  const allowPrototype = process.env.NEXT_PUBLIC_DESIGN_CONTENT_PREVIEW === "true";

  useEffect(() => { Promise.allSettled([getStories("seller"), getBlogs({ authorType: "seller" }), getRecentActivity({ limit: 6 })]).then(([storyResult, blogResult, activityResult]) => { if (storyResult.status === "fulfilled") setStories(storyResult.value); if (blogResult.status === "fulfilled") setBlogs(blogResult.value); if (activityResult.status === "fulfilled") setActivity(activityResult.value); }); }, []);
  useEffect(() => {
    const anchor = searchAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { const shouldDock = !entry.isIntersecting && entry.boundingClientRect.bottom <= 72; if (heroFocusedRef.current && shouldDock) { pendingDockRef.current = true; return; } pendingDockRef.current = null; setProgress(shouldDock ? 1 : 0); }, { threshold: 0.08, rootMargin: "-72px 0px 0px 0px" });
    observer.observe(anchor);
    return () => { observer.disconnect(); setProgress(0); };
  }, [setProgress]);
  useEffect(() => {
    searchAnchorRef.current?.toggleAttribute("inert", docked);
  }, [docked]);

  const companies = useMemo(() => sellers.filter(isAlignedDirectoryCompany).map(mapDirectoryCompany).filter((company): company is NonNullable<typeof company> => Boolean(company)).slice(0, 6), [sellers]);
  const updates = useMemo(() => resolvePublicUpdates({ context: "directory", stories, blogs, reviews: activity, allowPrototype }), [stories, blogs, activity, allowPrototype]);
  function runExample(item: string) { setQuery(item); markSearchNav(); router.push(`/search?q=${encodeURIComponent(item)}`); }
  const activeMedia: EvidenceAsset = { src: activeFamily.media, alt: `${activeFamily.name} team at work`, kind: "workplace", source: "prototype", attribution: "Prototype service-family media" };

  return <div className="le-page counter-directory-page">
    <section className="le-hero" aria-labelledby="directory-title"><div className="le-shell">
      <h1 id="directory-title">Find the right company for the work ahead.</h1>
      <p>Discover startups, SMEs and service partners through evidence you can inspect—not a catalogue you have to decode.</p>
      <div ref={searchAnchorRef} className="le-hero-search" inert={docked ? true : undefined} aria-hidden={docked || undefined} onFocusCapture={() => { heroFocusedRef.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { heroFocusedRef.current = false; if (pendingDockRef.current !== null) { setProgress(pendingDockRef.current ? 1 : 0); pendingDockRef.current = null; } } }}><DirectorySectionSearch /></div>
      <div className="le-examples"><span>Popular needs</span>{["GST and compliance","Website development","Marketing partner","Logistics provider"].map((item) => <button type="button" key={item} onClick={() => runExample(item)}>{item}</button>)}</div>
    </div></section>

    <div className="le-shell"><UpdateRail updates={updates} title="Fresh from companies" /></div>

    <section className="le-trust-ledger" aria-label="Company trust vocabulary"><div className="le-shell">{[["01","Claimed company","A representative manages the record."],["02","Identity verified","Core business identity has been checked."],["03","Evidence verified","Selected work or credentials have been reviewed."]].map(([n,title,body]) => <article key={n}><b>{n}</b><span><strong>{title}</strong><small>{body}</small></span></article>)}</div></section>

    <section className="le-section" aria-labelledby="families-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="families-title">Start with the work you need.</h2></div><p>Six stable service families open directly into company results. The visual preview shows the kind of evidence a visitor can expect.</p></header><div className="le-index-showcase"><div className="le-index">{families.map((family) => <Link href={`/search?family=${encodeURIComponent(family.name)}`} className={family.name === activeFamily.name ? "is-active" : undefined} key={family.name} onMouseEnter={() => setActiveFamily(family)} onFocus={() => setActiveFamily(family)}><FamilyIcon /><span><strong>{family.name}</strong><small>{family.outcome}</small></span><Arrow /></Link>)}</div><aside className="le-index-preview"><EvidenceMedia key={activeFamily.name} asset={activeMedia} ratio="wide" /><div><span className="le-update-context is-directory">Service family</span><h3>{activeFamily.name}</h3><p>{activeFamily.outcome}. Browse companies with identity, services and work evidence together.</p><Link href={`/search?q=${encodeURIComponent(activeFamily.query)}`}>View matching companies →</Link></div></aside></div></div></section>

    <section className="le-section is-tinted" aria-labelledby="companies-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="companies-title">Companies with context to inspect.</h2></div><Link className="le-button" href="/search">Browse all companies</Link></header><div className="le-discovery-grid"><article className="le-discovery-feature"><EvidenceMedia asset={{ src: "/seed-media/company/company-4.jpg", alt: "A company team sharing its work", kind: "work-sample", source: "prototype", attribution: "Prototype company media" }} ratio="wide" /><div className="le-discovery-feature-copy"><span><small>Work evidence</small><strong>{companies[0]?.name || "Featured company"}</strong><p>{companies[0] ? `${companies[0].location} · ${companies[0].serviceFamily}` : "Aligned company evidence will appear here."}</p></span><Link href={companies[0] ? `/seller/${companies[0].slug}` : "/search"}>Inspect company →</Link></div></article><div className="le-record-stack">{(loading ? [] : companies.slice(1, 5)).map((company, index) => <EvidenceRecord key={company.id} href={`/seller/${company.slug}`} title={company.name} meta={`${company.location} · ${company.verified ? "Identity verified" : "Profile available"}`} detail={company.capabilities.slice(0, 2).join(" · ")} logo={company.logo} media={index < 2 ? { src: `/seed-media/work/work-${index + 2}.jpg`, alt: `Work evidence from ${company.name}`, kind: "work-sample", source: "prototype", attribution: "Prototype company media" } : undefined} label={company.serviceFamily} />)}{!loading && companies.length === 0 && <div className="le-empty">Aligned company records are temporarily unavailable. Search remains ready.</div>}</div></div></div></section>

    <AdvertisingSlot kind="external" context="Contextual partner · Directory" title="Useful tools for the work around the work." summary="A dedicated partner placement for business software, logistics, compliance or operational support—shown only after meaningful organic company discovery." media={{ src: "/seed-media/company/company-6.jpg", alt: "A business team using operational tools together", kind: "workplace", source: "prototype", attribution: "Prototype advertising creative" }} />

    <section className="le-journey-wrap" aria-labelledby="directory-journey-title"><div className="le-shell"><h2 id="directory-journey-title">From a need to a useful inquiry.</h2><div className="le-journey">{[["01","Describe","Search by work, context and location."],["02","Inspect","Review identity, capability, media and proof."],["03","Shortlist","Keep credible options together."],["04","Inquire","Share a structured need with the company."]].map(([n,t,b]) => <article key={n}><b>{n}</b><h3>{t}</h3><p>{b}</p></article>)}</div></div></section>

    <section className="le-section" aria-labelledby="directory-updates-title"><div className="le-shell"><header className="le-section-head"><div><h2 id="directory-updates-title">Current from companies.</h2></div><p>Work samples, public reviews, stories and company-authored guidance stay connected to the company behind them.</p></header>{updates.length ? <UpdateFeature updates={updates} title="Company updates" /> : <div className="le-empty">Company updates will appear as businesses publish public evidence.</div>}</div></section>

    <section className="le-closing"><div className="le-shell"><div><h2>Find useful support—or represent your company accurately.</h2><p>Start a company search or create the public record your customers should see.</p></div><div className="le-closing-actions"><Link className="le-button is-primary" href="/search">Find a company</Link><Link className="le-button" href="/sell">List or claim a company</Link></div></div></section>
  </div>;
}
