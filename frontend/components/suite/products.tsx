"use client";

// Single source of truth for the BharatSource product SUITE (the multi-product
// umbrella). Shared by the suite homepage grid, the Navbar "Products" switcher
// and the Footer "Products" column so the four products stay in lockstep.
// Icons are distinct inline SVG line-glyphs (NO emoji): a directory grid, a
// consultation briefcase, a payment card and a fund growth chart.

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

// Consultations — a briefcase (hire experts / professional services).
export function ConsultationsIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M3 12.5h18" />
      <path d="M12 12v2" />
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
    key: "consultations",
    name: "Consultations",
    fullName: "BharatSource Consultations",
    href: "/consultations",
    tagline: "Hire verified CAs, lawyers, consultants and service experts.",
    status: "live",
    Icon: ConsultationsIcon,
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
