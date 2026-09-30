/**
 * search.js — in-memory BM25(F) retrieval over listings (DESIGN §5 "Retrieval").
 *
 * Strategy (matches DESIGN.md §5 "hard structured filters first, then rank the
 * survivors"):
 *   1. Apply HARD structured filters to the full listing set → survivors.
 *   2. If a text query is present, rank survivors by BM25 using a MiniSearch index
 *      built over the whole corpus (so IDF is computed against the real corpus) with
 *      field boosts (title^3, keywords^2). A result-level `filter` restricts scoring
 *      output to survivors only.
 *   3. If no query, order survivors by recency (newest first).
 *
 * The MiniSearch index is cached and lazily rebuilt: reused while the listing count is
 * unchanged and within a short TTL, otherwise rebuilt. For this dataset a rebuild is
 * cheap, so the cache is purely an optimization (rebuilding on each call would also be
 * correct, per the spec).
 */

const MiniSearch = require("minisearch");
const directory = require("../modules/directory");

const INDEX_FIELDS = ["title", "description", "keywords", "legacyCategory"];
const FIELD_BOOST = { title: 3, keywords: 2 };
const CACHE_TTL_MS = 3000;

/* ------------------------------------------------------------- helpers ----- */

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function ci(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

/** Does a listing sit under a given category *slug*? Checks the denormalized
 *  categoryPath, the raw categoryId, and a slugified legacyCategory (seed data
 *  currently only carries legacyCategory). */
function matchesCategorySlug(listing, slug) {
  if (!slug) return true;
  const s = slugify(slug);
  if (Array.isArray(listing.categoryPath) && listing.categoryPath.map(slugify).includes(s)) {
    return true;
  }
  if (listing.categoryId && slugify(listing.categoryId) === s) return true;
  if (listing.legacyCategory && slugify(listing.legacyCategory) === s) return true;
  return false;
}

function priceOf(listing) {
  return listing.product && typeof listing.product.price === "number"
    ? listing.product.price
    : null;
}

/**
 * Apply the hard structured filters. Everything here is a strict pre-filter applied
 * BEFORE any relevance scoring.
 *
 * Supported filter keys: type, categoryId, category(slug), city, state, verified,
 * featured (admin-approved boost, listing.isFeatured), minPrice, maxPrice, status
 * (exact listing status, e.g. public browse passes "active"), condition
 * (product.condition), and sellerIds (allow-list of seller ids — used by the
 * public browse route to restrict to approved sellers).
 */
function applyFilters(listings, filters = {}) {
  const f = filters || {};
  const hasPriceFloor = f.minPrice !== undefined && f.minPrice !== null && f.minPrice !== "";
  const hasPriceCeil = f.maxPrice !== undefined && f.maxPrice !== null && f.maxPrice !== "";
  const min = hasPriceFloor ? Number(f.minPrice) : null;
  const max = hasPriceCeil ? Number(f.maxPrice) : null;
  const allowSellers =
    Array.isArray(f.sellerIds) ? new Set(f.sellerIds) : null;

  return listings.filter((l) => {
    if (f.type && l.type !== f.type) return false;
    if (f.status && l.status !== f.status) return false;
    if (f.categoryId && l.categoryId !== f.categoryId) return false;
    if (f.category && !matchesCategorySlug(l, f.category)) return false;
    // PAN-India listings serve the entire country, so a city/state filter must never
    // exclude them — they pass BOTH geo filters unconditionally. Everything else is
    // filtered normally by an exact (case-insensitive) city/state match.
    const isPanIndia = l.panIndia === true || (l.location && l.location.panIndia === true);
    if (!isPanIndia) {
      if (f.city && !ci(l.location && l.location.city, f.city)) return false;
      if (f.state && !ci(l.location && l.location.state, f.state)) return false;
    }
    if (f.verified === true && !l.isVerifiedSeller) return false;
    if (f.featured === true && !l.isFeatured) return false;
    if (f.condition && !(l.product && l.product.condition === f.condition)) return false;
    if (allowSellers && !allowSellers.has(l.sellerId)) return false;

    // Price filter constrains PRODUCTS only. Services use rate-cards / "quote",
    // so a budget must never exclude them (that was the "0 results" bug).
    if ((min !== null || max !== null) && (l.type === "product" || l.product)) {
      const p = priceOf(l);
      if (p !== null) {
        if (min !== null && p < min) return false;
        if (max !== null && p > max) return false;
      }
    }
    return true;
  });
}

/* ----------------------------------------------------- MiniSearch cache ---- */

let _cache = null; // { ms, byId, count, builtAt }

function buildIndex(listings) {
  const byId = new Map();
  const docs = listings.map((l) => {
    byId.set(l.id, l);
    return {
      id: l.id,
      title: l.title || "",
      description: l.description || "",
      keywords: Array.isArray(l.keywords) ? l.keywords.join(" ") : l.keywords || "",
      legacyCategory: l.legacyCategory || "",
    };
  });
  const ms = new MiniSearch({ fields: INDEX_FIELDS, storeFields: ["id"] });
  ms.addAll(docs);
  return { ms, byId, count: listings.length, builtAt: Date.now() };
}

function getIndex(listings) {
  const now = Date.now();
  if (_cache && _cache.count === listings.length && now - _cache.builtAt < CACHE_TTL_MS) {
    return _cache;
  }
  _cache = buildIndex(listings);
  return _cache;
}

/* --------------------------------------------------------- public API ------ */

/**
 * searchListings({ q, filters, limit }) -> Promise<[{ listing, score }]>
 *
 * Hard filters are applied first; survivors are ranked by BM25 when `q` is present,
 * otherwise by recency (newest first). `limit` (optional) caps the number returned.
 */
async function searchListings({ q, filters = {}, limit } = {}) {
  const listings = await directory.listingsRepo.all();
  const survivors = applyFilters(listings, filters);

  const query = (q || "").trim();
  let results;

  if (query) {
    const { ms, byId } = getIndex(listings);
    const survivorIds = new Set(survivors.map((l) => l.id));
    // Every query word must match (AND); only if that finds nothing do we widen to OR.
    // Prefix expansion applies to the last word only (search-as-you-type) and fuzzy
    // matching only to longer words, so "pin" cannot drift onto unrelated titles.
    const base = {
      boost: FIELD_BOOST,
      prefix: (_t, i, terms) => i === terms.length - 1,
      fuzzy: (t) => (t.length > 4 ? 0.2 : false),
      filter: (r) => survivorIds.has(r.id),
    };
    let hits = ms.search(query, { ...base, combineWith: "AND" });
    if (hits.length === 0) hits = ms.search(query, { ...base, combineWith: "OR" });
    // Exact phrase in the title outranks scattered word matches.
    const phrase = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (phrase.includes(" ")) {
      hits = hits
        .map((h) => {
          const t = String((byId.get(h.id) || {}).title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
          return t.includes(phrase) ? { ...h, score: h.score * 3 } : h;
        })
        .sort((a, b) => b.score - a.score);
    }
    // MiniSearch returns hits already sorted by descending score.
    results = hits
      .map((h) => ({ listing: byId.get(h.id), score: h.score }))
      .filter((r) => r.listing);
  } else {
    // No query → rank survivors by recency, newest first. Score is a normalized
    // recency value in [0,1] so callers have a usable relevance signal.
    const times = survivors.map((l) => Date.parse(l.createdAt) || 0);
    // reduce, not Math.min(...times) — a few thousand survivors would blow the
    // call-stack limit on the spread.
    const minT = times.reduce((m, t) => (t < m ? t : m), 0);
    const maxT = times.reduce((m, t) => (t > m ? t : m), 1);
    const span = maxT - minT || 1;
    results = survivors
      .map((l) => ({ listing: l, ts: Date.parse(l.createdAt) || 0 }))
      .sort((a, b) => b.ts - a.ts)
      .map((r) => ({ listing: r.listing, score: (r.ts - minT) / span }));
  }

  if (typeof limit === "number" && limit >= 0) {
    results = results.slice(0, limit);
  }
  return results;
}

/**
 * computeFacets(listings) -> Promise<facets>
 *
 * Available filter facet values + counts for the given (already-filtered) result set:
 * categories present, cities, states, types, price buckets (Under ₹500/₹1k/₹2k/₹5k),
 * and the verified count. Drives the left-rail faceted filters (DESIGN §7).
 */
async function computeFacets(listings = []) {
  const countBy = (keyFn) => {
    const m = new Map();
    for (const l of listings) {
      const k = keyFn(l);
      if (k === undefined || k === null || k === "") continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
  };

  const categories = countBy((l) =>
    l.legacyCategory || (Array.isArray(l.categoryPath) && l.categoryPath[l.categoryPath.length - 1]) || null
  );
  const cities = countBy((l) => l.location && l.location.city);
  const states = countBy((l) => l.location && l.location.state);
  const types = countBy((l) => l.type);

  const buckets = [
    { label: "Under ₹500", max: 500 },
    { label: "Under ₹1k", max: 1000 },
    { label: "Under ₹2k", max: 2000 },
    { label: "Under ₹5k", max: 5000 },
  ];
  const priceBuckets = buckets.map((b) => ({
    label: b.label,
    max: b.max,
    count: listings.filter((l) => {
      const p = priceOf(l);
      return p !== null && p < b.max;
    }).length,
  }));

  const verified = listings.filter((l) => l.isVerifiedSeller).length;
  const featured = listings.filter((l) => l.isFeatured).length;

  return { categories, cities, states, types, priceBuckets, verified, featured, total: listings.length };
}

module.exports = { searchListings, computeFacets, applyFilters, slugify };
