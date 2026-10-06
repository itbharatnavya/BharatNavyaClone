"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumbs from "@/components/Breadcrumbs";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import ListingCard from "@/components/ListingCard";
import { getSeller } from "@/lib/api";
import type { SellerPublicProfile } from "@/lib/types";
import { mapDirectoryCompany } from "@/lib/productDesign";

function Check() { return <svg aria-hidden viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>; }
function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }
export default function CompanyProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    getSeller(slug)
      .then((value) => { if (live) setProfile(value); })
      .catch(() => { if (live) setError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [slug]);

  const company = useMemo(() => profile ? mapDirectoryCompany({
    id: profile.id,
    name: profile.seller.companyName,
    slug: profile.seller.slug,
    logo: profile.seller.logo,
    city: profile.seller.location?.city || profile.city,
    state: profile.seller.location?.state || profile.state,
    about: profile.seller.about,
    isVerified: profile.seller.isVerified,
    trustSealVerified: profile.seller.trustSealVerified,
    rating: profile.seller.rating,
    reviewCount: profile.seller.reviewCount,
    responseRate: profile.seller.responseRate,
  }) : null, [profile]);

  if (loading) return <div className="counter-public-page cp"><p className="cp-note">Loading company record…</p></div>;
  if (error || !profile || !company) return <div className="counter-public-page cp"><section className="cp-block"><h1>We could not find this company.</h1><p>The record may be unavailable or the link may have changed.</p><Link className="cp-button" href="/search">Browse services and products</Link></section></div>;

  const seller = profile.seller;
  const listings = (profile.listings || []).filter((listing) => listing.status === "active");
  const media = [seller.coverImage, ...listings.flatMap((listing) => listing.media.map((item) => item.url))]
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
    .slice(0, 6);
  const approvedReviews = (profile.reviews || []).filter((review) => review.status === "approved");
  const serviceListings = listings.filter((listing) => listing.type === "service");
  const productListings = listings.filter((listing) => listing.type === "product");
  const location = [seller.location?.city || profile.city, seller.location?.state || profile.state].filter(Boolean).join(", ") || "India";
  const inquiryHref = seller.contactEmail ? `mailto:${seller.contactEmail}?subject=${encodeURIComponent(`Inquiry via Bharat Navya for ${seller.companyName}`)}` : `/login?next=${encodeURIComponent(`/seller/${slug}`)}`;
  const stats: [string, string, boolean][] = [
    [seller.rating ? `${seller.rating.toFixed(1)} / 5` : "New", `${seller.reviewCount || 0} public reviews`, Boolean(seller.rating)],
    [seller.responseRate ? `${seller.responseRate}%` : "Not listed", "Response rate", Boolean(seller.responseRate)],
    [seller.yearEstablished ? String(seller.yearEstablished) : "Not listed", "Year established", Boolean(seller.yearEstablished)],
    [seller.employeeCount || "Not listed", "Team size", Boolean(seller.employeeCount)],
  ];
  const facts: [string, string][] = [
    ["Verification", seller.isVerified ? "Identity verified" : "Not verified"],
    ["GST", seller.gstNumber || "Not disclosed"],
    ["Service area", seller.serviceAreas?.map((area) => area.city || area.state).filter(Boolean).join(", ") || location],
    ["Certifications", seller.certifications?.join(", ") || "Not listed"],
  ];

  return <div className="counter-public-page cp">
    <Breadcrumbs className="cp-crumbs" items={[{ label: "Directory", href: "/directory" }, { label: "Services & products", href: "/search" }, { label: seller.companyName }]} />

    <header className="cp-head">
      {seller.coverImage && <div className="cp-cover">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={seller.coverImage} alt="" decoding="async" /></div>}
      <div className="cp-identity">
        <Avatar src={seller.logo} name={seller.companyName} size={72} />
        <div className="cp-title">
          <span className={`cp-chip${seller.isVerified ? " is-verified" : ""}`}>{seller.isVerified ? "Identity verified" : "Claimed company"}</span>
          <h1>{seller.companyName}</h1>
          <p>{location} · {company.serviceFamily}</p>
        </div>
        <div className="cp-actions">
          <a className="cp-button" href={inquiryHref}>{seller.contactEmail ? "Send inquiry" : "Sign in to inquire"}</a>
          {seller.website && <a className="cp-button is-quiet" href={seller.website} target="_blank" rel="noreferrer">Visit website <Arrow /></a>}
        </div>
      </div>
    </header>

    <section className="cp-stats" aria-label="Company trust summary">
      {stats.map(([value, label, known]) => <div key={label}><strong className={known ? undefined : "is-missing"}>{value}</strong><span>{label}</span></div>)}
    </section>

    <section className="cp-block" aria-labelledby="cp-work">
      <h2 id="cp-work">Work evidence</h2>
      {media.length ? <ul className="cp-gallery">{media.map((image, index) => <li key={`${image}-${index}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image} alt={index === 0 ? `${seller.companyName} workplace or work sample` : `Work sample ${index + 1} from ${seller.companyName}`} loading="lazy" decoding="async" /></li>)}</ul> : <p className="cp-empty">No work media has been added. This missing evidence is shown intentionally.</p>}
    </section>

    <div className="cp-layout">
      <div className="cp-main">
        <section className="cp-block" aria-labelledby="cp-about">
          <h2 id="cp-about">What this company does</h2>
          <p className="cp-lead">{seller.about || "This company has not added a detailed overview yet."}</p>
          {company.capabilities.length > 0 && <ul className="cp-capabilities">{company.capabilities.map((capability) => <li key={capability}><Check />{capability}</li>)}</ul>}
        </section>

        <section className="cp-block" aria-labelledby="cp-facts">
          <h2 id="cp-facts">Company facts</h2>
          <dl className="cp-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>

        {[["cp-services", "Services", "No active services have been published yet.", serviceListings], ["cp-products", "Products", "No active products have been published yet.", productListings]].map(([id, title, empty, items]) => {
          const offerings = items as typeof listings;
          return <section className="cp-block" aria-labelledby={id as string} key={id as string}>
            <h2 id={id as string}>{title as string}</h2>
            {offerings.length ? <div className="cp-offers">{offerings.map((listing) => <ListingCard key={listing.id} listing={listing} hideSeller />)}</div> : <p className="cp-empty">{empty as string}</p>}
          </section>;
        })}

        <div className="bn-bottom-ad is-980"><ApiAdvertisingSlot compact placement="category_top" kind="native" context="Sponsored near company profiles" summary="A relevant promoted company or service, kept separate from this company’s own evidence and reviews." action="View promoted record" /></div>

        <section className="cp-block" aria-labelledby="cp-reviews">
          <h2 id="cp-reviews">Reviews</h2>
          {approvedReviews.length ? <div className="cp-reviews">{approvedReviews.map((review) => <blockquote key={review.id}><span>{review.rating} / 5</span><p>“{review.reviewText}”</p><cite>{review.buyerName}</cite></blockquote>)}</div> : <p className="cp-empty">No approved public reviews are available yet.</p>}
        </section>
      </div>

      <aside className="cp-aside" id="cp-inquiry">
        <div className="cp-inquiry">
          <h2>Discuss the work with {seller.companyName}</h2>
          <p>Share the need, timeline and location directly. Bharat Navya does not turn this into a purchase order.</p>
          <a className="cp-button is-block" href={inquiryHref}>{seller.contactEmail ? "Start an inquiry" : "Sign in to inquire"}</a>
          <small>Contact details and response expectations come from the company record.</small>
        </div>
      <div className="bn-side-ad"><ApiAdvertisingSlot imageOnly showFallback={false} placement="category_top" kind="native" context="Sponsored" summary="" action="View promotion" /></div>
      </aside>
    </div>
    <a className="ld-mobile-cta" href="#cp-inquiry">Contact company</a>
  </div>;
}
