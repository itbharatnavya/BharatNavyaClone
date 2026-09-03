/**
 * routes/brands.js — brand discovery derived from product listings.
 *
 * Brands aren't a stored collection: each product listing carries a free-text
 * `product.brand`. These endpoints aggregate distinct brands from ACTIVE
 * listings so the frontend can present a "Brands" directory and per-brand
 * landing pages (the Store → Brands experience).
 *
 *   GET /api/brands?category=<slug>  → [{ name, slug, count, categorySlugs, sampleImage }]
 *   GET /api/brands/:slug            → { brand: { name, slug, count }, listings }
 *
 * Response envelope matches the rest of the API: { success, data }.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store"); // composite listings.json document read (GET /:slug hydrate) — moves to a directory port in Phase 8.5
const identity = require("../modules/identity");
const directory = require("../modules/directory");

// Same slug rules as the taxonomy (see routes/adminCategories.js): lowercase,
// & → "and", any run of non-alphanumerics → single dash, trimmed.
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The free-text brand on a product listing, trimmed, or null. */
function brandOf(listing) {
  const b = listing && listing.product && listing.product.brand;
  return typeof b === "string" && b.trim() ? b.trim() : null;
}

/** First image URL among a listing's media, else null. */
function firstImage(listing) {
  const media = Array.isArray(listing.media) ? listing.media : [];
  const img = media.find((m) => m && m.url && m.type !== "video") || media[0];
  return img && img.url ? img.url : null;
}

/**
 * Resolve a listing to the slug of its TOP-LEVEL (root) category. Categories are
 * stored flat with a `path` = [...ancestorSlugs, ownSlug]; the root is path[0].
 * We locate the listing's category by id, else by the last slug in its
 * categoryPath, then read its root; falling back to categoryPath[0].
 */
function topSlugOf(listing, catById, catBySlug) {
  let cat = null;
  if (listing.categoryId) cat = catById.get(listing.categoryId) || null;
  if (!cat && Array.isArray(listing.categoryPath) && listing.categoryPath.length) {
    cat = catBySlug.get(listing.categoryPath[listing.categoryPath.length - 1]) || null;
  }
  if (cat && Array.isArray(cat.path) && cat.path.length) return cat.path[0];
  if (Array.isArray(listing.categoryPath) && listing.categoryPath.length) {
    return listing.categoryPath[0];
  }
  return null;
}

/**
 * Whether an ACTIVE branded listing sits under a category slug: its categoryPath
 * includes the slug (which captures descendants, since path holds every ancestor
 * slug) OR its categoryId matches that category.
 */
function isUnder(listing, slug, targetCat) {
  if (Array.isArray(listing.categoryPath) && listing.categoryPath.includes(slug)) {
    return true;
  }
  if (targetCat && listing.categoryId === targetCat.id) return true;
  if (listing.categoryId === "cat_" + slug) return true;
  return false;
}

function computeBrandsList(categorySlug, categories, listings) {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const targetCat = categorySlug ? catBySlug.get(categorySlug) || null : null;

  // name -> { name, count, categorySlugs:Set, sampleImage }
  const acc = new Map();

  for (const l of listings) {
    if (!l || l.status !== "active") continue;
    const name = brandOf(l);
    if (!name) continue;
    if (categorySlug && !isUnder(l, categorySlug, targetCat)) continue;

    let entry = acc.get(name);
    if (!entry) {
      entry = { name, count: 0, categorySlugs: new Set(), sampleImage: null };
      acc.set(name, entry);
    }
    entry.count += 1;
    const top = topSlugOf(l, catById, catBySlug);
    if (top) entry.categorySlugs.add(top);
    if (!entry.sampleImage) {
      const img = firstImage(l);
      if (img) entry.sampleImage = img;
    }
  }

  return [...acc.values()]
    .map((e) => ({
      name: e.name,
      slug: slugify(e.name),
      count: e.count,
      categorySlugs: [...e.categorySlugs],
      sampleImage: e.sampleImage,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function getBrandsList(categorySlug, categories, listings) {
  return computeBrandsList(categorySlug, categories, listings);
}

// GET / — distinct brands aggregated from active branded listings.
router.get("/", async (req, res, next) => {
  try {
    const categorySlug = req.query.category ? String(req.query.category) : "";

    // Phase 5f: LEAN active-branded-listing rows (one indexed JOIN) instead of
    // store.all("listings.json") (the full composite hydrate of every listing).
    const [listings, categories] = await Promise.all([
      directory.activeBrandedListingsLean(),
      directory.categoriesRepo.findMany({}),
    ]);

    const data = getBrandsList(categorySlug, categories, listings);

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /:slug — one brand (resolved by slugified name) plus its active listings.
router.get("/:slug", async (req, res, next) => {
  try {
    const wanted = String(req.params.slug);

    // Phase 5f: lean-scan active branded listings to find this brand's ids (slugify
    // is JS, not SQL-expressible), then hydrate only the matches. sellerMini is
    // identity.getSellerBrowseCards — the same 11-key shape (proven in 5c-1).
    const leanRows = await directory.activeBrandedListingsLean();
    const matchedLean = leanRows.filter((l) => brandOf(l) && slugify(brandOf(l)) === wanted);
    if (matchedLean.length === 0) {
      return res.status(404).json({ success: false, error: "Brand not found" });
    }

    const full = [];
    for (const lr of matchedLean) {
      const doc = await store.getById("listings.json", lr.id); // id-ASC order preserved
      if (doc) full.push(doc);
    }
    if (full.length === 0) {
      return res.status(404).json({ success: false, error: "Brand not found" });
    }

    const name = brandOf(full[0]);
    const sellerById = await identity.getSellerBrowseCards(full.map((l) => l.sellerId));
    const enriched = full
      .map((l) => ({ ...l, seller: sellerById.get(l.sellerId) || null }))
      .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));

    return res.json({
      success: true,
      data: {
        brand: { name, slug: slugify(name), count: enriched.length },
        listings: enriched,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
