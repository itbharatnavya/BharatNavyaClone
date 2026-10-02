"use client";

import React from "react";

export interface SpecTableProps {
  /** key → value pairs (product.specifications). */
  specs?: Record<string, string>;
  title?: string;
}

function SpecsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 3.2h6a.8.8 0 01.8.8v1H8.2V4a.8.8 0 01.8-.8z" />
      <path d="M8 11.5h8M8 15.5h8" />
    </svg>
  );
}

/** Clean two-column key-specs table for a product listing, in the same
 * icon-chip-labeled card panel as the rest of the listing detail page
 * (app/listing/[id]/page.tsx's SectionLabel — Specifications is this
 * component's only caller, so it owns the card/label directly rather than
 * making the page coordinate an empty-state wrapper around it). */
export default function SpecTable({ specs, title = "Specifications" }: SpecTableProps) {
  const entries = Object.entries(specs || {}).filter(
    ([k, v]) => k && v !== undefined && v !== null && `${v}`.trim() !== ""
  );
  if (entries.length === 0) return null;

  return (
    <section className="card card-flat card-pad">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span
          aria-hidden
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--r-xs)",
            background: "var(--brand-tint)",
            color: "var(--brand-hover)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SpecsIcon />
        </span>
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          {title}
        </h2>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
        {entries.map(([key, value], i) => (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 34%) 1fr",
              gap: 12,
              padding: "11px 16px",
              background: i % 2 ? "var(--bg-subtle)" : "#fff",
              borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--muted)", textTransform: "capitalize" }}>
              {key.replace(/[_-]+/g, " ")}
            </span>
            <span style={{ fontSize: "var(--fs-sm)", color: "var(--ink)", fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
