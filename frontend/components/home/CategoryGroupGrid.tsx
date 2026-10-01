"use client";

// CategoryGroupGrid — a "browse by category" grid: each top-level category
// is its own bordered card with a handful of its real sub-categories shown
// as photo tiles underneath. The groups/tiles here come from BharatSource's
// OWN category tree (getCategories()), not a fabricated local-services
// taxonomy — see frontend-design-guide.md v8 for why. Local /demo images
// only, resolved via the shared lib/categoryImages.ts slug/keyword map
// (categories carry no image field of their own).

import React from "react";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { imgFor } from "@/lib/categoryImages";
import Reveal from "@/components/Reveal";

export interface CategoryGroupGridProps {
  categories: Category[];
  className?: string;
}

const TILES_PER_GROUP = 3;
const MAX_GROUPS = 4;

export default function CategoryGroupGrid({ categories, className = "" }: CategoryGroupGridProps) {
  const groups = (categories || [])
    .filter((c) => (c.children?.length || 0) >= 2)
    .slice(0, MAX_GROUPS);

  if (groups.length === 0) return null;

  return (
    <div className={["grid grid-cols-1 sm:grid-cols-2 gap-5", className].join(" ")}>
      {groups.map((group, gi) => {
        const tiles = (group.children || []).slice(0, TILES_PER_GROUP);
        return (
          <Reveal key={group.id} delay={gi * 80}>
          <div className="card card-flat" style={{ padding: 18, minWidth: 0 }}>
            <Link
              href={`/${group.slug}`}
              className=""
              style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", transition: "color 120ms ease" }}
            >
              {group.name}
            </Link>

            <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 12, marginTop: 14 }}>
              {tiles.map((sub, i) => (
                <Link
                  key={sub.id}
                  href={`/${sub.slug}`}
                  style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}
                >
                  <div
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <img
                      src={`/demo/${imgFor(sub, i)}.jpg`}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span
                    className="line-clamp-1"
                    style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", textAlign: "center", transition: "color 120ms ease" }}
                  >
                    {sub.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          </Reveal>
        );
      })}
    </div>
  );
}
