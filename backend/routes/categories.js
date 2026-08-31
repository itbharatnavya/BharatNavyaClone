/**
 * categories.js — nested taxonomy (single source of truth, DESIGN §3.3).
 *
 * Categories are stored FLAT (each doc carries parentId + path[]); the frontend
 * builds the tree. Seeded by scripts/seed-categories.js.
 *
 *   GET /api/categories        → flat array of every category doc
 *   GET /api/categories/:slug  → { category, children, ancestors, facets }
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");

/**
 * Live per-category listing counts. An ACTIVE listing counts toward a category when
 * its `categoryId` equals that category's id OR the category's `slug` appears in the
 * listing's `categoryPath` (so a parent aggregates all its descendants' listings).
 *
 * Single pass over listings; each listing is counted at most once per category (the id
 * and path-slug matches are unioned per listing so a leaf isn't double-tallied).
 * Returns a Map of category.id -> count.
 */
function computeListingCounts(categories, listings) {
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const counts = new Map();

  for (const l of listings) {
    if (!l || l.status !== "active") continue;

    // Distinct categories this one listing contributes to.
    const matched = new Set();
    if (l.categoryId) matched.add(l.categoryId);
    if (Array.isArray(l.categoryPath)) {
      for (const slug of l.categoryPath) {
        const c = catBySlug.get(slug);
        if (c) matched.add(c.id);
      }
    }

    for (const id of matched) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  return counts;
}

// Memoized on store.js's per-collection version counters (bumped on every
// write) — recomputes only when categories.json or listings.json actually
// changed since the last call, so a burst of concurrent requests (e.g.
// several page components fetching categories at once) shares one scan
// instead of redoing it per request.
let _countsCache = null; // { catVersion, listVersion, counts }
function getListingCounts(categories, listings) {
  const catVersion = store.getVersion("categories.json");
  const listVersion = store.getVersion("listings.json");
  if (
    _countsCache &&
    _countsCache.catVersion === catVersion &&
    _countsCache.listVersion === listVersion
  ) {
    return _countsCache.counts;
  }
  const counts = computeListingCounts(categories, listings);
  _countsCache = { catVersion, listVersion, counts };
  return counts;
}

// GET / — full taxonomy as a flat array (frontend nests via parentId).
router.get("/", async (req, res, next) => {
  try {
    const [categories, listings] = await Promise.all([
      store.all("categories.json"),
      store.all("listings.json"),
    ]);
    const counts = getListingCounts(categories, listings);
    const data = categories.map((c) => ({
      ...c,
      listingCount: counts.get(c.id) || 0,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /:slug — a node plus its immediate children, ancestor chain and facets.
router.get("/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;
    const [categories, listings] = await Promise.all([
      store.all("categories.json"),
      store.all("listings.json"),
    ]);
    const found = categories.find((c) => c.slug === slug) || null;
    if (!found) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    // Live counts stamped onto the returned node + its children.
    const counts = getListingCounts(categories, listings);
    const withCount = (c) => ({ ...c, listingCount: counts.get(c.id) || 0 });

    const category = withCount(found);
    const children = categories
      .filter((c) => c.parentId === found.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(withCount);

    // ancestors: path holds [...ancestorSlugs, ownSlug]; drop self, keep root→parent order.
    const bySlug = new Map(categories.map((c) => [c.slug, c]));
    const ancestors = (found.path || [])
      .slice(0, -1)
      .map((s) => bySlug.get(s))
      .filter(Boolean);

    return res.json({
      success: true,
      data: { category, children, ancestors, facets: found.facets || [] },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
