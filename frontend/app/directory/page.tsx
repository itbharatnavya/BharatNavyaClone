"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { useFeaturedSellers } from "@/lib/catalog";
import { getRecentActivity } from "@/lib/api";
import type { RecentActivityItem } from "@/lib/types";
import { isAlignedDirectoryCompany, mapDirectoryCompany } from "@/lib/productDesign";

const families = [
  ["Finance, Legal and Compliance", "Register, file, and stay compliant", "scale"],
  ["Manufacturing and Suppliers", "Source, make, and package", "factory"],
  ["Technology and Software", "Build and improve digital products", "code"],
  ["Marketing and Creative", "Reach customers and strengthen your brand", "spark"],
  ["Logistics and Operations", "Move, fulfil, and run reliably", "route"],
  ["Professional Business Services", "Find specialist support for people and operations", "briefcase"],
] as const;

function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
function SearchIcon() { return <svg aria-hidden viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>; }
function FamilyIcon({ kind }: { kind: string }) { return <svg aria-hidden viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path d={kind === "route" ? "M8 16c0-5 8-3 8-8M8 8h.01M16 16h.01" : kind === "code" ? "m10 8-4 4 4 4m4-8 4 4-4 4" : "M8 16h8M9 12h6M10 8h4"} /></svg>; }

export default function DirectoryPage() {
  const router = useRouter();
  const { sellers, loading } = useFeaturedSellers();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  useEffect(() => { getRecentActivity({ limit: 4 }).then(setActivity).catch(() => setActivity([])); }, []);

  const companies = useMemo(() => sellers.filter(isAlignedDirectoryCompany).map(mapDirectoryCompany).filter((company): company is NonNullable<typeof company> => Boolean(company)).slice(0, 6), [sellers]);
  function submit(event: React.FormEvent) { event.preventDefault(); const params = new URLSearchParams(); if (query.trim()) params.set("q", query.trim()); if (city.trim()) params.set("city", city.trim()); router.push(`/search?${params}`); }

  return <div className="directory-design">
    <section className="directory-hero" aria-labelledby="directory-title"><div className="directory-shell">
      <p className="directory-eyebrow">Bharat Navya Directory</p>
      <h1 id="directory-title">Find the right company<br />for the work ahead.</h1>
      <p>Discover startups, SMEs, suppliers, and service partners through evidence you can inspect—not a catalogue you have to decode.</p>
      <form className="directory-search" onSubmit={submit}><SearchIcon /><label><span className="sr-only">What do you need?</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What company or support do you need?" /></label><label><span className="sr-only">Location</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City or remote" /></label><button type="submit">Search companies <Arrow /></button></form>
      <div className="directory-examples"><span>Popular needs</span>{["GST and compliance", "Website development", "Marketing partner", "Logistics provider"].map((item) => <button type="button" key={item} onClick={() => { setQuery(item); router.push(`/search?q=${encodeURIComponent(item)}`); }}>{item}</button>)}</div>
    </div></section>

    <section className="directory-trust" aria-label="Company trust vocabulary"><div className="directory-shell">{[["Claimed company","A representative manages the record."],["Identity verified","Core business identity has been checked."],["Evidence verified","Selected work or credentials have been reviewed."]].map(([title,body], index) => <div key={title}><b>0{index + 1}</b><span><strong>{title}</strong><small>{body}</small></span></div>)}</div></section>

    <section className="directory-section" aria-labelledby="families-title"><div className="directory-shell"><header className="directory-section-heading"><div><p className="directory-eyebrow">Recognizable pathways</p><h2 id="families-title">Start with the kind of work.</h2></div><p>Six stable families lead directly into company results. No product catalogue or intermediate category maze.</p></header><div className="directory-pathways">{families.map(([name,outcome,icon]) => <Link key={name} href={`/search?family=${encodeURIComponent(name)}`}><FamilyIcon kind={icon} /><span><strong>{name}</strong><small>{outcome}</small></span><Arrow /></Link>)}</div></div></section>

    <section className="directory-section directory-record-band" aria-labelledby="companies-title"><div className="directory-shell"><header className="directory-section-heading"><div><p className="directory-eyebrow">Useful records</p><h2 id="companies-title">Companies with context to inspect.</h2></div><Link href="/search">Browse all companies <Arrow /></Link></header><div className="directory-company-grid">{(loading ? [1,2,3] : companies).map((company) => typeof company === "number" ? <div className="directory-company-card is-loading" key={company} /> : <Link className="directory-company-card" href={`/seller/${company.slug}`} key={company.id}><div className="directory-company-top"><Avatar src={company.logo} name={company.name} size={48} /><span>{company.verified ? "Identity verified" : "Profile available"}</span></div><strong>{company.name}</strong><small>{company.location}</small><p>{company.serviceFamily}</p><ul>{company.capabilities.slice(0,2).map((capability) => <li key={capability}>{capability}</li>)}</ul><span className="directory-record-link">View company <Arrow /></span></Link>)}</div>{!loading && companies.length === 0 && <div className="directory-empty">Aligned company records are temporarily unavailable. Search remains available.</div>}</div></section>

    <section className="directory-section directory-journey" aria-labelledby="directory-journey-title"><div className="directory-shell"><p className="directory-eyebrow">A guided decision</p><h2 id="directory-journey-title">Describe. Inspect. Shortlist. Inquire.</h2><div>{[["01","Describe the need","Search by the work, context and location."],["02","Inspect evidence","Review identity, capability, media and proof."],["03","Build a shortlist","Keep credible options together."],["04","Send an inquiry","Share a structured need with the company."]].map(([n,t,b]) => <article key={n}><b>{n}</b><h3>{t}</h3><p>{b}</p></article>)}</div></div></section>

    <section className="directory-section" aria-labelledby="activity-title"><div className="directory-shell"><header className="directory-section-heading"><div><p className="directory-eyebrow">Current evidence</p><h2 id="activity-title">Work and updates from companies.</h2></div><p>Media and public reviews add useful texture; missing proof stays visibly incomplete.</p></header><div className="directory-media-ledger">{activity.length ? activity.slice(0,3).map((item) => <Link href={item.sellerSlug ? `/seller/${item.sellerSlug}` : "/search"} key={item.reviewId}><div>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={item.image || "/demo/business-1.jpg"} alt={item.image ? `Work shared by ${item.sellerName}` : "Small business work in progress"} /></div><span>{item.sellerCity || "India"}</span><strong>{item.sellerName}</strong><p>{item.reviewText}</p></Link>) : <div className="directory-empty">Company updates will appear here as public evidence becomes available.</div>}</div></div></section>

    <aside id="advertising-policy" className="directory-partner" aria-label="Advertisement"><div className="directory-shell"><small>Advertisement · External partner</small><div><strong>Tools for growing teams</strong><p>A reserved, clearly disclosed partner placement appears only after organic discovery.</p></div><details><summary>Why this ad?</summary><p>This prototype placement uses only the current public section and broad location context—not private profile, message, inquiry, or application data.</p></details></div></aside>

    <section className="directory-section directory-closing"><div className="directory-shell"><div><p className="directory-eyebrow">Participate in Directory</p><h2>Find useful business support—or represent your company accurately.</h2></div><div><Link className="directory-primary" href="/search">Find a company</Link><Link className="directory-secondary" href="/sell">List or claim a company</Link></div></div></section>
  </div>;
}
