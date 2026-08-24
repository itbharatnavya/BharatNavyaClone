"use client";

// Shared suite icons + the PRODUCTS lookup table for the standalone "Coming
// soon" pages (app/credit-card, app/mutual — each does
// `PRODUCTS.find(p => p.key === "...")`). NOT the source of truth for nav —
// the Navbar "Products" switcher and Footer product list moved to their own
// Directory/Recruitment-only lists (components/suite/SuiteNavMenu.tsx,
// Footer.tsx's own MODULES) when Recruitment replaced Consultations as the
// suite's next module; see CLAUDE.md. Icons are distinct inline SVG
// line-glyphs (NO emoji): a directory grid, a payment card and a fund growth
// chart.

import React from "react";

export interface SuiteProduct {
  key: string;
  name: string;
  fullName: string;
  href: string;
  tagline: string;
  status: "live" | "soon";
  Icon: React.FC<{ size?: number }>;
}

interface IconProps {
  size?: number;
}

// Directory — a 4-square grid (sourcing / catalog).
export function DirectoryIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
  );
}

// Credit Card — a payment card with a magnetic stripe.
export function CreditCardIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h4" />
    </svg>
  );
}

// Mutual — a trending-up fund growth line with an arrow.
export function MutualIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 8h4v4" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export const CONTACT_EMAIL = "hello@bharatsource.in";

export const PRODUCTS: SuiteProduct[] = [
  {
    key: "directory",
    name: "Directory",
    fullName: "BharatSource Directory",
    href: "/directory",
    tagline: "Source products & raw materials from verified vendors across India.",
    status: "live",
    Icon: DirectoryIcon,
  },
  {
    key: "credit-card",
    name: "Credit Card",
    fullName: "BharatSource Credit Card",
    href: "/credit-card",
    tagline: "Business credit cards for your company.",
    status: "soon",
    Icon: CreditCardIcon,
  },
  {
    key: "mutual",
    name: "Mutual",
    fullName: "BharatSource Mutual",
    href: "/mutual",
    tagline: "Grow surplus with curated mutual funds.",
    status: "soon",
    Icon: MutualIcon,
  },
];
