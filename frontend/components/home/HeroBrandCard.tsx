"use client";

// HeroBrandCard — now the entire Directory hero: headline, search bar (handed
// in as `searchSlot` by HomeHero.tsx, which owns the scroll-docking logic),
// live trust stats, and auth-aware CTAs, all inside one navy card instead of
// a plain white section. Replaces the old FinalCta band that used to close
// out the page at the very bottom, unseen by anyone who didn't scroll all
// the way down.
//
// Auth-aware: a guest sees the admin-configured hero title (via `guestTitle`)
// plus the "join the marketplace" pitch; a logged-in buyer (no sellerProfile
// yet) is nudged to become a seller; a seller sees dashboard/listing
// shortcuts instead of buttons that don't apply to them (they're already a
// member, already on the marketplace).
//
// The stat row reuses useCategories()/useFeaturedSellers() from
// lib/catalog.tsx — CatalogProvider's already-fetched, session-wide data —
// instead of firing its own request (same rule TrustBar.tsx follows).

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCategories, useFeaturedSellers } from "@/lib/catalog";
import type { Category } from "@/lib/types";

export interface HeroBrandCardProps {
  guestTitle: string;
  searchSlot: React.ReactNode;
}

interface CardContent {
  eyebrow: string;
  headline: string;
  sub: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

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
  else step = 100;
  return Math.floor(n / step) * step;
}
function display(n: number): string {
  if (n < 10) return String(n);
  return new Intl.NumberFormat("en-IN").format(floorNice(n)) + "+";
}

function StorefrontIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0" />
      <path d="M5 9v10h14V9" />
      <path d="M9 19v-6h6v6" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// Large, low-opacity watermark glyph in the corner — decorative only, keeps
// the card from reading as a plain flat rectangle without adding an emoji or
// a hot-linked image (CLAUDE.md: local/inline art only).
function WatermarkIcon() {
  return (
    <svg
      aria-hidden
      width="220"
      height="220"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth="0.8"
      style={{ position: "absolute", right: -36, bottom: -36, pointerEvents: "none" }}
    >
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0 2.5 2.5 0 005 0" />
      <path d="M5 9v10h14V9" />
      <path d="M9 19v-6h6v6" />
    </svg>
  );
}

export default function HeroBrandCard({ guestTitle, searchSlot }: HeroBrandCardProps) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const { sellers } = useFeaturedSellers();
  const categoryCount = categories.length ? flattenCount(categories) : 0;
  const sellerCount = sellers.length;

  const content: CardContent = (() => {
    if (user?.sellerProfile) {
      const who = user.sellerProfile.companyName || user.name;
      return {
        eyebrow: `Welcome back, ${who}`,
        headline: "Buyers are searching right now",
        sub: "Keep your listings fresh and reply fast to stay ahead of other sellers on Bharat Navya.",
        primary: { label: "Go to your dashboard", href: "/dashboard" },
        secondary: { label: "Add a new listing", href: "/sell" },
      };
    }
    if (user) {
      const first = user.name?.split(" ")[0] || "there";
      return {
        eyebrow: `Welcome back, ${first}`,
        headline: "You're sourcing smarter — ready to sell too?",
        sub: "List your business free and get discovered by buyers who are already searching here.",
        primary: { label: "Become a seller — free", href: "/dashboard?tab=profile" },
        secondary: { label: "View saved products", href: "/dashboard?tab=saved" },
      };
    }
    return {
      eyebrow: "One account · Buy and sell",
      headline: guestTitle,
      sub: "No commissions, no middlemen — list free, discover verified suppliers, and turn enquiries into orders.",
      primary: { label: "Start selling — free", href: "/register" },
      secondary: { label: "Post a requirement", href: "/rfq" },
    };
  })();

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--r-lg)",
        padding: "clamp(24px, 4vw, 40px) clamp(24px, 4.4vw, 46px)",
        border: "1px solid var(--navy-deep)",
      }}
    >
      {/* Background + watermark live in their own clipped layer, separate from
          the content below — the content includes the search bar's suggestions
          dropdown, which is position:absolute and needs to overflow past the
          card's bottom edge (e.g. category/listing results) without being cut
          off by the rounded-corner clip this layer needs. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: "var(--r-lg)",
          background:
            "radial-gradient(560px 260px at 100% -25%, rgba(245,130,31,0.4) 0%, rgba(245,130,31,0) 65%)," +
            "radial-gradient(480px 220px at -5% 120%, rgba(30,158,82,0.3) 0%, rgba(30,158,82,0) 65%)," +
            "linear-gradient(135deg, var(--navy-mid) 0%, var(--navy) 55%, var(--navy-deep) 100%)",
        }}
      >
        <WatermarkIcon />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 620 }}>
        <div
          className="line-clamp-1"
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {content.eyebrow}
        </div>
        <h1
          style={{
            fontSize: "clamp(22px, 3vw, 32px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: "#ffffff",
            margin: "10px 0 0",
          }}
        >
          {content.headline}
        </h1>
        <p
          style={{
            fontSize: "var(--fs-sm)",
            color: "rgba(255,255,255,0.76)",
            lineHeight: 1.6,
            margin: "10px 0 0",
          }}
        >
          {content.sub}
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, marginTop: 24 }}>
        {searchSlot}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 24,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        {(categoryCount > 0 || sellerCount > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
            {sellerCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)" }}>
                <StorefrontIcon />
                <span style={{ fontSize: "var(--fs-sm)" }}>
                  <strong style={{ fontWeight: 800, color: "#fff" }}>{display(sellerCount)}</strong> verified sellers
                </span>
              </div>
            )}
            {categoryCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)" }}>
                <GridIcon />
                <span style={{ fontSize: "var(--fs-sm)" }}>
                  <strong style={{ fontWeight: 800, color: "#fff" }}>{display(categoryCount)}</strong> categories
                </span>
              </div>
            )}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href={content.primary.href} className="btn btn-primary">
            {content.primary.label}
          </Link>
          <Link
            href={content.secondary.href}
            className="btn"
            style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.28)" }}
          >
            {content.secondary.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
