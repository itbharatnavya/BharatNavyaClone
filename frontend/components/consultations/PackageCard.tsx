"use client";

// Consultations — one productised service package on an expert's profile.
// WHY this is the centrepiece: an expert sells fixed-scope, fixed-price packages
// (this is what makes hiring an expert feel different from buying a product). The
// card shows the price BIG, the timeline, exactly what you get (a deliverables
// checklist), and a single clear "Book this package" action that opens the booking
// modal with this package preselected.

import React from "react";
import type { ConsultationPackage } from "@/lib/types";
import { CheckIcon, ClockIcon, formatPrice } from "./icons";

export interface PackageCardProps {
  pkg: ConsultationPackage;
  onBook: (pkg: ConsultationPackage) => void;
}

export default function PackageCard({ pkg, onBook }: PackageCardProps) {
  // A price of 0 / pricingModel "quote" means the fee is scoped on enquiry — show
  // "Custom quote" rather than a misleading "₹0". Retainer/ongoing packages read
  // better without the "Delivered in" prefix.
  const isQuote = !pkg.price || pkg.pricingModel === "quote";
  const ongoing = /ongoing|retainer|monthly/i.test(pkg.timeline);
  return (
    <div
      className="card card-flat"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 20,
        minWidth: 0,
      }}
    >
      {/* ---- Title + price ---- */}
      <div style={{ minWidth: 0 }}>
        <h3
          style={{
            fontSize: "var(--fs-md)",
            fontWeight: 700,
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {pkg.title}
        </h3>
        <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--fs-xl)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            {isQuote ? "Custom quote" : formatPrice(pkg.price)}
          </span>
          {!isQuote && pkg.unit && (
            <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--muted)" }}>{pkg.unit}</span>
          )}
        </div>
        {pkg.timeline && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              fontSize: "var(--fs-xs)",
              color: "var(--muted)",
            }}
          >
            <span style={{ color: "var(--faint)", display: "inline-flex" }}>
              <ClockIcon size={15} />
            </span>
            {ongoing ? pkg.timeline : `Delivered in ${pkg.timeline}`}
          </div>
        )}
      </div>

      {pkg.description && (
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
          {pkg.description}
        </p>
      )}

      {/* ---- Deliverables checklist ---- */}
      {pkg.deliverables.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {pkg.deliverables.map((d) => (
            <li key={d} style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
              <span style={{ color: "var(--success)", flexShrink: 0, marginTop: 1, display: "inline-flex" }}>
                <CheckIcon size={16} />
              </span>
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--ink)", lineHeight: 1.45, minWidth: 0 }}>{d}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: "auto" }}
        onClick={() => onBook(pkg)}
      >
        Book this package
      </button>
    </div>
  );
}
