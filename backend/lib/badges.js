/**
 * badges.js — derive gamified trust badges from a seller profile (Gamified Badges).
 *
 * Badges are computed on read from existing sellerProfile fields (never stored), so
 * they always reflect current rating / verification / responsiveness. Pure function —
 * no I/O.
 *
 * deriveBadges(sellerProfile) -> string[]  (any of: top_rated, fast_responder,
 *                                           verified, trusted)
 */

/**
 * Derive the set of earned badge keys for a seller profile.
 *   top_rated       rating >= 4.5
 *   fast_responder  performance.avgResponseTimeHours <= 2
 *   verified        isVerified
 *   trusted         reviewCount >= 25
 */
function deriveBadges(sellerProfile) {
  const sp = sellerProfile || {};
  const badges = [];

  if (typeof sp.rating === "number" && sp.rating >= 4.5) {
    badges.push("top_rated");
  }
  if (
    sp.performance &&
    typeof sp.performance.avgResponseTimeHours === "number" &&
    sp.performance.avgResponseTimeHours <= 2
  ) {
    badges.push("fast_responder");
  }
  if (sp.isVerified) {
    badges.push("verified");
  }
  if (typeof sp.reviewCount === "number" && sp.reviewCount >= 25) {
    badges.push("trusted");
  }

  return badges;
}

module.exports = { deriveBadges };
