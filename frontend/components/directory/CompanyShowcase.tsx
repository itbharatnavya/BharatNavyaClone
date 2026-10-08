"use client";

// Directory "Top companies": category tabs over a compact two-column board, ranked by rating
// (references: Justdial's result rows, IndiaMART's supplier cards). Every card shows everything
// at once, no hover needed: a small photo with the rank, name and tick, category and city, one
// line of proof (rating, years in business, reply rate) and what they offer. Sized so the whole
// board fits on one screen on desktop; phones show the top four. Data is the shared
// featured-sellers list (lib/catalog), which carries each company's main category and a few
// listing titles. Styles: .tc-* in app/counter-soft-system.css.

import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useFeaturedSellers } from "@/lib/catalog";
import { IMG_BY_SLUG } from "@/lib/categoryImages";

interface Company {
  slug: string;
  name: string;
  city?: string;
  state?: string;
  category?: string | null;
  categorySlug?: string | null;
  offers?: string[];
  about?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  isVerified?: boolean;
  trustSealVerified?: boolean;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  listingCount?: number;
}

const Arrow = () => <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const Star = () => <svg aria-hidden viewBox="0 0 24 24"><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" /></svg>;
const Tick = () => <svg className="tc-tick" role="img" aria-label="Verified company" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

// Short tab names; anything not listed falls back to the first part of the category name.
const SHORT: Record<string, string> = {
  "professional-consulting-services": "Services",
  "building-construction": "Construction",
  "automotive-parts-accessories": "Automotive",
  "agriculture-farming": "Agriculture",
  "electronics-electrical": "Electronics",
  "industrial-machinery-equipment": "Machinery",
  "logistics-transport-warehousing": "Logistics",
};
const short = (company: Company) => (company.categorySlug && SHORT[company.categorySlug]) || (company.category || "Other").split(/[,&]/)[0].trim();
const where = (company: Company) => [company.city, company.state && company.state !== company.city ? company.state : null].filter(Boolean).join(", ");

function CompanyCard({ company, rank }: { company: Company; rank: number }) {
  const href = `/seller/${company.slug}`;
  const years = company.yearEstablished ? Math.max(1, new Date().getFullYear() - company.yearEstablished) : null;
  const photo = company.coverImage || (company.categorySlug && IMG_BY_SLUG[company.categorySlug] ? `/demo/${IMG_BY_SLUG[company.categorySlug]}.jpg` : null);
  const rated = typeof company.rating === "number" && company.rating > 0;

  return <article className="tc-card">
    <div className="tc-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo ? <img src={photo} alt="" loading="lazy" /> : <Avatar src={company.logo} name={company.name} size={96} />}
      <span className="tc-rank" aria-label={`Rank ${rank}`}>{rank}</span>
    </div>
    <div className="tc-info">
      <h3><Link href={href}><span>{company.name}</span></Link>{company.isVerified && <Tick />}</h3>
      <p className="tc-where">{[company.category, where(company)].filter(Boolean).join(" · ")}</p>
      <p className="tc-proof">
        {rated && <b><Star />{company.rating!.toFixed(1)}{company.reviewCount ? <small>({company.reviewCount})</small> : null}</b>}
        {years && <span>{years} yrs</span>}
        {company.responseRate ? <span>{company.responseRate}% replies</span> : null}
        {company.gstNumber && <span className="tc-gst">GST</span>}
      </p>
      {company.offers?.length ? <ul className="tc-offers" role="list" aria-label="What they offer">{company.offers.slice(0, 2).map((offer) => <li key={offer}>{offer}</li>)}</ul> : null}
    </div>
    <i className="tc-go" aria-hidden><Arrow /></i>
  </article>;
}

export default function CompanyShowcase() {
  const { sellers, loading } = useFeaturedSellers();
  const companies = useMemo(() => (sellers as Company[]).filter((seller) => seller && seller.slug), [sellers]);
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    companies.forEach((company) => counts.set(short(company), (counts.get(short(company)) || 0) + 1));
    return [{ key: "all", label: "All", count: companies.length }, ...[...counts].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ key: label, label, count }))];
  }, [companies]);
  const [tab, setTab] = useState("all");

  if (loading && companies.length === 0) {
    return <div className="tc is-loading" aria-label="Loading companies"><span /><span /></div>;
  }
  if (companies.length === 0) {
    return <div className="le-empty">Companies are temporarily unavailable. <Link className="hs-link" href="/search">Search the Directory</Link></div>;
  }

  const shown = tab === "all" ? companies : companies.filter((company) => short(company) === tab);

  return <div className="tc">
    {tabs.length > 2 && <div className="tc-tabs" role="group" aria-label="Filter companies by category">
      {tabs.map((item) => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>
        {item.label}<span>{item.count}</span>
      </button>)}
    </div>}
    <ol className="tc-board" aria-label="Companies ranked by rating">
      {shown.map((company, index) => <li key={company.slug}><CompanyCard company={company} rank={index + 1} /></li>)}
    </ol>
  </div>;
}
