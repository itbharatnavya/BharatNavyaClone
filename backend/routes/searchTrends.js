/**
 * routes/searchTrends.js — "Trending searches near you" + "Popular searches"
 * (Directory homepage sections).
 *
 * Real data: every call to POST /api/ai/search appends an event to
 * search-events.jsonl (see routes/ai.js's logSearchEvent). This router only
 * reads/aggregates that ledger — no writes here.
 *
 * NEVER-EMPTY guarantee (explicit product requirement): a brand-new install
 * has zero search events, so real aggregation alone would render an empty
 * section. DEMO_FALLBACK below is a small curated list (same spirit as
 * PromoBanner's static CARDS) that fills any remaining slots up to `limit`
 * — real events always rank first, so the fallback naturally recedes as real
 * usage accumulates. Recent Activity (routes/reviews.js) deliberately does
 * NOT get this treatment — only Trending/Popular are required to be
 * never-empty.
 */

const express = require("express");
const store = require("../lib/store");

const router = express.Router();

const TRENDING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// Curated fallback searches, each pointing at a REAL
// category slug (validated against categories.json at request time) so a
// click always lands somewhere real, never a dead end.
const DEMO_FALLBACK = [
  { query: "Steel suppliers", categorySlug: "metals-steel-alloys" },
  { query: "Textile manufacturers", categorySlug: "textiles-fabrics-yarn" },
  { query: "CA for GST filing", categorySlug: "accounting" },
  { query: "Packaging suppliers", categorySlug: "packaging-printing" },
  { query: "Electronics components", categorySlug: "electronics-electrical" },
  { query: "Logistics partners", categorySlug: "logistics-transport-warehousing" },
  { query: "Interior & furnishing", categorySlug: "home-furniture-furnishings" },
  { query: "Verified manufacturers", categorySlug: "industrial-machinery-equipment" },
];

function normalize(q) {
  return String(q || "").trim().toLowerCase();
}

/** Group events by categorySlug (preferred) or normalized query text, count + most-recent. */
function aggregate(events) {
  const groups = new Map(); // key -> { query, categorySlug, count, lastAt }
  for (const e of events) {
    const key = e.categorySlug || normalize(e.query);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (e.createdAt > existing.lastAt) existing.lastAt = e.createdAt;
    } else {
      groups.set(key, {
        query: e.query,
        categorySlug: e.categorySlug || null,
        count: 1,
        lastAt: e.createdAt,
      });
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (b.lastAt > a.lastAt ? 1 : -1));
}

async function withCategoryNames(rows) {
  const categories = await store.all("categories.json");
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  return rows.map((r) => {
    const cat = r.categorySlug ? bySlug.get(r.categorySlug) : null;
    return {
      query: cat ? cat.name : r.query,
      categorySlug: cat ? cat.slug : null,
      count: r.count || 0,
      isFallback: !!r.isFallback,
    };
  });
}

/** Pad real results with DEMO_FALLBACK (skipping categories already present) up to `limit`. */
function padWithFallback(real, limit) {
  const usedSlugs = new Set(real.map((r) => r.categorySlug).filter(Boolean));
  const usedQueries = new Set(real.map((r) => normalize(r.query)));
  const out = [...real];
  for (const fb of DEMO_FALLBACK) {
    if (out.length >= limit) break;
    if (fb.categorySlug && usedSlugs.has(fb.categorySlug)) continue;
    if (usedQueries.has(normalize(fb.query))) continue;
    out.push({ ...fb, count: 0, isFallback: true });
  }
  return out.slice(0, limit);
}

// GET /api/search/trending?city=&limit=8 — recent-window, city-aware.
router.get("/trending", async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 8));
    const city = req.query.city ? String(req.query.city).trim().toLowerCase() : null;

    const events = await store.readJsonl("search-events.jsonl");
    const cutoff = Date.now() - TRENDING_WINDOW_MS;
    const recent = events.filter((e) => {
      if (!e.createdAt || new Date(e.createdAt).getTime() < cutoff) return false;
      if (city && !(e.city && String(e.city).toLowerCase().includes(city))) return false;
      return true;
    });

    const real = aggregate(recent).slice(0, limit);
    const padded = padWithFallback(real, limit);
    const data = await withCategoryNames(padded);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/popular?limit=8 — all-time, no city filter.
router.get("/popular", async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 8));
    const events = await store.readJsonl("search-events.jsonl");

    const real = aggregate(events).slice(0, limit);
    const padded = padWithFallback(real, limit);
    const data = await withCategoryNames(padded);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
