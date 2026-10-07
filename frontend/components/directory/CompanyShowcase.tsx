"use client";

// Directory companies: a grid of company cards in place of the old product grid.
// Each card answers "who is this and can I trust them" at a glance: cover and logo,
// name with verification, what they do and where, a two-line about, three proof
// numbers (rating, response rate, years in business), registration chips and how
// many listings they have. Data is the shared featured-sellers list (lib/catalog).
// Styles: .cc-* in app/counter-soft-system.css.

import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useFeaturedSellers } from "@/lib/catalog";

interface Company {
  slug: string;
  name: string;
  city?: string;
  state?: string;
  category?: string | null;
  about?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  isVerified?: boolean;
  trustSealVerified?: boolean;
  gstNumber?: string | null;
  yearEstablished?: number | null;
  employeeCount?: string | null;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  listingCount?: number;
}

const Arrow = () => <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

function CompanyCard({ company }: { company: Company }) {
  const href = `/seller/${company.slug}`;
  const years = company.yearEstablished ? Math.max(1, new Date().getFullYear() - company.yearEstablished) : null;
  const where = [company.city, company.state && company.state !== company.city ? company.state : null].filter(Boolean).join(", ");
  const rated = typeof company.rating === "number" && company.rating > 0;
  const stats = [
    rated ? { value: company.rating!.toFixed(1), label: company.reviewCount ? `${company.reviewCount} reviews` : "Rating", star: true } : null,
    company.responseRate ? { value: `${company.responseRate}%`, label: "Reply rate" } : null,
    years ? { value: `${years} yrs`, label: `Since ${company.yearEstablished}` } : null,
  ].filter(Boolean) as { value: string; label: string; star?: boolean }[];
  const chips = [
    company.gstNumber ? "GST registered" : null,
    company.trustSealVerified ? "Trust seal" : null,
    company.employeeCount ? `${company.employeeCount} people` : null,
  ].filter(Boolean) as string[];

  return <article className="cc">
    <Link href={href} className="cc-cover" aria-label={`View ${company.name}`} tabIndex={-1}>
      {company.coverImage
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={company.coverImage} alt="" loading="lazy" />
        : <span className="cc-cover-empty" aria-hidden>{company.name.charAt(0)}</span>}
    </Link>
    <span className="cc-logo"><Avatar src={company.logo} name={company.name} size={56} /></span>
    <div className="cc-body">
      <h3 className="cc-name">
        <Link href={href}>{company.name}</Link>
        {company.isVerified && <svg className="cc-tick" role="img" aria-label="Verified company" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
      </h3>
      <p className="cc-where">{[company.category, where].filter(Boolean).join(" · ")}</p>
      {company.about && <p className="cc-about">{company.about}</p>}
      {stats.length > 0 && <dl className="cc-stats">
        {stats.map((stat) => <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}{stat.star && <svg aria-hidden viewBox="0 0 24 24"><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" /></svg>}</dd>
        </div>)}
      </dl>}
      {chips.length > 0 && <ul className="cc-chips" role="list">{chips.map((chip) => <li key={chip}>{chip}</li>)}</ul>}
      <div className="cc-foot">
        <span>{company.listingCount ? `${company.listingCount} ${company.listingCount === 1 ? "listing" : "listings"}` : "No active listings"}</span>
        <Link href={href} className="cc-link">View company<Arrow /></Link>
      </div>
    </div>
  </article>;
}

export default function CompanyShowcase() {
  const { sellers, loading } = useFeaturedSellers();
  const companies = (sellers as Company[]).filter((seller) => seller && seller.slug);

  if (loading && companies.length === 0) {
    return <div className="cc-grid is-loading" aria-label="Loading companies">{Array.from({ length: 4 }).map((_, index) => <span key={index} />)}</div>;
  }
  if (companies.length === 0) {
    return <div className="le-empty">Companies are temporarily unavailable. <Link className="hs-link" href="/search">Search the Directory</Link></div>;
  }
  return <ul className="cc-grid" role="list">
    {companies.map((company, index) => <li key={company.slug} style={{ ["--i" as string]: index }}><CompanyCard company={company} /></li>)}
  </ul>;
}
