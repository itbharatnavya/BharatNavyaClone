"use client";

// FeaturedCategories — a curated, appealing set of top categories rendered as
// image cards (local /demo images only, never external URLs). This is NOT the
// full 253-category directory — that lives in the mega-menu and /categories.
// Each card links to the category store page. Robust image + icon resolution by
// slug/keyword so it degrades gracefully for any curated set.

import React from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { imgFor } from "@/lib/categoryImages";

export interface FeaturedCategoriesProps {
  categories: Category[];
  className?: string;
}

// Family → small inline SVG icon (viewBox 0 0 24 24, currentColor).
function iconFor(cat: Category): React.ReactNode {
  const hay = `${(cat.slug || "").toLowerCase()} ${(cat.name || "").toLowerCase()}`;
  const p = (d: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split("|").map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
  if (/electr/.test(hay)) return p("M13 2L4 14h7l-2 8 9-12h-7l2-8z");
  if (/machin|equipment|tool|hardware|industrial/.test(hay))
    return p("M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.3-.6-.6-2.3 2.7-2.6z");
  if (/chemical|dye|solvent|polymer|plastic|rubber|pharma|lab/.test(hay))
    return p("M9 3h6|M10 3v6l-4.5 8a2 2 0 001.8 3h9.4a2 2 0 001.8-3L14 9V3");
  if (/logistic|transport|warehous|freight/.test(hay))
    return p("M3 7h11v8H3z|M14 10h4l3 3v2h-7z|M7 18a1.6 1.6 0 100-3.2A1.6 1.6 0 007 18z|M17.5 18a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z");
  if (/agri|farm|food|beverage/.test(hay))
    return p("M12 3c4 3 6 6 6 10a6 6 0 01-12 0c0-4 2-7 6-10z");
  if (/build|construction|cement/.test(hay))
    return p("M3 21h18|M6 21V8l6-4 6 4v13|M10 21v-5h4v5");
  if (/medical|health/.test(hay)) return p("M12 5v14|M5 12h14");
  if (/service|consult|account|legal|educat|training|professional/.test(hay))
    return p("M4 8h16v11H4z|M9 8V6a3 3 0 016 0v2");
  if (/textile|fabric|yarn|apparel|cloth|garment|wear/.test(hay))
    return p("M8 3l4 3 4-3 4 4-3 2v11H7V9L4 7z");
  if (/auto|vehicle|motor/.test(hay))
    return p("M5 13l1.5-5h11L19 13|M3 13h18v5h-2a2 2 0 01-4 0H9a2 2 0 01-4 0H3z");
  if (/packag|print/.test(hay)) return p("M21 8l-9-5-9 5 9 5 9-5z|M3 8v8l9 5 9-5V8|M12 13v8");
  return p("M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z");
}

export default function FeaturedCategories({ categories, className = "" }: FeaturedCategoriesProps) {
  if (!categories || categories.length === 0) return null;
  const items = categories.slice(0, 8);

  return (
    <div className={["grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4", className].join(" ")}>
      {items.map((c, i) => (
        <Link
          key={c.id || c.slug}
          href={`/${c.slug}`}
          className="card"
          style={{ overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}
        >
          <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--bg-subtle)" }}>
            <img
              src={`/demo/${imgFor(c, i)}.jpg`}
              alt=""
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(15,23,42,0) 40%, rgba(15,23,42,0.62) 100%)",
              }}
            />
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "rgba(255,255,255,0.92)",
                color: "var(--brand)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(16,24,40,0.18)",
              }}
            >
              {iconFor(c)}
            </span>
            <span
              className="line-clamp-2"
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 10,
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
                textShadow: "0 1px 3px rgba(0,0,0,0.35)",
              }}
            >
              {c.name}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "10px 12px",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {typeof c.listingCount === "number" && c.listingCount > 0
                ? `${c.listingCount} ${c.listingCount === 1 ? "listing" : "listings"}`
                : "Explore"}
            </span>
            <span aria-hidden style={{ color: "var(--brand)", display: "inline-flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
