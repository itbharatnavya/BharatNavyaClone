/**
 * categories.js — nested taxonomy (single source of truth, DESIGN §3.3).
 *
 * Categories are stored FLAT (each doc carries parentId + path[]); the frontend
 * builds the tree. Seeded by scripts/seed-categories.js.
 *
 *   GET /api/categories        → flat array of every category doc
 *   GET /api/categories/:slug  → { category, children, ancestors, facets }
 *
 * Phase 5a: per-category live listing counts come from
 * modules/directory `listingCountsByCategory()` — one GROUP BY over the `listings`
 * table — instead of `store.all("listings.json")` + a JS pass on every request.
 * `categories.json` itself still reads through `store` (not graduated — many routes
 * still touch it; reads may straddle).
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const directory = require("../modules/directory");

// GET / — full taxonomy as a flat array (frontend nests via parentId).
router.get("/", async (req, res, next) => {
  try {
    const [categories, counts] = await Promise.all([
      store.all("categories.json"),
      directory.listingCountsByCategory(),
    ]);
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
    const [categories, counts] = await Promise.all([
      store.all("categories.json"),
      directory.listingCountsByCategory(),
    ]);
    const found = categories.find((c) => c.slug === slug) || null;
    if (!found) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    // Live counts stamped onto the returned node + its children.
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
