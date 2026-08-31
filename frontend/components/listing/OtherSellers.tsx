"use client";

import React from "react";
import Link from "next/link";
import type { Offer } from "@/lib/api";
import Badge from "@/components/Badge";
import Rating from "@/components/Rating";

export interface OtherSellersProps {
  offers: Offer[];
  offerCount: number;
  minPrice: number | null;
  /** Optional heading override; defaults to English. */
  heading?: string;
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function LocationIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

/**
 * MULTI-VENDOR-PER-PRODUCT — "Also offered by N sellers" comparison.
 * Renders a scrollable table of other approved sellers offering the same product,
 * each with their price / MOQ / availability and a View action. Hidden when there
 * are no other sellers.
 */
export default function OtherSellers({
  offers,
  offerCount,
  minPrice,
  heading,
}: OtherSellersProps) {
  if (!offerCount || offers.length === 0) return null;

  const title =
    heading ||
    `Also offered by ${offerCount} ${offerCount === 1 ? "seller" : "sellers"}${
      minPrice != null ? ` · from ₹${formatINR(minPrice)}` : ""
    }`;

  return (
    <section className="os-wrap" style={{ marginTop: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{title}</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        Compare sellers for this product and pick the best price, quantity or location.
      </p>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="os-scroll" style={{ overflowX: "auto" }}>
          <table className="os-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Seller</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Min. order</th>
                <th style={{ textAlign: "left" }}>Availability</th>
                <th style={{ textAlign: "right" }} aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const name = o.seller?.companyName || o.seller?.name || "Seller";
                const city = o.seller?.city || o.location?.city;
                const rating = o.seller?.rating ?? 0;
                const reviewCount = o.seller?.reviewCount;
                const availabilityLabel =
                  o.availability === "in_stock"
                    ? "In stock"
                    : o.availability === "made_to_order"
                    ? "Made to order"
                    : o.availability || "—";
                return (
                  <tr key={o.listingId}>
                    {/* Seller */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {o.seller?.slug ? (
                            <Link
                              href={`/seller/${o.seller.slug}`}
                              className="line-clamp-1"
                              style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="line-clamp-1" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                              {name}
                            </span>
                          )}
                          {o.seller?.isVerified && <Badge variant="verified">Verified</Badge>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          {rating > 0 && <Rating value={rating} count={reviewCount} size={13} />}
                          {city && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 13,
                                color: "var(--faint)",
                              }}
                            >
                              <LocationIcon /> {city}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {o.price != null ? (
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>
                            ₹{formatINR(o.price)}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--faint)" }}> / {o.unitOfMeasure}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>Ask Price</span>
                      )}
                    </td>

                    {/* MOQ */}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap", fontSize: 14, color: "var(--muted)" }}>
                      {o.moq != null ? (
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>
                          {o.moq} {o.unitOfMeasure}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Availability */}
                    <td style={{ fontSize: 14, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {availabilityLabel}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link
                        href={`/listing/${o.listingId}`}
                        className="btn btn-secondary"
                        style={{ padding: "7px 14px", fontSize: 13 }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .os-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        .os-table thead th {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--faint);
          padding: 12px 16px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .os-table tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .os-table tbody tr:last-child td {
          border-bottom: none;
        }
        .os-table tbody tr:hover {
          background: var(--brand-tint);
        }
      `}</style>
    </section>
  );
}
