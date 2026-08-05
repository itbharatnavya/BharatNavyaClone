"use client";

import React from "react";

export interface SpecTableProps {
  /** key → value pairs (product.specifications). */
  specs?: Record<string, string>;
  title?: string;
}

/** Clean two-column key-specs table for a product listing. */
export default function SpecTable({ specs, title = "Specifications" }: SpecTableProps) {
  const entries = Object.entries(specs || {}).filter(
    ([k, v]) => k && v !== undefined && v !== null && `${v}`.trim() !== ""
  );
  if (entries.length === 0) return null;

  return (
    <section>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
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
            <span style={{ fontSize: 13, color: "var(--muted)", textTransform: "capitalize" }}>
              {key.replace(/[_-]+/g, " ")}
            </span>
            <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
