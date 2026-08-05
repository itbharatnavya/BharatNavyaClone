"use client";

// All Categories — the scalable directory for the full 253-category catalog.
// Every top-level category is a section (icon + name → /slug) with its
// sub-categories listed beneath as a wrap of links; grandchildren appear as
// small muted links. Breadcrumb: Home / Categories.

import React from "react";
import Link from "next/link";
import Breadcrumbs, { Crumb } from "@/components/Breadcrumbs";
import { useCategoryTree, CategoryIcon } from "@/components/CategoryMegaMenu";

export default function CategoriesPage() {
  const { tops, loaded } = useCategoryTree();

  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: "Categories" }];
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
            {tops.map((top) => (
              <section key={top.id} className="card card-flat" style={{ padding: 20, minWidth: 0 }}>
                {/* Section header */}
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
                    <span style={{ fontSize: 12, color: "var(--faint)" }}>
                      {top.children.length} sub-categories
                    </span>
                  </span>
                </Link>

                <div className="divider" style={{ margin: "16px 0" }} />

                {/* Sub-categories */}
                {top.children.length > 0 ? (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {top.children.map((child) => (
                      <li key={child.id} style={{ minWidth: 0 }}>
                        <Link
                          href={`/${child.slug}`}
                          className="line-clamp-1 hover:text-brand"
                          style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", transition: "color 120ms ease" }}
                        >
                          {child.name}
                        </Link>
                        {child.children.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {child.children.map((g) => (
                              <Link
                                key={g.id}
                                href={`/${g.slug}`}
                                style={{
                                  fontSize: 12,
                                  color: "var(--muted)",
                                  background: "var(--bg-subtle)",
                                  border: "1px solid var(--border)",
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
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
