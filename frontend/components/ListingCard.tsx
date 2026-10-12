"use client";

// Listing card, one design in two layouts. Hierarchy, top to bottom: photo,
// title, who is behind it (seller, verification, place), at most two spec chips,
// then the price beside the actions. Nothing is drawn over the photo except the
// save button and a single Sponsored/Featured flag. Styles: .lcard* in
// app/counter-soft-system.css.

import { RatingPill, VerifiedTag } from "@/components/TrustBadges";
import React from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { useShortlist } from "@/lib/shortlist";
import Avatar from "./Avatar";

export interface ListingCardProps {
  listing: Listing;
  href?: string; // detail link (defaults to /listing/[id])
  onContact?: (listing: Listing) => void;
  className?: string;
  /** "grid" (default, photo-first tile) or "row" (list row: photo left, details middle,
   * price and actions right), used by DiscoveryResults' list view. */
  layout?: "grid" | "row";
  /** Omit the seller line, for pages that already sit inside one company's profile. */
  hideSeller?: boolean;
}

function sellerName(listing: Listing): string {
  return (
    listing.seller?.companyName ||
    listing.seller?.name ||
    listing.sellerName ||
    "Seller"
  );
}

function sellerCity(listing: Listing): string | undefined {
  return listing.seller?.city || listing.location?.city;
}

// Product: MOQ + up to 2 specifications. Service: experience + service area.
// Shared by both layouts so a product/service reads identically whichever
// view (row or grid) is showing it.
export function buildSpecs(listing: Listing): { label: string; value: string }[] {
  const isService = listing.type === "service";
  const product = listing.product;
  const service = listing.service;
  const specs: { label: string; value: string }[] = [];
  if (!isService) {
    if (product?.moq != null) {
      specs.push({ label: "MOQ", value: `${product.moq} ${product.unitOfMeasure || "units"}` });
    }
    Object.entries(product?.specifications || {})
      .slice(0, 2)
      .forEach(([k, v]) => specs.push({ label: k, value: String(v) }));
  } else {
    if (typeof service?.experienceYears === "number") {
      specs.push({ label: "Experience", value: `${service.experienceYears} yrs` });
    }
    if (service?.serviceArea && service.serviceArea.length > 0) {
      specs.push({ label: "Serves", value: service.serviceArea.slice(0, 2).join(", ") });
    }
  }
  return specs;
}

// Compact solid rating pill (value + count) — denser than a 5-star row,
// used by both layouts since vertical space is tight in each. Also reused by
// SellerCard so ratings read identically across listing and company cards.
export { RatingPill };

function flagOf(listing: Listing): { label: string; featured: boolean } | null {
  if (listing.isSponsored) return { label: "Sponsored", featured: false };
  if (listing.isFeatured) return { label: "Featured", featured: true };
  return null;
}

function SaveToggle({ listing }: { listing: Listing }) {
  const shortlist = useShortlist();
  const saved = shortlist.has(listing.id);
  return (
    <button
      type="button"
      className={`lcard-save${saved ? " is-saved" : ""}`}
      aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
      aria-pressed={saved}
      title={saved ? "Saved" : "Save"}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); shortlist.toggle(listing.id); }}
    >
      <svg aria-hidden viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" /></svg>
    </button>
  );
}

function SellerLine({ listing }: { listing: Listing }) {
  const verified = listing.isVerifiedSeller || !!listing.seller?.isVerified;
  return (
    <span className="lcard-seller">
      <Avatar src={listing.seller?.logo} name={sellerName(listing)} size={30} />
      <span>{sellerName(listing)}</span>
      {verified && <VerifiedTag />}
    </span>
  );
}

function PlaceLine({ listing }: { listing: Listing }) {
  // Listing's own rating first (what buyers said about this item), else the company's.
  const own = (listing.rating ?? 0) > 0;
  const rating = own ? listing.rating : listing.seller?.rating ?? 0;
  const count = own ? listing.reviewCount : listing.seller?.reviewCount;
  const city = sellerCity(listing);
  if (!city && !(rating > 0)) return null;
  return (
    <span className="lcard-place">
      {rating > 0 && <RatingPill value={rating} count={count} size="sm" />}
      {city && <span className="lcard-city">{city}</span>}
    </span>
  );
}

export default function ListingCard({ listing, href, onContact, className = "", layout = "grid", hideSeller = false }: ListingCardProps) {
  const [broken, setBroken] = React.useState(false);
  const detailHref = href || `/listing/${listing.id}`;
  const image = listing.media?.find((m) => m.type !== "video")?.url || listing.media?.[0]?.url;
  const product = listing.product;
  const service = listing.service;
  const flag = flagOf(listing);
  const facts = buildSpecs(listing).slice(0, 2);

  return (
    <article className={["lcard", layout === "row" ? "lcard--row" : "lcard--grid", className].filter(Boolean).join(" ")}>
      <Link href={detailHref} className="lcard-media" aria-label={`View ${listing.title}`}>
        {image && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="lcard-empty"><b>{listing.title.charAt(0)}</b></span>
        )}
      </Link>
      {flag && <span className={`lcard-flag${flag.featured ? " is-featured" : ""}`}>{flag.label}</span>}
      <SaveToggle listing={listing} />

      <div className="lcard-body">
        <h3 className="lcard-title"><Link href={detailHref}>{listing.title}</Link></h3>
        {facts.length > 0 && <dl className="lcard-facts">{facts.map((fact, index) => <div key={index}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
        {/* Trust tags show on every card. On a company's own page (hideSeller) the company name is
            dropped but its Verified tag, the rating and the city stay. */}
        {hideSeller
          ? <div className="lcard-by is-tags-only">{(listing.isVerifiedSeller || listing.seller?.isVerified) && <VerifiedTag />}<PlaceLine listing={listing} /></div>
          : <div className="lcard-by"><SellerLine listing={listing} /><PlaceLine listing={listing} /></div>}
        {/* One action: Contact opens the listing page, where the call / WhatsApp / enquiry options live
            (a separate "details" icon went to the same page, so it was dropped). */}
        <div className="lcard-actions">
          {onContact
            ? <button type="button" className="lcard-cta" onClick={() => onContact(listing)}>Contact</button>
            : <Link href={detailHref} className="lcard-cta">Contact</Link>}
        </div>
      </div>
    </article>
  );
}
