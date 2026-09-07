/**
 * routes/collections.js — admin-curated "Concepts" (merchandising COLLECTIONS).
 *
 * A collection is a themed group of listings the admin curates: hand-picked
 * listingIds and/or auto-filled by categorySlugs / brandSlugs. Buyers browse them
 * at /collections and open a landing at /collection/<slug>.
 *
 * This ONE router is mounted TWICE from index.js:
 *   • app.use("/api/admin/collections", …)  — BEFORE app.use("/api/admin"), so the
 *     admin.js blanket guard never shadows it (same trick entitlements.js uses).
 *   • app.use("/api/collections", …)         — among the public routes.
 *
 * PUBLIC
 *   GET /                → published collections (+ itemCount, up to 4 previewImages)
 *   GET /:slug           → one published collection + its fully resolved `listings`
 * ADMIN (authGuard + requireRole("admin") applied per-route inside this file)
 *   GET    /admin        → all collections incl. drafts (+ itemCount, previewImages)
 *   POST   /admin        → create (slugify title; 409 on slug clash)
 *   PUT    /admin/:id    → update
 *   DELETE /admin/:id    → delete
 *
 * RESOLVED items for a collection = de-duped union of:
 *   • hand-picked listingIds (active only), in the admin's order, then
 *   • active listings under any of categorySlugs (categoryPath captures descendants), then
 *   • active listings whose product.brand slug ∈ brandSlugs.
 * Every resolved listing carries the same flat seller mini the browse endpoint builds.
 *
 * Response envelope matches the rest of the API: { success, data }.
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../../_shared");
const identity = require("../../identity");
const directory = require("../index");
const { authGuard, requireRole } = require("../../../middleware/authGuard");
const { resolveUpload } = require("../../../lib/uploadStorage");

const collectionsRepo = repoForCollection("collections.json");

// coverImage may arrive as a "data:" URL — store it and swap in the /uploads/ path;
// a plain URL passes through. Bad inline upload → the matching 4xx JSON.
function uploadFail(res, err, next) {
  if (err && err.isUploadInputError) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }
  return next(err);
}

// Same slug rules as routes/adminCategories.js: lowercase, & → "and",
// any run of non-alphanumerics → single dash, trimmed.
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const adminGuard = [authGuard, requireRole("admin")];

/* ------------------------------------------------------------- helpers ----- */

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

/** Flat seller mini-object for cards (mirrors routes/listings.js browse). */
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
    trustSealVerified: !!sp.trustSealVerified,
    gstNumber: sp.gstNumber || null,
    yearEstablished: sp.yearEstablished || null,
    rating: sp.rating ?? 0,
    reviewCount: sp.reviewCount ?? 0,
    responseRate: sp.responseRate ?? 0,
  };
}

/** Load the shared lookups a resolve needs, once per request. `listings` are LEAN
 *  rows (id/status/categoryId/categoryPath/product.brand/media) — the only fields
 *  resolveItems() + toCard() read; the full docs for GET /:slug are hydrated by id
 *  from the bounded resolved set. */
async function buildContext() {
  const [listings, categories] = await Promise.all([
    directory.activeListingsForCollectionResolve(),
    repoForCollection("categories.json").findMany({}),
  ]);
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  return { listings, catBySlug };
}

/**
 * Resolve a collection to its de-duped union of ACTIVE listings.
 * Hand-picked (in order) first, then category matches, then brand matches.
 */
function resolveItems(collection, ctx) {
  const { listings, catBySlug } = ctx;

  const catSlugs = new Set(
    (Array.isArray(collection.categorySlugs) ? collection.categorySlugs : []).map((s) => slugify(s))
  );
  const brandSlugs = new Set(
    (Array.isArray(collection.brandSlugs) ? collection.brandSlugs : []).map((s) => slugify(s))
  );
  const pickedIds = Array.isArray(collection.listingIds) ? collection.listingIds : [];

  // Category ids whose slug is selected (so a listing.categoryId match also counts).
  const catIdSet = new Set();
  for (const s of catSlugs) {
    const c = catBySlug.get(s);
    if (c) catIdSet.add(c.id);
  }

  const byId = new Map(listings.map((l) => [l.id, l]));
  const seen = new Set();
  const out = [];
  const add = (l) => {
    if (l && l.status === "active" && !seen.has(l.id)) {
      seen.add(l.id);
      out.push(l);
    }
  };

  // 1) hand-picked, preserving the admin's order
  for (const id of pickedIds) add(byId.get(id));

  // 2) auto-include by category / brand (single pass)
  if (catSlugs.size || brandSlugs.size) {
    for (const l of listings) {
      if (!l || l.status !== "active" || seen.has(l.id)) continue;
      let match = false;
      if (catSlugs.size) {
        if (Array.isArray(l.categoryPath) && l.categoryPath.some((s) => catSlugs.has(s))) {
          match = true;
        } else if (l.categoryId && catIdSet.has(l.categoryId)) {
          match = true;
        }
      }
      if (!match && brandSlugs.size) {
        const b = brandOf(l);
        if (b && brandSlugs.has(slugify(b))) match = true;
      }
      if (match) add(l);
    }
  }

  return out;
}

/** A collection + itemCount + up to 4 previewImages (directory / admin list card). */
function toCard(collection, ctx) {
  const items = resolveItems(collection, ctx);
  const previewImages = [];
  for (const l of items) {
    const img = firstImage(l);
    if (img) previewImages.push(img);
    if (previewImages.length >= 4) break;
  }
  return { ...collection, itemCount: items.length, previewImages };
}

/** Normalize the writable fields of an incoming create/update body. */
function normalizeArrays(b) {
  return {
    listingIds: Array.isArray(b.listingIds) ? b.listingIds.filter((x) => typeof x === "string") : [],
    categorySlugs: Array.isArray(b.categorySlugs)
      ? b.categorySlugs.map((s) => slugify(s)).filter(Boolean)
      : [],
    brandSlugs: Array.isArray(b.brandSlugs) ? b.brandSlugs.map((s) => slugify(s)).filter(Boolean) : [],
  };
}

/* ---------------------------------------------------- ADMIN routes ---------- */
// Declared before the public GET /:slug so "/admin" never resolves as a slug.

// GET /admin — every collection (incl. drafts), newest-order first, with counts.
router.get("/admin", ...adminGuard, async (req, res, next) => {
  try {
    const [collections, ctx] = await Promise.all([collectionsRepo.findMany({}), buildContext()]);
    const data = collections
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.slug || "").localeCompare(b.slug || ""))
      .map((c) => toCard(c, ctx));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /admin — create a collection (slug from title; 409 on clash).
router.post("/admin", ...adminGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title || !String(b.title).trim()) {
      return res.status(400).json({ success: false, error: "title is required" });
    }
    const slug = slugify(b.slug || b.title);
    if (!slug) {
      return res.status(400).json({ success: false, error: "title must contain letters or numbers" });
    }
    const collections = await collectionsRepo.findMany({});
    if (collections.some((c) => c.slug === slug)) {
      return res.status(409).json({ success: false, error: "slug already exists" });
    }
    const arrays = normalizeArrays(b);
    const collection = {
      id: "col_" + slug,
      slug,
      title: String(b.title).trim(),
      subtitle: b.subtitle ? String(b.subtitle) : "",
      coverImage: (await resolveUpload(b.coverImage)) || null,
      listingIds: arrays.listingIds,
      categorySlugs: arrays.categorySlugs,
      brandSlugs: arrays.brandSlugs,
      order: typeof b.order === "number" ? b.order : collections.length,
      status: b.status === "published" ? "published" : "draft",
      createdAt: new Date().toISOString(),
    };
    const created = await collectionsRepo.insert(collection);
    return res.json({ success: true, data: created });
  } catch (err) {
    uploadFail(res, err, next);
  }
});

// PUT /admin/:id — merge-update writable fields (slug / id stay stable).
router.put("/admin/:id", ...adminGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    const patch = {};
    if ("title" in b) patch.title = String(b.title || "").trim();
    if ("subtitle" in b) patch.subtitle = b.subtitle == null ? "" : String(b.subtitle);
    if ("coverImage" in b) patch.coverImage = (await resolveUpload(b.coverImage)) || null;
    if ("listingIds" in b) patch.listingIds = normalizeArrays(b).listingIds;
    if ("categorySlugs" in b) patch.categorySlugs = normalizeArrays(b).categorySlugs;
    if ("brandSlugs" in b) patch.brandSlugs = normalizeArrays(b).brandSlugs;
    if ("order" in b && typeof b.order === "number") patch.order = b.order;
    if ("status" in b) patch.status = b.status === "published" ? "published" : "draft";

    const updated = await collectionsRepo.updateById(req.params.id, patch);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    uploadFail(res, err, next);
  }
});

// DELETE /admin/:id
router.delete("/admin/:id", ...adminGuard, async (req, res, next) => {
  try {
    const removed = await collectionsRepo.deleteById(req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------- PUBLIC routes ---------- */

// GET / — published collections for the /collections directory.
router.get("/", async (req, res, next) => {
  try {
    const [collections, ctx] = await Promise.all([collectionsRepo.findMany({}), buildContext()]);
    const data = collections
      .filter((c) => c.status === "published")
      .sort(
        (a, b) =>
          (a.order ?? 0) - (b.order ?? 0) ||
          (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
      )
      .map((c) => toCard(c, ctx));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /:slug — one published collection + its fully resolved listings.
router.get("/:slug", async (req, res, next) => {
  try {
    const found = (await collectionsRepo.findMany({})).find(
      (c) => c.slug === req.params.slug && c.status === "published"
    );
    if (!found) {
      return res.status(404).json({ success: false, error: "Collection not found" });
    }
    const ctx = await buildContext();
    const items = resolveItems(found, ctx); // lean rows, in resolved order

    // Hydrate the (bounded) resolved set: the full composite listing doc + seller mini.
    const fullDocs = (
      await Promise.all(items.map((it) => directory.listingsRepo.getById(it.id)))
    ).filter(Boolean);
    const sellerById = new Map(
      (await identity.hydrateUsersByIds(fullDocs.map((l) => l.sellerId))).map((u) => [u.id, u])
    );
    const listings = fullDocs.map((l) => ({ ...l, seller: sellerMini(sellerById.get(l.sellerId)) }));

    const previewImages = [];
    for (const l of items) {
      const img = firstImage(l);
      if (img) previewImages.push(img);
      if (previewImages.length >= 4) break;
    }
    return res.json({
      success: true,
      data: { ...found, itemCount: items.length, previewImages, listings },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
