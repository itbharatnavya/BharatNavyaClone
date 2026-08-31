"use client";

// A slim LIVE trust strip for the suite homepage. Pulls three real numbers on
// mount (total listings, verified sellers, business categories) and floors each
// to a tidy marketing figure so the displayed count is never overstated. Each
// stat self-omits if its request fails; the whole strip hides if none resolve.

import React, { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { Category } from "@/lib/types";

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
  return new Intl.NumberFormat("en-IN").format(floorNice(n)) + "+";
}

interface Stat {
  key: string;
  value: number;
  label: string;
}

export default function SuiteStats() {
  const [listings, setListings] = useState<number | null>(null);
  const [sellers, setSellers] = useState<number | null>(null);
  const [categories, setCategories] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    api.getListings({ limit: 1 })
      .then((r) => alive && typeof r.total === "number" && setListings(r.total))
      .catch(() => {});
    api.getFeaturedSellers()
      .then((rows) => alive && Array.isArray(rows) && setSellers(rows.length))
      .catch(() => {});
    api.getCategories()
      .then((c) => alive && setCategories(flattenCount(c)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const stats: Stat[] = ([
    listings && listings > 0 ? { key: "listings", value: listings, label: "Products & services listed" } : null,
    sellers && sellers > 0 ? { key: "sellers", value: sellers, label: "Verified vendors & experts" } : null,
    categories && categories > 0 ? { key: "categories", value: categories, label: "Business categories" } : null,
  ] as (Stat | null)[]).filter((s): s is Stat => s !== null);

  if (stats.length === 0) return null;

  return (
    <div
      className="card card-flat"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 8,
        padding: "clamp(16px, 3vw, 24px)",
      }}
    >
      {stats.map((s) => (
        <div key={s.key} style={{ padding: "8px 14px", minWidth: 0, textAlign: "center" }}>
          <span
            style={{
              display: "block",
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              lineHeight: 1.1,
            }}
          >
            {display(s.value)}
          </span>
          <span className="line-clamp-1" style={{ display: "block", fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
