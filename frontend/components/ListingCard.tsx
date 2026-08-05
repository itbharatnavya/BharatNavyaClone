"use client";

import React from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { useCompare } from "@/lib/compare";
import { useShortlist } from "@/lib/shortlist";
import Badge from "./Badge";
import Rating from "./Rating";
import TrustBadges from "./TrustBadges";
import Button from "./Button";

export interface ListingCardProps {
  listing: Listing;
  href?: string; // detail link (defaults to /listing/[id])
  onContact?: (listing: Listing) => void;
  className?: string;
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

function LocationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

// Save (shortlist) + Compare toggles. Rendered over/alongside a card without ever
// triggering the card's main link — the handlers stop propagation + default.
function CardToggles({ listing }: { listing: Listing }) {
  const compare = useCompare();
  const shortlist = useShortlist();
  const inCompare = compare.has(listing.id);
  const saved = shortlist.has(listing.id);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div style={{ display: "inline-flex", gap: 6 }}>
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
      <button
        type="button"
        className="lc-toggle"
        aria-label={inCompare ? "Remove from compare" : "Add to compare"}
        aria-pressed={inCompare}
        title={inCompare ? "Added to compare" : "Compare"}
        onClick={(e) => {
          stop(e);
          compare.toggle(listing.id);
        }}
        style={
          inCompare
            ? { color: "var(--brand)", borderColor: "var(--brand)", background: "var(--brand-tint)" }
            : undefined
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="4" width="7" height="16" rx="1.4" />
          <rect x="14" y="4" width="7" height="16" rx="1.4" />
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
}: ListingCardProps) {
  const detailHref = href || `/listing/${listing.id}`;
  const image = listing.media?.find((m) => m.type !== "video")?.url || listing.media?.[0]?.url;
  const isService = listing.type === "service";

  const verified =
    listing.isVerifiedSeller || !!listing.seller?.isVerified;

  // ---------- SERVICE VARIANT (rich row) ----------
  if (isService) {
    const svc = listing.service;
    const rate = svc?.rateCard?.[0];
    const rateLabel = rate
      ? `₹${formatINR(rate.price)}${rate.unit ? ` / ${rate.unit}` : ""}`
      : svc?.pricingModel === "quote"
      ? "On quote"
      : "Ask rate";

    return (
      <article className={["card card-pad", className].filter(Boolean).join(" ")}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {listing.isSponsored && <Badge variant="sponsored">Sponsored</Badge>}
              {verified && <Badge variant="verified">Verified</Badge>}
              <div style={{ marginLeft: "auto" }}>
                <CardToggles listing={listing} />
              </div>
            </div>
            <Link href={detailHref}>
              <h3
                className="line-clamp-1"
                style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", marginTop: 8 }}
              >
                {listing.title}
              </h3>
            </Link>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {listing.rating > 0 && <Rating value={listing.rating} count={listing.reviewCount} size={14} />}
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{sellerName(listing)}</span>
              {sellerCity(listing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13, color: "var(--faint)" }}>
                  <LocationIcon /> {sellerCity(listing)}
                </span>
              )}
            </div>

            {svc?.credentials && svc.credentials.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {svc.credentials.slice(0, 3).map((c, i) => (
                  <Badge key={i} variant="neutral">
                    {c}
                  </Badge>
                ))}
              </div>
            )}

            <p className="line-clamp-2" style={{ fontSize: 14, color: "var(--muted)", marginTop: 10 }}>
              {listing.description}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
              {typeof svc?.experienceYears === "number" && (
                <Meta label="Experience" value={`${svc.experienceYears} yrs`} />
              )}
              {svc?.serviceArea && svc.serviceArea.length > 0 && (
                <Meta label="Serves" value={svc.serviceArea.slice(0, 2).join(", ")} />
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 10,
              flexShrink: 0,
              minWidth: 128,
            }}
          >
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{rateLabel}</div>
            </div>
            {onContact ? (
              <Button size="sm" onClick={() => onContact(listing)}>
                Contact
              </Button>
            ) : (
              <Button size="sm" href={detailHref}>
                Contact
              </Button>
            )}
            <Button size="sm" variant="secondary" href={detailHref}>
              View
            </Button>
          </div>
        </div>
      </article>
    );
  }

  // ---------- PRODUCT VARIANT (image-forward) ----------
  const product = listing.product;
  const priceLabel =
    product?.price != null
      ? `₹${formatINR(product.price)}`
      : product?.priceTiers && product.priceTiers.length > 0
      ? `₹${formatINR(product.priceTiers[0].price)}`
      : "Ask Price";
  const priceUnit =
    product?.price != null && product?.unitOfMeasure ? ` / ${product.unitOfMeasure}` : "";

  return (
    <article
      className={["card", className].filter(Boolean).join(" ")}
      style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
    >
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
        <CardToggles listing={listing} />
      </div>
      <Link href={detailHref} style={{ display: "block", position: "relative" }}>
        <div
          style={{
            aspectRatio: "4 / 3",
            background: image ? undefined : "var(--bg-subtle)",
            backgroundImage: image ? `url(${image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!image && (
            <span style={{ color: "var(--faint)", fontSize: 13 }}>No image</span>
          )}
        </div>
        {(listing.isSponsored || listing.isFeatured) && (
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            {listing.isSponsored ? (
              <Badge variant="sponsored">Sponsored</Badge>
            ) : (
              <Badge variant="premium">Featured</Badge>
            )}
          </div>
        )}
      </Link>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <Link href={detailHref}>
          <h3
            className="line-clamp-2"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35, minHeight: 40 }}
          >
            {listing.title}
          </h3>
        </Link>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>{priceLabel}</span>
          {priceUnit && <span style={{ fontSize: 13, color: "var(--faint)" }}>{priceUnit}</span>}
        </div>

        {product?.moq != null && (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            MOQ: {product.moq} {product.unitOfMeasure || "units"}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
          <span className="line-clamp-1">{sellerName(listing)}</span>
          {sellerCity(listing) && (
            <>
              <span style={{ color: "var(--faint)" }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--faint)" }}>
                <LocationIcon /> {sellerCity(listing)}
              </span>
            </>
          )}
        </div>

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

        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 6 }}>
          {onContact ? (
            <Button size="sm" block onClick={() => onContact(listing)}>
              Contact
            </Button>
          ) : (
            <Button size="sm" block href={detailHref}>
              Contact
            </Button>
          )}
          <Button size="sm" variant="secondary" href={detailHref}>
            View
          </Button>
        </div>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
