"use client";

import React from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";

export interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

function letter(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export default function CategoryGrid({ categories, className = "" }: CategoryGridProps) {
  if (!categories || categories.length === 0) return null;
  return (
    <div className={["grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4", className].join(" ")}>
      {categories.map((c) => (
        <Link
          key={c.id || c.slug}
          href={`/${c.slug}`}
          className="card card-pad"
          style={{ display: "flex", alignItems: "center", gap: 14 }}
        >
          <span
            aria-hidden
            style={{
              width: 46,
              height: 46,
              flexShrink: 0,
              borderRadius: 12,
              background: "var(--brand-tint)",
              color: "var(--brand-hover)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: c.icon ? 22 : 18,
              fontWeight: 700,
            }}
          >
            {c.icon || letter(c.name)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              className="line-clamp-1"
              style={{ display: "block", fontSize: 15, fontWeight: 600, color: "var(--ink)" }}
            >
              {c.name}
            </span>
            {typeof c.listingCount === "number" && (
              <span style={{ fontSize: 13, color: "var(--faint)" }}>
                {c.listingCount} {c.listingCount === 1 ? "listing" : "listings"}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
