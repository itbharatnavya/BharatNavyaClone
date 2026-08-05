/**
 * trustScore.js — computed 0–100 seller trust score (TRUST & MODERATION).
 *
 * Pure function, no I/O. Derived on read from existing sellerProfile fields so it
 * always reflects current verification / rating / responsiveness (like badges.js).
 *
 * Weighting (max points):
 *   verified          +30   isVerified
 *   trustSeal         +10   trustSealVerified
 *   rating            +25   rating / 5 * 25
 *   reviews           +15   min(reviewCount, 50) / 50 * 15
 *   responseRate      +15   clamp(responseRate, 0, 100) * 0.15
 *   yearsEstablished   +5   min(yearsInBusiness, 5)     (1 pt / year, capped)
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
  const responseRate = clamp(Number(sp.responseRate) || 0, 0, 100);

  const nowYear = new Date().getFullYear();
  const yearEstablished = Number(sp.yearEstablished) || 0;
  const yearsInBusiness =
    yearEstablished > 1900 && yearEstablished <= nowYear
      ? nowYear - yearEstablished
      : 0;

  const verifiedPts = sp.isVerified ? 30 : 0;
  const sealPts = sp.trustSealVerified ? 10 : 0;
  const ratingPts = (clamp(rating, 0, 5) / 5) * 25;
  const reviewPts = (Math.min(reviewCount, 50) / 50) * 15;
  const responsePts = responseRate * 0.15;
  const yearsPts = Math.min(Math.max(yearsInBusiness, 0), 5);

  const raw =
    verifiedPts + sealPts + ratingPts + reviewPts + responsePts + yearsPts;
  const score = clamp(Math.round(raw), 0, 100);

  const band = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Fair";

  // Rounded, UI-friendly factor breakdown (each: earned vs max).
  const factors = [
    { key: "verified", label: "Verified business", points: verifiedPts, max: 30 },
    { key: "trustSeal", label: "Trust seal", points: sealPts, max: 10 },
    { key: "rating", label: "Customer rating", points: Math.round(ratingPts), max: 25 },
    { key: "reviews", label: "Review volume", points: Math.round(reviewPts), max: 15 },
    { key: "responseRate", label: "Response rate", points: Math.round(responsePts), max: 15 },
    { key: "experience", label: "Years established", points: Math.round(yearsPts), max: 5 },
  ];

  return { score, band, factors };
}

module.exports = { trustScore };
