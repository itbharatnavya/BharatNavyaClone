"use client";

// QuotesComparison — side-by-side comparison table of the quotes a buyer received for
// one RFQ. Scrolls horizontally on mobile (overflow-x:auto); no page-level overflow.

import React from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import type { Quote } from "@/lib/types";
import { formatINR, formatDate } from "./shared";

function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d="m12 2.5 2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95Z" />
    </svg>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-subtle)",
};

const td: React.CSSProperties = {
  padding: "12px",
  fontSize: 13,
  color: "var(--ink)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top",
};

export default function QuotesComparison({ quotes }: { quotes: Quote[] }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
        <thead>
          <tr>
            <th style={th}>Seller</th>
            <th style={th}>Price</th>
            <th style={th}>MOQ</th>
            <th style={th}>Delivery</th>
            <th style={th}>Valid until</th>
            <th style={th}>Note</th>
            <th style={{ ...th, textAlign: "right" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const s = q.seller || {};
            return (
              <tr key={q.id}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600 }}>{s.companyName || "Seller"}</span>
                    {s.isVerified && <Badge variant="verified">Verified</Badge>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 12, color: "var(--muted)" }}>
                    {s.city && <span>{s.city}</span>}
                    {s.rating != null && s.rating > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--action)" }}>
                        <StarIcon /> {s.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ ...td, whiteSpace: "nowrap", fontWeight: 600 }}>
                  {formatINR(q.price)}
                  {q.unit ? <span style={{ color: "var(--muted)", fontWeight: 400 }}>{` / ${q.unit}`}</span> : ""}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {q.moq != null ? `${q.moq}${q.unit ? ` ${q.unit}` : ""}` : "—"}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {q.deliveryDays != null ? `${q.deliveryDays} days` : "—"}
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {q.validUntil ? formatDate(q.validUntil) : "—"}
                </td>
                <td style={{ ...td, minWidth: 160, color: "var(--muted)" }}>{q.note || "—"}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {s.slug ? (
                    <Link href={`/seller/${s.slug}`} className="btn btn-primary btn-sm">
                      Contact
                    </Link>
                  ) : (
                    <span style={{ color: "var(--faint)" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
