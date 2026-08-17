"use client";

// All Categories — the scalable directory for the full 253-category catalog.
// Every top-level category is a section (icon + name → /slug) with its
// sub-categories listed beneath as a wrap of links; grandchildren appear as
// small muted links. Breadcrumb: Home / Categories.

import React from "react";
import Link from "next/link";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import { useCategoryTree, CategoryIcon } from "@/components/CategoryMegaMenu";

// Cycle each section through the four brand accents (same device the
// homepage uses for its stats strip / why-us pillars) so a page of 24
// otherwise-identical white cards gets some rhythm — the color carries no
// per-category meaning, it's purely a visual break.
const ACCENTS = [
  { bar: "var(--brand)", tint: "var(--brand-tint)", border: "#d3e2f7" },
  { bar: "var(--action)", tint: "var(--action-tint)", border: "#f9d9b8" },
  { bar: "var(--tricolor-green)", tint: "var(--tricolor-green-tint)", border: "#cdebd7" },
  { bar: "var(--navy)", tint: "var(--navy-tint)", border: "#dbe1ec" },
];

export default function CategoriesPage() {
  const { tops, loaded } = useCategoryTree();

  const crumbs: Crumb[] = [{ label: "Directory", href: "/directory" }, { label: "Categories" }];
  const totalSubs = tops.reduce((n, t) => n + t.children.length, 0);

  return (
    <div>
      {/* Header band */}
      <section style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        <div className="container-bs" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <Breadcrumbs items={crumbs} />
          <h1
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              marginTop: 14,
            }}
          >
            All Categories
          </h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 720 }}>
            Browse every industry on the marketplace — from raw materials to finished goods and
            professional services.
            {loaded && tops.length > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--faint)" }}>
                  {tops.length} categories · {totalSubs} sub-categories
                </span>
              </>
            )}
          </p>
        </div>
      </section>

      {/* Directory */}
      <div className="container-bs section-pad-sm">
        {!loaded ? (
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="card card-flat" style={{ padding: 20 }}>
                <span className="skeleton" style={{ display: "block", height: 22, width: "60%", marginBottom: 16 }} />
                {Array.from({ length: 5 }).map((__, j) => (
                  <span key={j} className="skeleton" style={{ display: "block", height: 13, width: `${80 - j * 8}%`, marginBottom: 10 }} />
                ))}
              </div>
            ))}
          </div>
        ) : tops.length === 0 ? (
          <p style={{ fontSize: 15, color: "var(--muted)" }}>No categories available right now.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 20,
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {tops.map((top, idx) => {
              const accent = ACCENTS[idx % ACCENTS.length];
              return (
              <section
                key={top.id}
                className="card card-flat"
                style={{ padding: 0, minWidth: 0, overflow: "hidden", borderTop: `3px solid ${accent.bar}` }}
              >
                {/* Section header — a tinted band (accent.tint) so it reads as
                    a header row distinct from the body, not just text sitting
                    on the same white as everything else. */}
                <div style={{ background: accent.tint, padding: "16px 20px" }}>
                  <Link
                    href={`/${top.slug}`}
                    className="group"
                    style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}
                  >
                    <CategoryIcon slug={top.slug} name={top.name} size={38} />
                    <span style={{ minWidth: 0 }}>
                      <span
                        className="line-clamp-1 group-hover:text-brand"
                        style={{ display: "block", fontSize: 16, fontWeight: 700, color: "var(--ink)", transition: "color 120ms ease" }}
                      >
                        {top.name}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {top.children.length} sub-categories
                      </span>
                    </span>
                  </Link>
                </div>

                <div style={{ padding: "16px 20px 20px" }}>
                  {/* Sub-categories — each a bordered row rather than a bare
                      line of text, so the list reads as a real list. */}
                  {top.children.length > 0 ? (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {top.children.map((child, i) => (
                        <li
                          key={child.id}
                          className="hover:bg-bg-subtle"
                          style={{
                            minWidth: 0,
                            padding: "10px 6px",
                            borderTop: i === 0 ? "none" : "1px solid var(--border)",
                            borderRadius: 8,
                            transition: "background-color 120ms ease",
                          }}
                        >
                          <Link
                            href={`/${child.slug}`}
                            className="line-clamp-1 hover:text-brand"
                            style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", transition: "color 120ms ease" }}
                          >
                            {child.name}
                          </Link>
                          {child.children.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                              {child.children.map((g) => (
                                <Link
                                  key={g.id}
                                  href={`/${g.slug}`}
                                  style={{
                                    fontSize: 12,
                                    color: "var(--muted)",
                                    background: accent.tint,
                                    border: `1px solid ${accent.border}`,
                                    borderRadius: 999,
                                    padding: "3px 10px",
                                    whiteSpace: "nowrap",
                                  }}
                                  className="hover:text-ink"
                                >
                                  {g.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 14, color: "var(--muted)" }}>No sub-categories yet.</p>
                  )}

                  <Link
                    href={`/${top.slug}`}
                    className="hover:text-brand-hover"
                    style={{ display: "inline-block", marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--brand)" }}
                  >
                    View all in {top.name} →
                  </Link>
                </div>
              </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
