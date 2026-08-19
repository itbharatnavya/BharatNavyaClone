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
  layout = "grid",
}: ListingCardProps) {
  const detailHref = href || `/listing/${listing.id}`;
  const image = listing.media?.find((m) => m.type !== "video")?.url || listing.media?.[0]?.url;
  const isService = listing.type === "service";
  const product = listing.product;
  const service = listing.service;

  const verified = listing.isVerifiedSeller || !!listing.seller?.isVerified;

  const priceLabel =
    product?.price != null
      ? `₹${formatINR(product.price)}`
      : product?.priceTiers && product.priceTiers.length > 0
      ? `₹${formatINR(product.priceTiers[0].price)}`
      : "Ask Price";
  const priceUnit =
    product?.price != null && product?.unitOfMeasure ? ` / ${product.unitOfMeasure}` : "";

  const rate = service?.rateCard?.[0];
  const rateLabel = rate
    ? `₹${formatINR(rate.price)}`
    : service?.pricingModel === "quote"
    ? "On quote"
    : "Ask rate";
  const rateUnit = rate?.unit ? ` / ${rate.unit}` : "";

  // ---------- ROW VARIANT (one-by-one list row) ----------
  if (layout === "row") {
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

    const priceBlockLabel = isService ? rateLabel : priceLabel;
    const priceBlockUnit = isService ? rateUnit : priceUnit;

    return (
      <article className={["card lc-row", className].filter(Boolean).join(" ")}>
        <Link href={detailHref} className="lc-row-media">
          {image ? (
            <div className="lc-row-img" style={{ backgroundImage: `url(${image})` }} />
          ) : (
            <div className="lc-row-img lc-row-img-empty">
              <span>{isService ? "Service" : "No image"}</span>
            </div>
          )}
          {(listing.isSponsored || listing.isFeatured) && (
            <span className="lc-row-imgbadge">
              {listing.isSponsored ? (
                <Badge variant="sponsored">Sponsored</Badge>
              ) : (
                <Badge variant="premium">Featured</Badge>
              )}
            </span>
          )}
        </Link>

        <div className="lc-row-body">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Link href={detailHref} style={{ minWidth: 0, flex: 1 }}>
              <h3 className="line-clamp-2 lc-row-title">{listing.title}</h3>
            </Link>
            <CardToggles listing={listing} />
          </div>

          <div className="lc-row-meta">
            {listing.rating > 0 && <Rating value={listing.rating} count={listing.reviewCount} size={13} />}
            <span className="line-clamp-1">{sellerName(listing)}</span>
            {sellerCity(listing) && (
              <span className="lc-row-city">
                <LocationIcon /> {sellerCity(listing)}
              </span>
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

          {specs.length > 0 && (
            <div className="lc-row-specs">
              {specs.map((s, i) => (
                <span key={i} className="lc-row-spec">
                  <strong>{s.label}:</strong> {s.value}
                </span>
              ))}
            </div>
          )}

          <p className="line-clamp-2 lc-row-desc">{listing.description}</p>
        </div>

        <div className="lc-row-aside">
          <div className="lc-row-price">
            <span className="lc-row-price-amount">{priceBlockLabel}</span>
            {priceBlockUnit && <span className="lc-row-price-unit">{priceBlockUnit}</span>}
          </div>
          <div className="lc-row-actions">
            {onContact ? (
              <Button size="sm" className="btn-gradient" onClick={() => onContact(listing)}>
                Contact
              </Button>
            ) : (
              <Button size="sm" className="btn-gradient" href={detailHref}>
                Contact
              </Button>
            )}
            <Button size="sm" variant="secondary" href={detailHref}>
              View
            </Button>
          </div>
        </div>

        <style jsx>{`
          .lc-row {
            display: flex;
            gap: 16px;
            padding: 16px;
            position: relative;
          }
          .lc-row-media {
            flex-shrink: 0;
            display: block;
            position: relative;
          }
          .lc-row-img {
            width: 148px;
            height: 148px;
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
            font-size: 12px;
            text-align: center;
          }
          .lc-row-imgbadge {
            position: absolute;
            top: 8px;
            left: 8px;
          }
          .lc-row-body {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .lc-row-title {
            font-size: 16.5px;
            font-weight: 700;
            color: var(--ink);
            line-height: 1.35;
          }
          .lc-row-meta {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            font-size: 13px;
            color: var(--muted);
          }
          .lc-row-city {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            color: var(--faint);
          }
          .lc-row-specs {
            display: flex;
            flex-wrap: wrap;
            gap: 6px 16px;
          }
          .lc-row-spec {
            font-size: 12.5px;
            color: var(--muted);
          }
          .lc-row-spec strong {
            color: var(--ink);
            font-weight: 600;
          }
          .lc-row-desc {
            font-size: 13.5px;
            color: var(--muted);
            margin: 0;
          }
          .lc-row-aside {
            flex-shrink: 0;
            width: 156px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 12px;
            padding-left: 16px;
            border-left: 1px solid var(--border);
          }
          .lc-row-price {
            text-align: right;
          }
          .lc-row-price-amount {
            display: block;
            font-size: 19px;
            font-weight: 800;
            color: var(--ink);
          }
          .lc-row-price-unit {
            font-size: 12px;
            color: var(--faint);
          }
          .lc-row-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .lc-row-actions :global(.btn) {
            width: 100%;
          }

          @media (max-width: 640px) {
            .lc-row {
              flex-wrap: wrap;
            }
            .lc-row-img,
            .lc-row-img-empty {
              width: 92px;
              height: 92px;
            }
            .lc-row-aside {
              width: 100%;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              border-left: none;
              border-top: 1px solid var(--border);
              padding-left: 0;
              padding-top: 12px;
              margin-top: 4px;
            }
            .lc-row-price {
              text-align: left;
            }
            .lc-row-actions {
              flex-direction: row;
              flex: 0 0 auto;
            }
            .lc-row-actions :global(.btn) {
              width: auto;
              flex: 1;
            }
          }
        `}</style>
      </article>
    );
  }

  // ---------- SERVICE VARIANT (grid — rich row) ----------
  if (isService) {
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

            {service?.credentials && service.credentials.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {service.credentials.slice(0, 3).map((c, i) => (
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
              {typeof service?.experienceYears === "number" && (
                <Meta label="Experience" value={`${service.experienceYears} yrs`} />
              )}
              {service?.serviceArea && service.serviceArea.length > 0 && (
                <Meta label="Serves" value={service.serviceArea.slice(0, 2).join(", ")} />
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
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                {rateLabel}
                {rateUnit}
              </div>
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

  // ---------- PRODUCT VARIANT (grid — image-forward) ----------
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
