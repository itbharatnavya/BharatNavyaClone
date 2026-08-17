"use client";

// CategoryBadge — a category icon chip for the homepage's category row
// (components/home/CategoryIconGrid.tsx): an accent-coloured pictogram on a
// soft tinted rounded-square, not a loud solid-colour circle. This reuses
// the SAME tint pattern already established elsewhere in the app (the
// mega-menu's CategoryIcon, TrustBar's stat icons — brand-tint bg + brand
// icon) rather than inventing a new look, just scaled up and with its own
// colour per category instead of one shared brand blue. Every one of the 24
// top-level categories gets its own icon + colour (not a shared "family"
// bucket) so a row of featured categories never shows repeated-looking
// icons even when several come from the same broad industry group. Falls
// back to a first-letter monogram for anything outside that curated set
// (e.g. an admin featuring a sub-category directly). Still inline SVG, no
// emoji, no external images — per CLAUDE.md.

import React from "react";

interface IconSpec {
  color: string;
  render: (c: string) => React.ReactNode;
}

const ICONS: Record<string, IconSpec> = {
  "textiles-fabrics-yarn": {
    color: "#7c3aed",
    render: (c) => (
      <>
        <rect x="4" y="3" width="16" height="4" rx="1.5" fill={c} />
        <rect x="4" y="17" width="16" height="4" rx="1.5" fill={c} />
        <path d="M7 7l10 10M17 7L7 17" stroke={c} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  "apparel-clothing-garments": {
    color: "#db2777",
    render: (c) => <path d="M9 3L5 6l2 3 2-1v10a1 1 0 001 1h4a1 1 0 001-1V8l2 1 2-3-4-3-2 1.2h-2L9 3z" fill={c} />,
  },
  "gifts-crafts-sports": {
    color: "#f59e0b",
    render: (c) => (
      <>
        <rect x="4" y="9" width="16" height="11" rx="1.5" fill={c} />
        <rect x="3" y="6" width="18" height="4" rx="1" fill={c} />
        <rect x="11" y="6" width="2" height="14" fill="#fff" />
      </>
    ),
  },
  "packaging-printing": {
    color: "#2563eb",
    render: (c) => (
      <>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill={c} />
        <path d="M4 7.5L12 12l8-4.5M12 12v9" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  "home-furniture-furnishings": {
    color: "#9333ea",
    render: (c) => (
      <>
        <path d="M6 11V7a2 2 0 012-2h8a2 2 0 012 2v4" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="4" y="11" width="16" height="6" rx="2" fill={c} />
        <rect x="4" y="17" width="3" height="4" rx="1" fill={c} />
        <rect x="17" y="17" width="3" height="4" rx="1" fill={c} />
      </>
    ),
  },
  "metals-steel-alloys": {
    color: "#475569",
    render: (c) => (
      <>
        <rect x="3" y="15" width="18" height="5" rx="1.5" fill={c} />
        <rect x="5" y="9" width="14" height="5" rx="1.5" fill={c} opacity="0.85" />
        <rect x="7" y="3" width="10" height="5" rx="1.5" fill={c} opacity="0.7" />
      </>
    ),
  },
  "plastics-polymers-rubber": {
    color: "#06b6d4",
    render: (c) => <path d="M12 2C12 2 5 11 5 15.5A7 7 0 0019 15.5C19 11 12 2 12 2z" fill={c} />,
  },
  "industrial-machinery-equipment": {
    color: "#16305c",
    render: (c) => (
      <>
        <circle cx="12" cy="12" r="6" fill={c} />
        <circle cx="12" cy="12" r="2.4" fill="#fff" />
        <rect x="10.8" y="1.5" width="2.4" height="3.5" rx="1" fill={c} />
        <rect x="10.8" y="19" width="2.4" height="3.5" rx="1" fill={c} />
        <rect x="1.5" y="10.8" width="3.5" height="2.4" rx="1" fill={c} />
        <rect x="19" y="10.8" width="3.5" height="2.4" rx="1" fill={c} />
      </>
    ),
  },
  tools: {
    color: "#78350f",
    render: (c) => (
      <path
        d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
        fill={c}
      />
    ),
  },
  "home-local-services": {
    color: "#ca8a04",
    render: (c) => <path d="M12 3l9 7h-2.5v9a1 1 0 01-1 1h-4v-6h-3v6H6.5a1 1 0 01-1-1v-9H3l9-7z" fill={c} />,
  },
  "automotive-parts-accessories": {
    color: "#dc2626",
    render: (c) => (
      <>
        <path
          d="M5 16l1.2-4.8A2 2 0 018.1 9.7h7.8a2 2 0 011.9 1.5L19 16"
          stroke={c}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="3.5" y="15" width="17" height="4.5" rx="1.5" fill={c} />
        <circle cx="7.5" cy="19.5" r="1.6" fill="#fff" />
        <circle cx="16.5" cy="19.5" r="1.6" fill="#fff" />
      </>
    ),
  },
  "building-construction": {
    color: "#d97706",
    render: (c) => (
      <>
        <rect x="4" y="10" width="6" height="10" fill={c} />
        <rect x="11" y="6" width="4" height="14" fill={c} opacity="0.85" />
        <rect x="16" y="13" width="4" height="7" fill={c} opacity="0.7" />
        <path d="M4 10h5M4 3v7" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  "electronics-electrical": {
    color: "#f5821f",
    render: (c) => <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={c} />,
  },
  "agriculture-farming": {
    color: "#16a34a",
    render: (c) => (
      <>
        <path d="M11 20A7 7 0 014 13C4 8 8 4 20 4c0 9-5 16-9 16z" fill={c} />
        <path d="M4 20c4-6 9-10 14-12" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  food: {
    color: "#ea580c",
    render: (c) => (
      <>
        <path d="M4 12h16a8 8 0 01-16 0z" fill={c} />
        <path d="M12 3c0 1.5-1.5 1.5-1.5 3S12 8 12 9.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  "chemicals-dyes-solvents": {
    color: "#0d9488",
    render: (c) => (
      <>
        <path d="M10 3v6l-4.8 8.3A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.3-2.3L14 9V3" fill={c} />
        <path d="M9 3h6" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  "pharmaceuticals-lab-supplies": {
    color: "#0891b2",
    render: (c) => (
      <>
        <rect x="3" y="9.5" width="18" height="5" rx="2.5" fill={c} />
        <path d="M12 9.5v5" stroke="#fff" strokeWidth="1.4" />
      </>
    ),
  },
  "medical-healthcare-supplies": {
    color: "#e11d48",
    render: (c) => <path d="M10 3h4v6h6v4h-6v6h-4v-6H4V9h6V3z" fill={c} />,
  },
  "beauty-personal-care-wellness": {
    color: "#c026d3",
    render: (c) => (
      <>
        <path d="M12 2c2 4 6 5 6 9a6 6 0 01-12 0c0-4 4-5 6-9z" fill={c} />
        <path d="M12 2l2 3-2 2-2-2 2-3z" fill="#fff" />
      </>
    ),
  },
  "logistics-transport-warehousing": {
    color: "#4338ca",
    render: (c) => (
      <>
        <path d="M3 4h11v11H3z" fill={c} />
        <path d="M14 8h4l3 3v4h-7" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="18" r="1.8" fill={c} />
        <circle cx="17.5" cy="18" r="1.8" fill={c} />
      </>
    ),
  },
  "office-stationery-supplies": {
    color: "#0f766e",
    render: (c) => (
      <>
        <path d="M4 20l1-5L16 4l4 4L9 19l-5 1z" fill={c} />
        <path d="M13 7l4 4" stroke="#fff" strokeWidth="1.3" />
      </>
    ),
  },
  accounting: {
    color: "#15803d",
    render: (c) => (
      <>
        <rect x="4" y="13" width="4" height="7" rx="1" fill={c} />
        <rect x="10" y="8" width="4" height="12" rx="1" fill={c} />
        <rect x="16" y="4" width="4" height="16" rx="1" fill={c} />
      </>
    ),
  },
  "professional-consulting-services": {
    color: "#1a4fae",
    render: (c) => (
      <>
        <rect x="3" y="8" width="18" height="12" rx="2" fill={c} />
        <path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2" stroke="#fff" strokeWidth="1.6" fill="none" />
        <rect x="10.5" y="12" width="3" height="3" rx="0.6" fill="#fff" />
      </>
    ),
  },
  "education-training-events": {
    color: "#7c2d12",
    render: (c) => (
      <>
        <path d="M12 3L2 8l10 5 10-5-10-5z" fill={c} />
        <path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </>
    ),
  },
};

const FALLBACK_COLOR = "#1a4fae";

// Appends an alpha channel to a 6-digit hex colour for a soft tint background.
function tint(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export interface CategoryBadgeProps {
  slug: string;
  name: string;
  size?: number;
}

export default function CategoryBadge({ slug, name, size = 72 }: CategoryBadgeProps) {
  const spec = ICONS[slug];
  const color = spec ? spec.color : FALLBACK_COLOR;
  const iconSize = Math.round(size * 0.48);

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: tint(color, "17"),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {spec ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          {spec.render(color)}
        </svg>
      ) : (
        <span style={{ color, fontWeight: 700, fontSize: Math.round(size * 0.38) }}>
          {(name.trim().charAt(0) || "?").toUpperCase()}
        </span>
      )}
    </span>
  );
}
