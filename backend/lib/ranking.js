/**
 * ranking.js — blend organic relevance with paid boost (DESIGN §Monetization / §3.6).
 *
 *   finalScore = wOrganic * organic + wPaid * paidBoost * eligibilityGate
 *
 * Honest monetization (DESIGN principle #6): paid placement is *labeled* and never
 * injects irrelevant results. The `eligibilityGate` is a hard relevance floor — a
 * listing only earns its paid boost if it already matches the active query/category;
 * otherwise the paid term is zeroed out.
 *
 * Components (each normalized to ~[0,1] so weights behave predictably):
 *   organic   = relevance + rating + recency + verified
 *               (relevance = normalized BM25 score from lib/search, present only when a
 *                query is active; rating/recency/verified per the spec)
 *   paidBoost = normalize(rankBoostScore) + tierBaseline(priorityTier) + featuredBonus
 *               featuredBonus applies only if isFeatured AND now ∈ [featuredStart,end]
 *
 * Weights come from DB/settings.json (defaults: wOrganic 0.7, wPaid 0.3,
 * maxSponsoredPerPage 3). Boosted results are flagged `isSponsored=true`, capped at
 * maxSponsoredPerPage.
 */

const { settingsRepo } = require("../modules/platform");
const identity = require("../modules/identity");

const DEFAULTS = { wOrganic: 0.7, wPaid: 0.3, maxSponsoredPerPage: 3 };

// Baseline lift by seller priority tier (DESIGN §3.1 priorityTier).
const TIER_BASELINE = { none: 0, premium: 0.3, star: 0.6, leader: 1.0 };

// Assumed sane cap for the raw rankBoostScore knob when normalizing to [0,1].
const RANK_BOOST_CAP = 100;
const FEATURED_BONUS = 1;

/* ------------------------------------------------------------- helpers ----- */

async function loadWeights() {
  const s = await settingsRepo.read({});
  const r = (s && s.ranking) || s || {};
  const num = (v, d) => (typeof v === "number" && !Number.isNaN(v) ? v : d);
  return {
    wOrganic: num(r.wOrganic, DEFAULTS.wOrganic),
    wPaid: num(r.wPaid, DEFAULTS.wPaid),
    maxSponsoredPerPage: num(r.maxSponsoredPerPage, DEFAULTS.maxSponsoredPerPage),
  };
}

function featuredActive(listing, now) {
  if (!listing.isFeatured) return false;
  const start = listing.featuredStartDate ? Date.parse(listing.featuredStartDate) : -Infinity;
  const end = listing.featuredEndDate ? Date.parse(listing.featuredEndDate) : Infinity;
  return now >= start && now <= end;
}

/** Relevance floor: is this listing eligible to receive paid boost for the current
 *  query/category context? Paid boost is only allowed on already-relevant results. */
function isEligible(listing, { query, categorySlug }) {
  // When browsing with no query and no category, there is no relevance constraint —
  // everything is "relevant", so paid placement is allowed generally.
  if (!query && !categorySlug) return true;

  if (query) {
    // A positive relevance score means the listing matched the text query in search.
    if (typeof listing._relevance === "number" && listing._relevance > 0) return true;
  }
  if (categorySlug) {
    const s = String(categorySlug).toLowerCase();
    const path = Array.isArray(listing.categoryPath)
      ? listing.categoryPath.map((x) => String(x).toLowerCase())
      : [];
    if (path.includes(s)) return true;
    if (listing.categoryId && String(listing.categoryId).toLowerCase() === s) return true;
    if (
      listing.legacyCategory &&
      String(listing.legacyCategory).toLowerCase().replace(/\s+/g, "-") === s
    ) {
      return true;
    }
  }
  return false;
}

/* --------------------------------------------------------- public API ------ */

/**
 * rankListings(listings, { query, categorySlug }) -> Promise<listings[]>
 *
 * Returns the listings sorted by blended finalScore (descending). Mutates each listing
 * with `isSponsored` (true for the top boosted results, capped) and attaches a
 * `_finalScore`. Input listings may carry `_relevance` (normalized BM25 from search).
 */
async function rankListings(listings, { query, categorySlug, tierBySeller } = {}) {
  const items = Array.isArray(listings) ? listings.slice() : [];
  if (items.length === 0) return items;

  const weights = await loadWeights();
  const now = Date.now();

  // Seller priorityTier lookup. The route passes a Map<sellerId, tier> built from
  // one indexed query (BACKEND-AUDIT.md Phase 5c); only fall back to a full user
  // load if a caller didn't supply it.
  const tierMap =
    tierBySeller ||
    (await identity.getSellerPriorityTiers(
      [...new Set(items.map((l) => l.sellerId).filter(Boolean))]
    ));

  // Normalization bases across the candidate set. reduce, not Math.min(...times)
  // — a large candidate set would blow the call-stack limit on the spread.
  const times = items.map((l) => Date.parse(l.createdAt) || 0);
  const minT = times.reduce((m, t) => (t < m ? t : m), 0);
  const maxT = times.reduce((m, t) => (t > m ? t : m), 1);
  const tSpan = maxT - minT || 1;

  const relScores = items.map((l) => (typeof l._relevance === "number" ? l._relevance : 0));
  const maxRel = relScores.reduce((m, r) => (r > m ? r : m), 0);
  const hasQuery = !!(query && String(query).trim());

  for (const l of items) {
    // ---- organic (relevance + rating + recency + verified) ----
    const relevance = hasQuery && maxRel > 0 ? (l._relevance || 0) / maxRel : 0;
    const rating = (typeof l.rating === "number" ? l.rating : 0) / 5;
    const recency = ((Date.parse(l.createdAt) || 0) - minT) / tSpan;
    const verified = l.isVerifiedSeller ? 1 : 0;
    // Average the active components so organic stays within ~[0,1].
    // With a text query, relevance carries 4 of 7 parts so a strong text match is not
    // outranked by rating/recency/paid placement.
    const organic = hasQuery
      ? (relevance * 4 + rating + recency + verified) / 7
      : (rating + recency + verified) / 3;

    // ---- paid boost ----
    const tier = tierMap.get(l.sellerId) || "none";
    const normBoost = Math.min(1, Math.max(0, (l.rankBoostScore || 0) / RANK_BOOST_CAP));
    const tierBaseline = TIER_BASELINE[tier] || 0;
    const featuredBonus = featuredActive(l, now) ? FEATURED_BONUS : 0;
    const paidBoost = Math.min(1, normBoost + tierBaseline + featuredBonus);

    // ---- relevance floor + blend ----
    const gate = isEligible(l, { query, categorySlug }) ? 1 : 0;
    const paidTerm = weights.wPaid * paidBoost * gate;
    l._paidTerm = paidTerm;
    l._finalScore = weights.wOrganic * organic + paidTerm;
    // Reset any stale flag; (re)assigned below within the sponsored cap.
    l.isSponsored = false;
  }

  // Stable sort by finalScore desc (ties keep incoming, i.e. BM25/recency, order).
  items.sort((a, b) => b._finalScore - a._finalScore);

  // Label the top results that actually received a paid contribution, capped.
  let sponsored = 0;
  for (const l of items) {
    if (sponsored >= weights.maxSponsoredPerPage) break;
    if (l._paidTerm > 0) {
      l.isSponsored = true;
      sponsored++;
    }
  }

  // Tidy internal scratch field (keep _finalScore for debugging/telemetry).
  for (const l of items) delete l._paidTerm;

  return items;
}

module.exports = { rankListings };
