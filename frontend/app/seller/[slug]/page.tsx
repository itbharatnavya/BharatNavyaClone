"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Breadcrumbs from "@/components/Breadcrumbs";
import ApiAdvertisingSlot from "@/components/evidence/ApiAdvertisingSlot";
import { getSeller } from "@/lib/api";
import type { Listing, SellerPublicProfile } from "@/lib/types";
import { mapDirectoryCompany } from "@/lib/productDesign";

function Check() { return <svg aria-hidden viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>; }
function Arrow() { return <svg aria-hidden viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>; }

function formatPrice(listing: Listing) {
  if (listing.type === "product") {
    const price = listing.product?.price;
    if (typeof price !== "number") return "Price on request";
    const unit = listing.product?.unitOfMeasure ? ` / ${listing.product.unitOfMeasure}` : "";
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(price)}${unit}`;
  }
  const rate = listing.service?.rateCard?.find((item) => item.price > 0);
  if (!rate) return listing.service?.pricingModel === "quote" ? "Quote based" : "Rate on request";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rate.price)}${rate.unit || ""}`;
}

function listingTerms(listing: Listing) {
  if (listing.type === "product") {
    return [
      ["Minimum order", listing.product?.moq ? `${listing.product.moq} ${listing.product.unitOfMeasure || "units"}` : "Ask company"],
      ["Availability", listing.product?.availability?.replaceAll("_", " ") || "Ask company"],
    ];
  }
  return [
    ["Availability", listing.service?.availabilitySchedule || "Ask company"],
    ["Response", listing.service?.sla || "Ask company"],
  ];
}

function listingsWithDistinctLeadMedia(listings: Listing[]) {
  const used = new Set<string>();
  return listings.map((listing) => {
    const lead = listing.media.find((item) => item.type !== "video" && !used.has(item.url));
    if (!lead) return { ...listing, media: [] };
    used.add(lead.url);
    return { ...listing, media: [lead, ...listing.media.filter((item) => item.url !== lead.url)] };
  });
}

function CompanyOfferings({
  id,
  title,
  intro,
  empty,
  listings,
}: {
  id: string;
  title: string;
  intro: string;
  empty: string;
  listings: Listing[];
}) {
  const presented = listingsWithDistinctLeadMedia(listings);
  return <section className="company-block" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    <p className="company-block-intro">{intro}</p>
    {presented.length ? <div className="company-services">{presented.map((listing) => {
      const terms = listingTerms(listing);
      return <Link className="company-offering-card" href={`/listing/${listing.id}`} key={listing.id}>
        <div>{listing.media[0] ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={listing.media[0].url} alt={listing.media[0].alt || listing.title} loading="lazy" decoding="async" /></> : <span className="company-offering-placeholder"><b>{listing.title.charAt(0)}</b><small>{listing.type}</small></span>}</div>
        <span>{listing.type === "service" ? "Service" : "Product"}</span>
        <h3>{listing.title}</h3>
        <p>{listing.description}</p>
        <strong className="company-offering-price">{formatPrice(listing)}</strong>
        <dl>{terms.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <b>Inspect listing <Arrow /></b>
      </Link>;
    })}</div> : <div className="directory-empty">{empty}</div>}
  </section>;
}

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

  if (loading) return <div className="directory-design company-profile"><div className="directory-shell directory-section"><div className="directory-empty">Loading company evidence…</div></div></div>;
  if (error || !profile || !company) return <div className="directory-design company-profile"><div className="directory-shell directory-section"><h1>We could not find this company.</h1><p className="company-muted">The record may be unavailable or the link may have changed.</p><Link className="directory-primary" href="/search">Browse services and products</Link></div></div>;

  const seller = profile.seller;
  const listings = (profile.listings || []).filter((listing) => listing.status === "active");
  const media = [seller.coverImage, ...listings.flatMap((listing) => listing.media.map((item) => item.url))]
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
    .slice(0, 6);
  const approvedReviews = (profile.reviews || []).filter((review) => review.status === "approved");
  const serviceListings = listings.filter((listing) => listing.type === "service");
  const productListings = listings.filter((listing) => listing.type === "product");
  const location = [seller.location?.city || profile.city, seller.location?.state || profile.state].filter(Boolean).join(", ") || "India";

  return <div className="directory-design company-profile">
    <div className="directory-shell"><Breadcrumbs className="company-crumb" items={[{ label: "Directory", href: "/directory" }, { label: "Services & products", href: "/search" }, { label: seller.companyName }]} /></div>

    <section className="company-cover">
      {seller.coverImage && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={seller.coverImage} alt={`${seller.companyName} work and workplace`} decoding="async" /></>}
      <div className="directory-shell company-identity">
        <Avatar src={seller.logo} name={seller.companyName} size={88} />
        <div><span className="company-status">{seller.isVerified ? "Identity verified" : "Claimed company"}</span><h1>{seller.companyName}</h1><p>{location} · {company.serviceFamily}</p></div>
        <div className="company-actions">{seller.contactEmail && <a className="directory-primary" href={`mailto:${seller.contactEmail}?subject=${encodeURIComponent(`Inquiry via Bharat Navya for ${seller.companyName}`)}`}>Send inquiry</a>}{seller.website && <a className="company-secondary" href={seller.website} target="_blank" rel="noreferrer">Visit website <Arrow /></a>}</div>
      </div>
    </section>

    <section className="directory-shell company-trust" aria-label="Company trust summary">
      <div><strong>{seller.rating ? `${seller.rating.toFixed(1)} / 5` : "New"}</strong><span>{seller.reviewCount || 0} public reviews</span></div>
      <div><strong>{seller.responseRate ? `${seller.responseRate}%` : "Not available"}</strong><span>Response rate</span></div>
      <div><strong>{seller.yearEstablished || "Not listed"}</strong><span>Year established</span></div>
      <div><strong>{seller.employeeCount || "Not listed"}</strong><span>Team size</span></div>
    </section>

    <ApiAdvertisingSlot compact placement={["seller_profile", "category_top"]} kind="native" context="Sponsored near company profiles" summary="A relevant promoted company or service, kept separate from this company’s own evidence and reviews." action="View promoted record" />

    <div className="directory-shell company-layout">
      <div>
        <section className="company-block"><h2>What this company does</h2><p className="company-lead">{seller.about || "This company has not added a detailed overview yet."}</p><div className="company-capabilities">{company.capabilities.map((capability) => <span key={capability}><Check />{capability}</span>)}</div></section>

        <CompanyOfferings id="company-services-title" title="Services" intro="Service listings published under this company’s verified public record." empty="No active services have been published yet." listings={serviceListings} />

        <CompanyOfferings id="company-products-title" title="Products" intro="Product listings published under this company’s verified public record." empty="No active products have been published yet." listings={productListings} />

        <section className="company-block"><h2>Work evidence</h2>{media.length ? <div className="company-gallery">{media.map((image, index) => <figure key={`${image}-${index}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image} alt={index === 0 ? `${seller.companyName} workplace or work sample` : `Work sample ${index + 1} from ${seller.companyName}`} loading="lazy" decoding="async" /></figure>)}</div> : <div className="directory-empty">No work media has been added. This missing evidence is shown intentionally.</div>}</section>

        <section className="company-block"><h2>Reviews</h2><p className="company-block-intro">Approved feedback connected to this company record.</p>{approvedReviews.length ? <div className="company-reviews">{approvedReviews.map((review) => <blockquote key={review.id}><span>{review.rating} / 5</span><p>“{review.reviewText}”</p><cite>{review.buyerName}</cite></blockquote>)}</div> : <div className="directory-empty">No approved public reviews are available yet.</div>}</section>
      </div>

      <aside>
        <div className="company-inquiry"><h2>Discuss the work with {seller.companyName}</h2><p>Share the need, timeline and location directly. Bharat Navya does not turn this into a purchase order.</p>{seller.contactEmail ? <a className="directory-primary" href={`mailto:${seller.contactEmail}?subject=${encodeURIComponent(`Inquiry via Bharat Navya for ${seller.companyName}`)}`}>Start an inquiry</a> : <Link className="directory-primary" href={`/login?next=${encodeURIComponent(`/seller/${slug}`)}`}>Sign in to inquire</Link>}<small>Contact details and response expectations come from the company record.</small></div>
        <div className="company-facts"><h2>Company facts</h2><dl><div><dt>Verification</dt><dd>{seller.isVerified ? "Identity verified" : "Not verified"}</dd></div><div><dt>GST</dt><dd>{seller.gstNumber || "Not disclosed"}</dd></div><div><dt>Service area</dt><dd>{seller.serviceAreas?.map((area) => area.city || area.state).filter(Boolean).join(", ") || location}</dd></div><div><dt>Certifications</dt><dd>{seller.certifications?.join(", ") || "Not listed"}</dd></div></dl></div>
      </aside>
    </div>
  </div>;
}
