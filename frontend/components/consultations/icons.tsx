"use client";

// Consultations — shared inline SVG line-glyphs + small presentational helpers.
// WHY colocated: the whole product is icon-driven (hard client rule: NO emojis,
// only viewBox 0 0 24 24 / stroke=currentColor line icons). Centralising them keeps
// every card, badge and form using the exact same glyph set and stroke weight, and
// gives one place for the mode-label/price formatting the UI repeats everywhere.

import React from "react";
import type { ConsultationMode } from "@/lib/types";

export interface IconProps {
  size?: number;
  className?: string;
}

// Common props so every glyph is a consistent 1.7-weight, rounded line icon.
function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function ShieldCheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function StarIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.8L12 17.9l-5.25 2.75 1-5.8L3.5 9.65l5.9-.85L12 3.5z" />
    </svg>
  );
}

export function MapPinIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function VideoIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="M15 10l6-3v10l-6-3" />
    </svg>
  );
}

export function PhoneIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2 2A16.5 16.5 0 014.5 5.5a2 2 0 012-2z" />
    </svg>
  );
}

export function UsersIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M16 20v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V20" />
      <circle cx="9" cy="7.5" r="3.2" />
      <path d="M22 20v-1.5a4 4 0 00-3-3.85" />
      <path d="M16.5 4.35a3.2 3.2 0 010 6.2" />
    </svg>
  );
}

export function ClockIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function BriefcaseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

export function GlobeIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.3 2.3 3.6 5.3 3.6 8.5S14.3 18.2 12 20.5c-2.3-2.3-3.6-5.3-3.6-8.5S9.7 5.8 12 3.5z" />
    </svg>
  );
}

export function CalendarIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function AwardIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.5 13.5L7 21l5-2.6L17 21l-1.5-7.5" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// ---- Consultation mode helpers ----------------------------------------------

// Human label for a delivery mode key (used by cards + the booking form <select>).
export function modeLabel(mode: ConsultationMode | string): string {
  switch (mode) {
    case "video":
      return "Video call";
    case "phone":
      return "Phone call";
    case "in-person":
      return "In-person";
    default:
      return String(mode);
  }
}

// Short label for the compact chip on a card ("Video" / "Phone" / "In-person").
export function modeShortLabel(mode: ConsultationMode | string): string {
  switch (mode) {
    case "video":
      return "Video";
    case "phone":
      return "Phone";
    case "in-person":
      return "In-person";
    default:
      return String(mode);
  }
}

export function ModeIcon({ mode, size = 15 }: { mode: ConsultationMode | string; size?: number }) {
  if (mode === "video") return <VideoIcon size={size} />;
  if (mode === "phone") return <PhoneIcon size={size} />;
  return <MapPinIcon size={size} />; // in-person
}

// Format a rupee amount the Indian way, with the ₹ prefix. null → "Custom quote".
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "Custom quote";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}
