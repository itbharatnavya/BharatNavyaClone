"use client";

// TrustBar — a row of LIVE stats that build confidence, pulled from real API
// data on mount. Each stat is fetched independently and simply omitted if its
// request fails or comes back empty (graceful degradation, no layout jank).
// Numbers are floored to a clean marketing figure with a "+" so they read as
// scale without ever overstating the true count.

import React, { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { Category } from "@/lib/types";
import Reveal from "@/components/Reveal";

// Each stat cycles through a distinct brand colour instead of a uniform
// blue treatment — a deliberate, low-risk way to spread the palette across
// the page without turning any one section loud (mirrors app/page.tsx).
const ACCENTS = [
  { bg: "var(--brand-tint)", color: "var(--brand)" },
  { bg: "var(--action-tint)", color: "var(--action)" },
  { bg: "var(--tricolor-green-tint)", color: "var(--tricolor-green)" },
  { bg: "var(--navy-tint)", color: "var(--navy)" },
];

function flattenCount(cats: Category[]): number {
  let n = 0;
  const walk = (list: Category[]) => {
    for (const c of list) {
      n += 1;
      if (c.children && c.children.length) walk(c.children);
    }
  };
  walk(cats || []);
  return n;
}

// Floor to a tidy figure so the displayed number is always <= the real one.
function floorNice(n: number): number {
  if (n < 10) return n;
  let step: number;
  if (n < 100) step = 10;
  else if (n < 1000) step = 50;
  else if (n < 10000) step = 100;
  else step = 1000;
  return Math.floor(n / step) * step;
}
function display(n: number): string {
  if (n < 10) return String(n);
  const v = floorNice(n);
  return new Intl.NumberFormat("en-IN").format(v) + "+";
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4h8a2 2 0 011.4.6l8.4 8.4a2 2 0 010 2.8z" />
      <circle cx="7.5" cy="8" r="1.4" />
    </svg>
  );
}

interface Stat {
  key: string;
  value: number;
  label: string;
  icon: React.ReactNode;
}

export default function TrustBar() {
  const [listings, setListings] = useState<number | null>(null);
  const [sellers, setSellers] = useState<number | null>(null);
  const [categories, setCategories] = useState<number | null>(null);
  const [brands, setBrands] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getListings({ limit: 1 })
      .then((r) => alive && typeof r.total === "number" && setListings(r.total))
      .catch(() => {});
    api
      .getFeaturedSellers()
      .then((rows) => alive && Array.isArray(rows) && setSellers(rows.length))
      .catch(() => {});
    api
      .getCategories()
      .then((c) => alive && setCategories(flattenCount(c)))
      .catch(() => {});
    api
      .getBrands()
      .then((b) => alive && Array.isArray(b) && setBrands(b.length))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const stats: Stat[] = ([
    listings && listings > 0
      ? { key: "listings", value: listings, label: "Products & services", icon: <BoxIcon /> }
      : null,
    sellers && sellers > 0
      ? { key: "sellers", value: sellers, label: "Verified sellers", icon: <ShieldIcon /> }
      : null,
    categories && categories > 0
      ? { key: "categories", value: categories, label: "Business categories", icon: <GridIcon /> }
      : null,
    brands && brands > 0
      ? { key: "brands", value: brands, label: "Trusted brands", icon: <TagIcon /> }
      : null,
  ] as (Stat | null)[]).filter((s): s is Stat => s !== null);

  if (stats.length === 0) return null;

  return (
    <div
      className="card card-flat"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 8,
        padding: "clamp(14px, 3vw, 22px)",
      }}
    >
      {stats.map((s, i) => {
        const accent = ACCENTS[i % ACCENTS.length];
        return (
          <Reveal key={s.key} delay={i * 60}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 14px",
                minWidth: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 12,
                  background: accent.bg,
                  color: accent.color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {s.icon}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(22px, 3.4vw, 28px)",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: accent.color,
                    lineHeight: 1.1,
                  }}
                >
                  {display(s.value)}
                </span>
                <span className="line-clamp-1" style={{ display: "block", fontSize: 13, color: "var(--muted)" }}>
                  {s.label}
                </span>
              </span>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
