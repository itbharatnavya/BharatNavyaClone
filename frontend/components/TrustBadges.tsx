"use client";

import React from "react";

export interface TrustBadgesProps {
  verified?: boolean; // Verified seller
  trustSeal?: boolean; // Trust seal verified
  gst?: boolean; // GST registered
  years?: number | null; // years in business
  responseRate?: number | null; // 0..100
  size?: "sm" | "md";
  className?: string;
  // Earned badges from the API (backend lib/badges.js): top_rated, fast_responder, trusted
  // ("verified" there duplicates `verified`, so it's ignored).
  badges?: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
}

// The trust tags used across the Directory (search rows, listing cards, company cards, company
// page). Tiers: a green rating pill, proofs (verified / trust seal / GST) and earned badges
// (top rated / fast reply / trusted) as a coloured icon disc + dark label, then facts (years,
// reply rate) as one quiet line. Data comes straight from the API. Styles: .tb-* in
// app/counter-soft-system.css.
const ICONS = {
  verified: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  seal: <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />,
  gst: <><path d="M7 3h7l4 4v14H7z" /><path d="M10 12h5M10 16h3" /></>,
  top_rated: <path d="M12 4l2.3 4.7 5.2.8-3.75 3.65.9 5.15L12 15.9l-4.65 2.4.9-5.15L4.5 9.5l5.2-.8z" />,
  fast_responder: <><circle cx="12" cy="13" r="7" /><path d="M12 9.5V13l2.2 1.6M9.5 3.5h5" /></>,
  trusted: <><path d="M7 11l3-3 3 2 4-4" /><path d="M3 12l4 4 3-1 4 4 3-3" /></>,
};
type IconKey = keyof typeof ICONS;
const EARNED: Record<string, { label: string; tone: string }> = {
  top_rated: { label: "Top rated", tone: "is-amber" },
  fast_responder: { label: "Fast reply", tone: "is-navy" },
  trusted: { label: "Trusted", tone: "is-navy" },
};

const STAR = "M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z";

// Green score pill plus the number of ratings, the convention Indian marketplace users know.
export function RatingPill({ value, count, size = "md" }: { value?: number | null; count?: number | null; size?: "sm" | "md" }) {
  if (!value || value <= 0) return null;
  return <span className={`tb-rating${size === "sm" ? " is-sm" : ""}`}>
    <b>{value.toFixed(1)}<svg aria-hidden viewBox="0 0 24 24"><path d={STAR} /></svg></b>
    {count ? <small>{count.toLocaleString("en-IN")} {count === 1 ? "rating" : "ratings"}</small> : null}
    <span className="sr-only">{value.toFixed(1)} out of 5</span>
  </span>;
}

// Inline "Verified" mark for tight spots (a seller name in a row or card).
export function VerifiedTag() {
  return <span className="tb-verified"><span className="tb-icon is-green" aria-hidden><svg viewBox="0 0 24 24">{ICONS.verified}</svg></span>Verified</span>;
}

// Sponsored / Featured label for a listing (null for a plain listing).
export function ListingFlag({ sponsored, featured }: { sponsored?: boolean; featured?: boolean }) {
  if (sponsored) return <span className="tb-flag is-sponsored">Sponsored</span>;
  if (featured) return <span className="tb-flag is-featured">Featured</span>;
  return null;
}

export default function TrustBadges({
  verified,
  trustSeal,
  gst,
  years,
  responseRate,
  size = "md",
  className = "",
  badges,
  rating,
  reviewCount,
}: TrustBadgesProps) {
  // "Verified" (admin-approved business) and "Trust seal" (admin-granted seal) are
  // different facts, so they stay as two separate badges.
  const isVerified = verified || badges?.includes("verified");
  const proofs = [
    isVerified ? { key: "verified", label: "Verified", tone: "is-green" } : null,
    trustSeal ? { key: "seal", label: "Trust seal", tone: "is-navy" } : null,
    gst ? { key: "gst", label: "GST registered", tone: "is-navy" } : null,
    ...(badges || []).filter((badge) => EARNED[badge]).map((badge) => ({ key: badge, ...EARNED[badge] })),
  ].filter(Boolean) as { key: IconKey; label: string; tone: string }[];
  const facts = [
    typeof years === "number" && years > 0 ? `${years} ${years === 1 ? "yr" : "yrs"} in business` : null,
    typeof responseRate === "number" && responseRate > 0 ? `${Math.round(responseRate)}% reply rate` : null,
  ].filter(Boolean) as string[];
  const hasRating = typeof rating === "number" && rating > 0;

  if (!proofs.length && !facts.length && !hasRating) return null;

  return (
    <div className={`tb${size === "sm" ? " is-sm" : ""} ${className}`.trim()}>
      {(proofs.length > 0 || hasRating) && <ul className="tb-proofs" role="list">
        {hasRating && <li className="tb-rating-item"><RatingPill value={rating} count={reviewCount} size={size} /></li>}
        {proofs.map((item) => <li key={item.key}>
          <span className={`tb-icon ${item.tone}`} aria-hidden><svg viewBox="0 0 24 24">{ICONS[item.key]}</svg></span>
          {item.label}
        </li>)}
      </ul>}
      {facts.length > 0 && <p className="tb-facts">{facts.join(" · ")}</p>}
    </div>
  );
}
