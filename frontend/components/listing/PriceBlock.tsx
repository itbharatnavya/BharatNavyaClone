"use client";

import React from "react";
import type { Listing } from "@/lib/types";

export interface PriceBlockProps {
  listing: Listing;
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function humanize(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--faint)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

/**
 * Price presentation for a listing.
 * - PRODUCT: ₹price (or first tier / "Ask Price") + a quantity price-ladder + MOQ/unit.
 * - SERVICE: rate-card rows + pricing model + booking type.
 */
export default function PriceBlock({ listing }: PriceBlockProps) {
  const pricingModelLabel: Record<string, string> = {
    fixed: "Fixed price",
    hourly: "Hourly rate",
    quote: "On quote",
  };
  const bookingLabel: Record<string, string> = {
    instant: "Instant booking",
    enquiry: "By enquiry",
    quote: "Request a quote",
  };

  // ---------------- SERVICE ----------------
  if (listing.type === "service") {
    const svc = listing.service;
    const rows = (svc?.rateCard || []).filter((row) => row.price > 0);
    return (
      <div className="card card-flat card-pad">
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Rate card
        </div>

        {rows.length > 0 ? (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span style={{ fontSize: 14, color: "var(--muted)" }}>{r.label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                  ₹{formatINR(r.price)}
                  {r.unit ? <span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 500 }}> / {r.unit.replace(/^\s*\/?\s*/, "")}</span> : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
            {svc?.pricingModel === "quote" ? "Price on request" : "Ask for rate"}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 16 }}>
          {svc?.pricingModel && (
            <Fact label="Pricing" value={pricingModelLabel[svc.pricingModel] || svc.pricingModel} />
          )}
          {svc?.bookingType && (
            <Fact label="Booking" value={bookingLabel[svc.bookingType] || svc.bookingType} />
          )}
          {typeof svc?.experienceYears === "number" && (
            <Fact label="Experience" value={`${svc.experienceYears} yrs`} />
          )}
          {svc?.serviceMode && <Fact label="Mode" value={humanize(svc.serviceMode)} />}
        </div>
      </div>
    );
  }

  // ---------------- PRODUCT ----------------
  const product = listing.product;
  const tiers = product?.priceTiers || [];
  const unit = product?.unitOfMeasure || "unit";
  const basePrice =
    product?.price != null
      ? product.price
      : tiers.length > 0
      ? tiers[0].price
      : null;

  return (
    <div className="card card-flat card-pad">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        {basePrice != null ? (
          <>
            <span style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              ₹{formatINR(basePrice)}
            </span>
            <span style={{ fontSize: 14, color: "var(--faint)" }}>/ {unit}</span>
            {product?.price == null && tiers.length > 0 && (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>onwards</span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>Ask Price</span>
        )}
      </div>

      {/* Quantity price ladder */}
      {tiers.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Quantity pricing
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {tiers.map((tier, i) => {
              const qty =
                tier.maxQty != null
                  ? `${tier.minQty}–${tier.maxQty}`
                  : `${tier.minQty}+`;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: i % 2 ? "var(--bg-subtle)" : "#fff",
                    borderBottom: i < tiers.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    {qty} {tier.unit || unit}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                    ₹{formatINR(tier.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 16 }}>
        {product?.moq != null && <Fact label="Min. order" value={`${product.moq} ${unit}`} />}
        {product?.availability && <Fact label="Availability" value={humanize(product.availability)} />}
        {product?.leadTime && <Fact label="Lead time" value={product.leadTime} />}
        {product?.sampleAvailable && <Fact label="Sample" value="Available" />}
      </div>
    </div>
  );
}
