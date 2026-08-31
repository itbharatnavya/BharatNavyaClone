// Icon glyphs for the suite homepage's featured modules. Inline SVG line-glyphs
// only (no emoji), matching the stroke style used across components/suite/products.tsx.

import React from "react";

interface IconProps {
  size?: number;
}

// Bharat Agent — a hub connected to three nodes: one assistant routing you to
// the right product, not a literal robot/sparkle.
export function AgentIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="19.5" cy="16.5" r="1.5" />
      <circle cx="4.5" cy="16.5" r="1.5" />
      <path d="M12 6.4v3.2" />
      <path d="M10.1 13.4l-4 2" />
      <path d="M13.9 13.4l4 2" />
    </svg>
  );
}

// Recruitment — a candidate silhouette being added to the team.
export function RecruitmentIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9.5" cy="8" r="3.3" />
      <path d="M3 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M18.5 7.5v5" />
      <path d="M16 10h5" />
    </svg>
  );
}
