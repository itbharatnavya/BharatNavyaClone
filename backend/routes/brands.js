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
const store = require("../lib/store");

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

/** Flat seller mini-object for cards (mirrors routes/listings.js). */
function sellerMini(user) {
  if (!user) return null;
  const sp = user.sellerProfile || {};
  return {
    id: user.id,
    name: user.name,
    companyName: sp.companyName || user.name || null,
    slug: sp.slug || null,
    city: (sp.location && sp.location.city) || null,
    state: (sp.location && sp.location.state) || null,
    logo: sp.logo || user.avatarUrl || null,
    isVerified: !!sp.isVerified,
    rating: sp.rating ?? 0,
    reviewCount: sp.reviewCount ?? 0,
    responseRate: sp.responseRate ?? 0,
  };
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

    const [listings, categories] = await Promise.all([
      store.all("listings.json"),
      store.all("categories.json"),
    ]);

    const data = getBrandsList(categorySlug, categories, listings);

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

function computeBrandDetail(wanted, listings, users) {
  const matches = listings.filter(
    (l) => l && l.status === "active" && brandOf(l) && slugify(brandOf(l)) === wanted
  );
  if (matches.length === 0) return null;

  // Canonical display name = the actual brand string on the listings.
  const name = brandOf(matches[0]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const enriched = matches
    .map((l) => ({ ...l, seller: sellerMini(userById.get(l.sellerId)) }))
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));

  return {
    brand: { name, slug: slugify(name), count: enriched.length },
    listings: enriched,
  };
}

function getBrandDetail(wanted, listings, users) {
  return computeBrandDetail(wanted, listings, users);
}

// GET /:slug — one brand (resolved by slugified name) plus its active listings.
router.get("/:slug", async (req, res, next) => {
  try {
    const wanted = String(req.params.slug);

    const [listings, users] = await Promise.all([
      store.all("listings.json"),
      store.all("users.json"),
    ]);

    const data = getBrandDetail(wanted, listings, users);
    if (!data) {
      return res.status(404).json({ success: false, error: "Brand not found" });
    }

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
