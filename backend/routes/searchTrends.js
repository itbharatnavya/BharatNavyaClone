/**
 * routes/searchTrends.js — "Trending searches near you" + "Popular searches"
 * (Directory homepage sections).
 *
 * Real data comes from two writers into search-events.jsonl (lib/searchEvents.js):
 *   - POST /api/ai/search (routes/ai.js) — every call, any confidence, used
 *     by Consultations' AI concierge bar.
 *   - POST /log below — Directory's own DirectorySearchBar, fired ONLY when
 *     a suggestion (category or listing) is actually picked, never on a
 *     plain free-text submit.
 * aggregate() below only counts events with a resolved categorySlug — a
 * half-typed or unresolved free-text query (e.g. "clot") never has one, so
 * it's logged (for /ai/search's own analytics) but never surfaces here. This
 * is the single choke point for that rule; both /trending and /popular go
 * through it.
 *
 * Phase 7 sweep-3: event reads go through `directory.readSearchEvents()` and the
 * category lookups through `repoForCollection("categories.json")` — this route no
 * longer imports lib/store. The window / city / group-by passes below stay in JS.
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
const { repoForCollection } = require("../modules/_shared");
const directory = require("../modules/directory");
const { optionalAuth } = require("../middleware/authGuard");
const { logSearchEvent } = require("../lib/searchEvents");

const router = express.Router();
const categoriesRepo = repoForCollection("categories.json");

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

/**
 * Group events by categorySlug, count + most-recent. Only events with a
 * resolved categorySlug count — a raw/unresolved free-text query (no
 * confident match) is deliberately excluded so half-typed or junk searches
 * never surface as "popular" (see file header).
 */
function aggregate(events) {
  const groups = new Map(); // key -> { query, categorySlug, count, lastAt }
  for (const e of events) {
    const key = e.categorySlug;
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
  const categories = await categoriesRepo.findMany({});
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

    const events = await directory.readSearchEvents();
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
    const events = await directory.readSearchEvents();

    const real = aggregate(events).slice(0, limit);
    const padded = padWithFallback(real, limit);
    const data = await withCategoryNames(padded);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /api/search/log { query, categorySlug, city? } — Directory's own
// DirectorySearchBar calls this ONLY when a suggestion (category or listing)
// is actually picked, never on a plain free-text submit (see file header).
// categorySlug is required and validated against categories.json — an
// invalid/missing one just no-ops rather than erroring, same fire-and-forget
// spirit as the /ai/search logger this shares lib/searchEvents.js with.
router.post("/log", optionalAuth, async (req, res, next) => {
  try {
    const query = req.body && typeof req.body.query === "string" ? req.body.query : "";
    const categorySlug =
      req.body && typeof req.body.categorySlug === "string" ? req.body.categorySlug : "";
    const city = req.body && typeof req.body.city === "string" ? req.body.city : null;

    if (categorySlug) {
      const categories = await categoriesRepo.findMany({});
      const valid = categories.some((c) => c.slug === categorySlug);
      if (valid) {
        logSearchEvent({ query, categorySlug, city, userId: req.user && req.user.id }); // fire-and-forget
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
