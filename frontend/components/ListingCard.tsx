"use client";

import React from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { useShortlist } from "@/lib/shortlist";
import Avatar from "./Avatar";
import TrustBadges from "./TrustBadges";
import Button from "./Button";

export interface ListingCardProps {
  listing: Listing;
  href?: string; // detail link (defaults to /listing/[id])
  onContact?: (listing: Listing) => void;
  className?: string;
  /** "grid" (default, image-forward tile) or "row" (one-by-one list row — image
   * left, details middle, price/CTA right — used by DiscoveryResults' list view). */
  layout?: "grid" | "row";
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

// Sponsored/Featured signature: a thin colored edge bar (left on the row
// layout, top on the grid tile) plus a small uppercase label — a quicker,
// less cluttered scan than a badge chip sitting on the image.
function accentOf(listing: Listing): { label: string; color: string } | null {
  if (listing.isSponsored) return { label: "Sponsored", color: "var(--action)" };
  if (listing.isFeatured) return { label: "Featured", color: "var(--brand)" };
  return null;
}

function AccentBar({ color, edge }: { color: string; edge: "left" | "top" }) {
  return (
    <span
      aria-hidden
      style={
        edge === "left"
          ? { position: "absolute", top: 0, bottom: 0, left: 0, width: 4, background: color, borderRadius: "12px 0 0 12px" }
          : { position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: "12px 12px 0 0", zIndex: 2 }
      }
    />
  );
}

function LocationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
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

// Rating + seller (avatar-initials + name) + city + trust badges, one
// flex-wrapping line — the shared identity strip for both layouts.
function MetaLine({ listing }: { listing: Listing }) {
  const verified = listing.isVerifiedSeller || !!listing.seller?.isVerified;
  // There's no per-listing review system — only sellers get reviewed — so the
  // rating shown here is always the seller's real aggregate rating, not a
  // separate per-listing number.
  const rating = listing.seller?.rating ?? 0;
  const reviewCount = listing.seller?.reviewCount ?? 0;
  return (
    <div className="lc-meta">
      {rating > 0 && <RatingPill value={rating} count={reviewCount} />}
      <span className="lc-meta-seller">
        <Avatar src={listing.seller?.logo} name={sellerName(listing)} size={18} />
        <span className="line-clamp-1">{sellerName(listing)}</span>
      </span>
      {sellerCity(listing) && (
        <span className="lc-meta-city">
          <LocationIcon /> {sellerCity(listing)}
        </span>
      )}
      {(verified || listing.seller?.gstNumber || listing.seller?.yearEstablished) && (
        <TrustBadges
          verified={verified}
          gst={!!listing.seller?.gstNumber}
          years={
            listing.seller?.yearEstablished
              ? new Date().getFullYear() - listing.seller.yearEstablished
              : null
          }
          size="sm"
        />
      )}
      <style jsx>{`
        .lc-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12.5px;
          color: var(--muted);
        }
        .lc-meta-seller {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          max-width: 100%;
        }
        .lc-meta-city {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: var(--faint);
        }
      `}</style>
    </div>
  );
}

// Spec chips capped to 2 + "+N more" — reused by both layouts.
function SpecChips({ specs }: { specs: { label: string; value: string }[] }) {
  const visible = specs.slice(0, 2);
  const more = specs.length - visible.length;
  if (visible.length === 0) return null;
  return (
    <div className="lc-chips">
      {visible.map((s, i) => (
        <span key={i} className="lc-chip">
          {s.value}
        </span>
      ))}
      {more > 0 && <span className="lc-chip lc-chip-more">+{more} more</span>}
      <style jsx>{`
        .lc-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .lc-chip {
          font-size: 11.5px;
          font-weight: 500;
          color: var(--muted);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 3px 9px;
          white-space: nowrap;
        }
        .lc-chip-more {
          color: var(--brand-hover);
          border-color: #bfdbfe;
          background: var(--brand-tint);
        }
      `}</style>
    </div>
  );
}

// Save (shortlist) toggle. Rendered over/alongside a card without ever
// triggering the card's main link — the handler stops propagation + default.
function CardToggles({ listing }: { listing: Listing }) {
  const shortlist = useShortlist();
  const saved = shortlist.has(listing.id);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
      <button
        type="button"
        className="lc-toggle"
        aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
        aria-pressed={saved}
        title={saved ? "Saved" : "Save"}
        onClick={(e) => {
          stop(e);
          shortlist.toggle(listing.id);
        }}
        style={saved ? { color: "var(--action)", borderColor: "var(--action)" } : undefined}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill={saved ? "var(--action)" : "none"}
          stroke={saved ? "var(--action)" : "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
        </svg>
      </button>
      <style jsx>{`
        .lc-toggle {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.95);
          color: var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
          transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
        }
        .lc-toggle:hover {
          color: var(--ink);
          border-color: var(--border-strong);
        }
      `}</style>
    </div>
  );
}

export default function ListingCard({
  listing,
  href,
  onContact,
  className = "",
  layout = "grid",
}: ListingCardProps) {
  const detailHref = href || `/listing/${listing.id}`;
  const image = listing.media?.find((m) => m.type !== "video")?.url || listing.media?.[0]?.url;
  const isService = listing.type === "service";
  const product = listing.product;
  const service = listing.service;
  const accent = accentOf(listing);
  const specs = buildSpecs(listing);

  const priceLabel =
    product?.price != null
      ? `₹${formatINR(product.price)}`
      : product?.priceTiers && product.priceTiers.length > 0
      ? `₹${formatINR(product.priceTiers[0].price)}`
      : "Ask Price";
  const priceUnit =
    product?.price != null && product?.unitOfMeasure ? ` / ${product.unitOfMeasure}` : "";

  const rate = service?.rateCard?.find((item) => item.price > 0);
  const rateLabel = rate
    ? `₹${formatINR(rate.price)}`
    : service?.pricingModel === "quote"
    ? "Quote based"
    : "Rate on request";
  const rateUnit = rate?.unit ? ` / ${rate.unit.replace(/^\s*\/?\s*/, "")}` : "";

  const priceBlockLabel = isService ? rateLabel : priceLabel;
  const priceBlockUnit = isService ? rateUnit : priceUnit;

  const ContactButton = ({ block = false }: { block?: boolean }) =>
    onContact ? (
      <Button size="sm" block={block} className="btn-gradient" onClick={() => onContact(listing)}>
        Contact
      </Button>
    ) : (
      <Button size="sm" block={block} className="btn-gradient" href={detailHref}>
        Contact
      </Button>
    );

  // ---------- ROW VARIANT (one-by-one list row) ----------
  if (layout === "row") {
    return (
      <article className={["card card-flat lc-row", className].filter(Boolean).join(" ")}>
        {accent && <AccentBar color={accent.color} edge="left" />}
        <Link href={detailHref} className="lc-row-media">
          {image ? (
            <div className="lc-row-img" style={{ backgroundImage: `url(${image})` }} />
          ) : (
            <div className="lc-row-img lc-row-img-empty">
              <span>{isService ? "Service" : "No image"}</span>
            </div>
          )}
        </Link>

        <div className="lc-row-body">
          <span className="lc-eyebrow" style={{ color: accent?.color || "var(--brand)" }}>{accent?.label || (isService ? "Service" : "Product")}</span>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Link href={detailHref} style={{ minWidth: 0, flex: 1 }}>
              <h3 className="line-clamp-1 lc-row-title">{listing.title}</h3>
            </Link>
            <CardToggles listing={listing} />
          </div>

          <MetaLine listing={listing} />
          <SpecChips specs={specs} />

          <div className="lc-row-bottom">
            <div className="lc-row-price">
              <span className="lc-row-price-amount">{priceBlockLabel}</span>
              {priceBlockUnit && <span className="lc-row-price-unit">{priceBlockUnit}</span>}
            </div>
            <div className="lc-row-actions">
              <ContactButton />
              <Button size="sm" variant="secondary" href={detailHref}>
                View
              </Button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .lc-row {
            display: flex;
            gap: 14px;
            padding: 12px;
            position: relative;
          }
          .lc-row-media {
            flex-shrink: 0;
            display: block;
            position: relative;
          }
          .lc-row-img {
            width: 104px;
            height: 104px;
            border-radius: 10px;
            background-size: cover;
            background-position: center;
            background-color: var(--bg-subtle);
            border: 1px solid var(--border);
          }
          .lc-row-img-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--faint);
            font-size: 11px;
            text-align: center;
          }
          .lc-row-body {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
          }
          .lc-eyebrow {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }
          .lc-row-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--ink);
            line-height: 1.3;
          }
          .lc-row-bottom {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-top: 2px;
          }
          .lc-row-price-amount {
            font-size: 16.5px;
            font-weight: 800;
            color: var(--ink);
          }
          .lc-row-price-unit {
            font-size: 11.5px;
            color: var(--faint);
          }
          .lc-row-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
          }

          @media (max-width: 640px) {
            .lc-row-img,
            .lc-row-img-empty {
              width: 84px;
              height: 84px;
            }
            .lc-row-bottom {
              flex-wrap: wrap;
            }
          }
          @media (max-width: 400px) {
            .lc-row-actions :global(.btn) {
              padding-left: 10px;
              padding-right: 10px;
            }
          }
        `}</style>
      </article>
    );
  }

  // ---------- GRID VARIANT (image-forward tile — product & service alike) ----------
  return (
    <article className={["card card-flat lc-grid", className].filter(Boolean).join(" ")}>
      {accent && <AccentBar color={accent.color} edge="top" />}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
        <CardToggles listing={listing} />
      </div>
      <Link href={detailHref} className="lc-grid-media">
        {image ? (
          <div className="lc-grid-img" style={{ backgroundImage: `url(${image})` }} />
        ) : (
          <div className="lc-grid-img lc-grid-img-empty">
            <span>{isService ? "Service" : "No image"}</span>
          </div>
        )}
      </Link>

      <div className="lc-grid-body">
        <span className="lc-eyebrow" style={{ color: accent?.color || "var(--brand)" }}>{accent?.label || (isService ? "Service" : "Product")}</span>
        <Link href={detailHref}>
          <h3 className="line-clamp-1 lc-grid-title">{listing.title}</h3>
        </Link>

        <MetaLine listing={listing} />
        <SpecChips specs={specs} />

        <div className="lc-grid-price">
          <span className="lc-grid-price-amount">{priceBlockLabel}</span>
          {priceBlockUnit && <span className="lc-grid-price-unit">{priceBlockUnit}</span>}
        </div>

        <div className="lc-grid-actions">
          <ContactButton block />
          <Button size="sm" variant="secondary" href={detailHref}>
            View
          </Button>
        </div>
      </div>

      <style jsx>{`
        .lc-grid {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .lc-grid-media {
          display: block;
          position: relative;
        }
        .lc-grid-img {
          aspect-ratio: 4 / 3;
          background-size: cover;
          background-position: center;
          background-color: var(--bg-subtle);
          border-bottom: 1px solid var(--border);
        }
        .lc-grid-img-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--faint);
          font-size: 13px;
        }
        .lc-grid-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          flex: 1;
        }
        .lc-eyebrow {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .lc-grid-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.3;
        }
        .lc-grid-price {
          margin-top: auto;
          padding-top: 2px;
        }
        .lc-grid-price-amount {
          font-size: 16.5px;
          font-weight: 800;
          color: var(--ink);
        }
        .lc-grid-price-unit {
          font-size: 11.5px;
          color: var(--faint);
        }
        .lc-grid-actions {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </article>
  );
}
