"use client";

import React from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";

export interface SubcategoryChipsProps {
  items: Category[];
  activeSlug?: string;
  className?: string;
}

export default function SubcategoryChips({ items, activeSlug, className = "" }: SubcategoryChipsProps) {
  if (!items || items.length === 0) return null;
  return (
    <div
      className={["no-scrollbar", className].filter(Boolean).join(" ")}
      style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
    >
      {items.map((c) => (
        <Link
          key={c.id || c.slug}
          href={`/${c.slug}`}
          className={c.slug === activeSlug ? "chip chip-active" : "chip"}
        >
          {c.icon ? <span aria-hidden>{c.icon}</span> : null}
          {c.name}
          {typeof c.listingCount === "number" && c.listingCount > 0 && (
            <span style={{ opacity: 0.7, fontWeight: 500 }}>{c.listingCount}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
