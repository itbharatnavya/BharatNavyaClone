/**
 * trustScore.js — computed 0–100 seller trust score (TRUST & MODERATION).
 *
 * Pure function, no I/O. Derived on read from existing sellerProfile fields so it
 * always reflects current verification / rating / experience (like badges.js).
 *
 * Every factor below is backed by real, live data — no decorative/seeded inputs.
 * A `responseRate` factor used to sit here, but nothing in the codebase ever
 * measures a seller's actual reply speed (no chat/quote-latency tracking exists),
 * so it was always a fabricated seed number. Removed rather than faked; its
 * weight was redistributed to the factors that ARE real.
 *
 * Weighting (max points):
 *   verified          +30   isVerified               (admin verification workflow)
 *   trustSeal         +10   trustSealVerified         (admin verification workflow)
 *   rating            +30   rating / 5 * 30           (from approved reviews)
 *   reviews           +20   min(reviewCount, 50) / 50 * 20
 *   yearsEstablished  +10   min(yearsInBusiness, 10)  (1 pt / year, capped at 10 —
 *                           seller-entered `yearEstablished`, editable in the
 *                           dashboard profile tab)
 *                     ----
 *                      100
 *
 * trustScore(sellerProfile) -> { score:int(0-100), band, factors[] }
 *   band: "Excellent" (>=75) | "Good" (>=50) | "Fair" (<50)
 */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function trustScore(sellerProfile) {
  const sp = sellerProfile || {};

  const rating = Number(sp.rating) || 0;
  const reviewCount = Number(sp.reviewCount) || 0;

  const nowYear = new Date().getFullYear();
  const yearEstablished = Number(sp.yearEstablished) || 0;
  const yearsInBusiness =
    yearEstablished > 1900 && yearEstablished <= nowYear
      ? nowYear - yearEstablished
      : 0;

  const verifiedPts = sp.isVerified ? 30 : 0;
  const sealPts = sp.trustSealVerified ? 10 : 0;
  const ratingPts = (clamp(rating, 0, 5) / 5) * 30;
  const reviewPts = (Math.min(reviewCount, 50) / 50) * 20;
  const yearsPts = Math.min(Math.max(yearsInBusiness, 0), 10);

  const raw = verifiedPts + sealPts + ratingPts + reviewPts + yearsPts;
  const score = clamp(Math.round(raw), 0, 100);

  const band = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Fair";

  // Rounded, UI-friendly factor breakdown (each: earned vs max).
  const factors = [
    { key: "verified", label: "Verified business", points: verifiedPts, max: 30 },
    { key: "trustSeal", label: "Trust seal", points: sealPts, max: 10 },
    { key: "rating", label: "Customer rating", points: Math.round(ratingPts), max: 30 },
    { key: "reviews", label: "Review volume", points: Math.round(reviewPts), max: 20 },
    { key: "experience", label: "Years established", points: Math.round(yearsPts), max: 10 },
  ];

  return { score, band, factors };
}

module.exports = { trustScore };
