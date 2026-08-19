"use client";

// CategoryMegaMenu — a category mega-menu that scales to 100+
// categories. getCategories() returns a FLAT Category[] (253 items across 24
// top-level groups); we group by parentId into a tree client-side.
//
// Exports:
//   • default CategoryMegaMenu — the DESKTOP trigger + flyout panel. Left rail
//     lists the top-level categories (ordered by the admin-controlled
//     `order`/priority field); hovering/focusing one reveals its
//     sub-categories (and any grandchildren) in a panel on the right. Both
//     columns are capped to a user-friendly viewport height and scroll
//     internally once their content overflows.
//   • MobileCategoryAccordion — a tap-to-expand accordion for the mobile menu.
//   • useCategoryTree / CATEGORY_ICONS / CategoryIcon — shared helpers, reused by
//     app/categories/page.tsx (the full 253-category directory).
//
// A dev server is already running; this file only reads getCategories().

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCategoryTree as useCatalogCategoryTree } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import type { CategoryTreeNode } from "@/lib/categoryTree";

// ------------------------------------------------------------------
// Icons — data ships icon:null and the brand uses NO emoji. We render a
// small reusable set of stroke-style line glyphs (Navbar SVG style: viewBox
// 0 0 24 24, fill none, stroke currentColor, round caps) and map every
// top-level slug to the closest glyph. Unmapped slugs fall back to a
// first-letter monogram in a tinted rounded square (never an emoji).
// ------------------------------------------------------------------
type GlyphName =
  | "tag"
  | "box"
  | "tools"
  | "bolt"
  | "leaf"
  | "beaker"
  | "truck"
  | "document";

// Each glyph is one or more <path d> strings drawn with round caps/joins.
const GLYPH_PATHS: Record<GlyphName, string[]> = {
  tag: ["M4 4h7l9 9-7 7-9-9V4z", "M8 8h.01"],
  box: [
    "M16.5 9.4l-9-5.19",
    "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    "M3.27 6.96L12 12.01l8.73-5.05",
    "M12 22.08V12",
  ],
  tools: [
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  ],
  bolt: ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  leaf: ["M11 20A7 7 0 0 1 4 13C4 8 8 4 20 4c0 9-5 16-9 16z", "M4 20c4-6 9-10 14-12"],
  beaker: [
    "M9 3h6",
    "M10 3v6l-4.8 8.3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.3-2.3L14 9V3",
    "M8.5 14h7",
  ],
  truck: [
    "M3 4h11v11H3z",
    "M14 8h4l3 3v4h-7",
    "M7 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
    "M20 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
  ],
  document: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6",
    "M9 13h6",
    "M9 17h6",
  ],
};

// Map each of the 24 top-level slugs to the closest generic glyph.
const CATEGORY_GLYPHS: Record<string, GlyphName> = {
  "textiles-fabrics-yarn": "tag",
  "apparel-clothing-garments": "tag",
  "gifts-crafts-sports": "tag",
  "packaging-printing": "box",
  "home-furniture-furnishings": "box",
  "metals-steel-alloys": "box",
  "plastics-polymers-rubber": "box",
  "industrial-machinery-equipment": "tools",
  tools: "tools",
  "home-local-services": "tools",
  "automotive-parts-accessories": "tools",
  "building-construction": "tools",
  "electronics-electrical": "bolt",
  "agriculture-farming": "leaf",
  food: "leaf",
  "chemicals-dyes-solvents": "beaker",
  "pharmaceuticals-lab-supplies": "beaker",
  "medical-healthcare-supplies": "beaker",
  "beauty-personal-care-wellness": "beaker",
  "logistics-transport-warehousing": "truck",
  "office-stationery-supplies": "document",
  accounting: "document",
  "professional-consulting-services": "document",
  "education-training-events": "document",
};

// ------------------------------------------------------------------
// Tree — CategoryTreeNode/buildTree live in @/lib/categoryTree (shared).
// ------------------------------------------------------------------

/** Top-level category tree + a loaded flag, from the shared CatalogProvider
 *  (lib/catalog.tsx) — categories are fetched once per session there, not
 *  re-fetched by every consumer of this hook. */
export function useCategoryTree(): { tops: CategoryTreeNode[]; loaded: boolean } {
  const { tree, loading } = useCatalogCategoryTree();
  return { tops: tree, loaded: !loading };
}

/** Small translation helper with an English fallback (dictionary may lack keys). */
function useTr(): (key: string, fallback: string) => string {
  const { t } = useT();
  return useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return !v || v === key ? fallback : v;
    },
    [t]
  );
}

// ------------------------------------------------------------------
// Icon chip
// ------------------------------------------------------------------
export function CategoryIcon({
  slug,
  name,
  size = 22,
}: {
  slug: string;
  name: string;
  size?: number;
}) {
  // Uniform tinted rounded square so line glyphs and monograms read as one set.
  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.max(6, Math.round(size * 0.28)),
    background: "var(--brand-tint)",
    color: "var(--brand)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const glyph = CATEGORY_GLYPHS[slug];
  if (glyph) {
    const inner = Math.round(size * 0.62);
    return (
      <span aria-hidden style={box}>
        <svg
          width={inner}
          height={inner}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {GLYPH_PATHS[glyph].map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden style={{ ...box, fontSize: Math.round(size * 0.46), fontWeight: 700 }}>
      {(name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function ChevronRight({ dimmed }: { dimmed?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      style={{ flexShrink: 0, opacity: dimmed ? 0.35 : 0.9, transition: "opacity 120ms ease" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// ==================================================================
// DESKTOP — trigger + flyout
// ==================================================================
export default function CategoryMegaMenu() {
  const tr = useTr();
  const pathname = usePathname();
  const { tops, loaded } = useCategoryTree();

  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Keep active index in range as data loads.
  useEffect(() => {
    if (activeIdx > tops.length - 1) setActiveIdx(0);
  }, [tops.length, activeIdx]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleTriggerClick = () => {
    setOpen((o) => {
      const next = !o;
      if (next) requestAnimationFrame(() => itemRefs.current[0]?.focus());
      return next;
    });
  };

  const onRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const onLeftKeyDown = (e: React.KeyboardEvent) => {
    const last = tops.length - 1;
    if (last < 0) return;
    let next = activeIdx;
    if (e.key === "ArrowDown") next = Math.min(activeIdx + 1, last);
    else if (e.key === "ArrowUp") next = Math.max(activeIdx - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setActiveIdx(next);
    itemRefs.current[next]?.focus();
  };

  const active = tops[activeIdx];

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => loaded && tops.length > 0 && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={onRootKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm transition-colors category-strip-trigger"
      >
        <GridIcon />
        {/* Deliberately not tr("nav.categories") here — that key resolves to
            the shorter generic "Categories" translation used elsewhere, but
            this trigger specifically uses the fuller "All
            Categories" wording. */}
        All Categories
        <ChevronDown />
      </button>

      {open && tops.length > 0 && (
        <div className="absolute left-0 top-full pt-2 z-50 animate-scale-in">
          <div
            className="card card-flat"
            style={{
              display: "flex",
              flexDirection: "column",
              width: "min(880px, calc(100vw - 32px))",
              padding: 0,
            }}
          >
            <div style={{ display: "flex", minHeight: 0 }}>
              {/* LEFT rail — top-level categories, ordered by the
                  admin-controlled priority (`order`) field. Tinted grey so it
                  reads as the nav rail against the white content panel
                  (a grey-rail/white-panel mega-menu convention common on
                  large B2B directory sites); the active
                  item "pops" as a white, bordered, shadowed pill rather than
                  a flat tint, so the current selection is unambiguous. Capped
                  to a user-friendly viewport height; scrolls internally past
                  that. */}
              <ul
                onKeyDown={onLeftKeyDown}
                style={{
                  width: 250,
                  flexShrink: 0,
                  background: "var(--bg-subtle)",
                  borderRight: "1px solid var(--border)",
                  padding: 8,
                  margin: 0,
                  listStyle: "none",
                  maxHeight: "min(70vh, 560px)",
                  overflowY: "auto",
                }}
                aria-label={tr("nav.categories", "Categories")}
              >
                {tops.map((top, i) => {
                  const on = i === activeIdx;
                  return (
                    <li key={top.id} style={{ marginBottom: 3 }}>
                      <Link
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        href={`/${top.slug}`}
                        onMouseEnter={() => setActiveIdx(i)}
                        onFocus={() => setActiveIdx(i)}
                        aria-current={on ? "true" : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 10px",
                          borderRadius: 10,
                          background: on ? "var(--surface)" : "transparent",
                          border: on ? "1px solid var(--border)" : "1px solid transparent",
                          boxShadow: on ? "var(--shadow-card)" : "none",
                          color: on ? "var(--brand-hover)" : "var(--ink)",
                          fontSize: 14,
                          fontWeight: on ? 600 : 500,
                          transition: "background-color 120ms ease, color 120ms ease, box-shadow 120ms ease",
                        }}
                      >
                        <CategoryIcon slug={top.slug} name={top.name} size={22} />
                        <span className="line-clamp-1" style={{ flex: 1, minWidth: 0 }}>
                          {top.name}
                        </span>
                        <span style={{ fontSize: 12, color: on ? "var(--brand)" : "var(--faint)", flexShrink: 0 }}>
                          {top.children.length}
                        </span>
                        <ChevronRight dimmed={!on} />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* RIGHT panel — sub-categories of the hovered/focused top,
                  laid out as a bordered tile grid (`.megamenu-cell`, see
                  globals.css) rather than a bare list of text links, so
                  columns/rows read as a real grid rather than loose text.
                  Same height cap as the left rail so the flyout never grows
                  past a comfortable viewport height; scrolls independently. */}
              <div style={{ flex: 1, minWidth: 0, padding: "18px 20px", maxHeight: "min(70vh, 560px)", overflowY: "auto" }}>
                {active && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 16,
                        paddingBottom: 14,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <CategoryIcon slug={active.slug} name={active.name} size={26} />
                        <h3
                          className="line-clamp-1"
                          style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", minWidth: 0 }}
                        >
                          {active.name}
                        </h3>
                      </div>
                      <Link
                        href={`/${active.slug}`}
                        className="hover:text-brand-hover"
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        {tr("megamenu.viewAll", "View all in")} {active.name} →
                      </Link>
                    </div>

                    {active.children.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
                        }}
                      >
                        {active.children.map((child) => (
                          <div key={child.id} className="megamenu-cell">
                            <Link
                              href={`/${child.slug}`}
                              className="hover:text-brand"
                              style={{
                                display: "block",
                                fontSize: 14,
                                fontWeight: 600,
                                color: "var(--ink)",
                                transition: "color 120ms ease",
                              }}
                            >
                              {child.name}
                            </Link>
                            {child.children.length > 0 && (
                              <ul
                                style={{
                                  margin: "8px 0 0",
                                  padding: "8px 0 0",
                                  borderTop: "1px solid var(--border)",
                                  listStyle: "none",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 5,
                                }}
                              >
                                {child.children.map((g) => (
                                  <li key={g.id} style={{ minWidth: 0 }}>
                                    <Link
                                      href={`/${g.slug}`}
                                      className="line-clamp-1 hover:text-brand"
                                      style={{ fontSize: 13, color: "var(--muted)", transition: "color 120ms ease" }}
                                    >
                                      {g.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, color: "var(--muted)" }}>
                        {tr("megamenu.browseCategory", "Browse listings in")} {active.name}.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer — link to the full directory */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "12px 20px",
                background: "var(--bg-subtle)",
                flexShrink: 0,
              }}
            >
              <Link
                href="/categories"
                className="hover:text-brand-hover"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)" }}
              >
                {tr("megamenu.browseAll", "Browse all categories")} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================================================================
// MOBILE — tap-to-expand accordion (rendered inside the mobile menu)
// ==================================================================
export function MobileCategoryAccordion() {
  const tr = useTr();
  const { tops, loaded } = useCategoryTree();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />
        ))}
      </div>
    );
  }
  if (tops.length === 0) return null;

  return (
    <div>
      <div className="px-3 mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-faint">
          {tr("nav.categories", "Categories")}
        </span>
        <Link href="/categories" className="text-xs font-semibold text-brand hover:text-brand-hover">
          {tr("megamenu.browseAll", "Browse all")} →
        </Link>
      </div>

      <div className="flex flex-col gap-0.5">
        {tops.map((top) => {
          const isOpen = expandedId === top.id;
          const panelId = `mcat-${top.id}`;
          return (
            <div key={top.id} style={{ minWidth: 0 }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setExpandedId(isOpen ? null : top.id)}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-base text-ink hover:bg-bg-subtle transition-colors"
              >
                <CategoryIcon slug={top.slug} name={top.name} size={24} />
                <span className="line-clamp-1 flex-1" style={{ minWidth: 0, fontWeight: 500 }}>
                  {top.name}
                </span>
                <span className="text-xs text-faint flex-shrink-0">{top.children.length}</span>
                <span
                  className="flex-shrink-0 text-faint"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
                >
                  <ChevronDown />
                </span>
              </button>

              {isOpen && (
                <div id={panelId} className="flex flex-col gap-0.5 pb-2" style={{ paddingLeft: 12 }}>
                  <Link
                    href={`/${top.slug}`}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-bg-subtle"
                  >
                    {tr("megamenu.viewAllShort", "View all")} {top.name} →
                  </Link>
                  {top.children.map((child) => (
                    <div key={child.id} style={{ minWidth: 0 }}>
                      <Link
                        href={`/${child.slug}`}
                        className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg-subtle hover:text-ink line-clamp-1"
                      >
                        {child.name}
                      </Link>
                      {child.children.length > 0 && (
                        <div className="flex flex-col" style={{ paddingLeft: 12 }}>
                          {child.children.map((g) => (
                            <Link
                              key={g.id}
                              href={`/${g.slug}`}
                              className="block rounded-lg px-3 py-1.5 text-[13px] text-faint hover:bg-bg-subtle hover:text-ink line-clamp-1"
                            >
                              {g.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
