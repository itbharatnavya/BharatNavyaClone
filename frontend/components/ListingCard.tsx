"use client";

// Listing card, one design in two layouts. Hierarchy, top to bottom: photo,
// title, who is behind it (seller, verification, place), at most two spec chips,
// then the price beside the actions. Nothing is drawn over the photo except the
// save button and a single Sponsored/Featured flag. Styles: .lcard* in
// app/counter-soft-system.css.

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

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
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
function buildSpecs(listing: Listing): { label: string; value: string }[] {
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
export function RatingPill({ value, count }: { value: number; count?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          background: "var(--success)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 5,
          lineHeight: 1.3,
        }}
      >
        {value.toFixed(1)}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" />
        </svg>
      </span>
      {typeof count === "number" && count > 0 && (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{count} Ratings</span>
      )}
    </span>
  );
}

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

function Identity({ listing }: { listing: Listing }) {
  const verified = listing.isVerifiedSeller || !!listing.seller?.isVerified;
  const rating = listing.seller?.rating ?? 0;
  const city = sellerCity(listing);
  return (
    <div className="lcard-identity">
      <span className="lcard-seller">
        <Avatar src={listing.seller?.logo} name={sellerName(listing)} size={20} />
        <span>{sellerName(listing)}</span>
        {verified && <svg className="lcard-tick" aria-label="Verified seller" role="img" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
      </span>
      {(city || rating > 0) && (
        <span className="lcard-place">
          {city}
          {city && rating > 0 && <i aria-hidden>·</i>}
          {rating > 0 && <b>{rating.toFixed(1)}<svg aria-hidden viewBox="0 0 24 24"><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z" /></svg></b>}
        </span>
      )}
    </div>
  );
}

export default function ListingCard({ listing, href, onContact, className = "", layout = "grid", hideSeller = false }: ListingCardProps) {
  const [broken, setBroken] = React.useState(false);
  const detailHref = href || `/listing/${listing.id}`;
  const image = listing.media?.find((m) => m.type !== "video")?.url || listing.media?.[0]?.url;
  const isService = listing.type === "service";
  const product = listing.product;
  const service = listing.service;
  const flag = flagOf(listing);
  const specs = buildSpecs(listing).slice(0, 2);

  const priceLabel =
    product?.price != null
      ? `₹${formatINR(product.price)}`
      : product?.priceTiers && product.priceTiers.length > 0
      ? `₹${formatINR(product.priceTiers[0].price)}`
      : "Ask price";
  const priceUnit = product?.price != null && product?.unitOfMeasure ? `/ ${product.unitOfMeasure}` : "";
  const rate = service?.rateCard?.find((item) => item.price > 0);
  const rateLabel = rate ? `₹${formatINR(rate.price)}` : service?.pricingModel === "quote" ? "Quote based" : "On request";
  const rateUnit = rate?.unit ? `/ ${rate.unit.replace(/^\s*\/?\s*/, "")}` : "";
  const price = isService ? rateLabel : priceLabel;
  const unit = isService ? rateUnit : priceUnit;

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
        <span className="lcard-kind">{isService ? "Service" : "Product"}</span>
        <h3 className="lcard-title"><Link href={detailHref}>{listing.title}</Link></h3>
        {!hideSeller && <Identity listing={listing} />}
        {specs.length > 0 && <ul className="lcard-specs">{specs.map((spec, index) => <li key={index}>{spec.value}</li>)}</ul>}

        <footer className="lcard-foot">
          <p className="lcard-price"><strong>{price}</strong>{unit && <small>{unit}</small>}</p>
          <div className="lcard-actions">
            {onContact
              ? <button type="button" className="lcard-cta" onClick={() => onContact(listing)}>Contact</button>
              : <Link href={detailHref} className="lcard-cta">Contact</Link>}
            <Link href={detailHref} className="lcard-info" aria-label="View details" title="View details">
              <svg aria-hidden viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6h.01" /></svg>
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}
