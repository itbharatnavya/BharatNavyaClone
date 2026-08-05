/**
 * categorySuggestions.js — seller-submitted "Other / not listed" category ideas.
 *
 * Sellers who can't find their category on /sell (or during registration) can pick
 * "Other" and type a name. That name lands here as a lightweight suggestion doc that
 * admins triage: APPROVE (mint a real category), MERGE (map onto an existing one),
 * or REJECT. Suggestions are NOT attached to listings yet, so merge/reject just
 * record the decision — there is no data migration to perform.
 *
 * Mounted at /api/category-suggestions (see index.js, before the /api catch-all).
 *
 * Collection: DB/category-suggestions.json
 *   { id, name, note, context, suggestedBy, status, count, createdAt, updatedAt,
 *     categoryId?, mergedInto?, decidedBy?, decidedAt? }
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { authGuard, requireRole } = require("../middleware/authGuard");

const COLL = "category-suggestions.json";

// Same slugify as routes/adminCategories.js — kept in sync so approved suggestions
// mint categories with identical id/slug rules.
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes

// Case-insensitive normalization key for de-duping pending suggestions.
const normalize = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/* --------------------------------------------------------------- create ---- */
// POST / — any authenticated user proposes a category name.
router.post("/", authGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, error: "name is required" });
    }

    // De-dupe: if a PENDING suggestion with the same normalized name exists, just
    // bump its count instead of creating a near-identical row.
    const key = normalize(name);
    const rows = await store.all(COLL);
    const existing = rows.find(
      (r) => r.status === "pending" && normalize(r.name) === key
    );
    if (existing) {
      const updated = await store.update(COLL, existing.id, {
        count: (existing.count || 1) + 1,
        updatedAt: new Date().toISOString(),
      });
      return res.json({ success: true, data: updated });
    }

    const now = new Date().toISOString();
    const suggestion = {
      id: await store.nextId("sug"),
      name,
      note: b.note ? String(b.note).trim() : "",
      context: b.context ? String(b.context).trim() : "",
      suggestedBy: req.user.id,
      status: "pending",
      count: 1,
      createdAt: now,
      updatedAt: now,
    };
    const created = await store.insert(COLL, suggestion);
    return res.json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------------------------- list ---- */
// GET / — admin triage queue. Optional ?status filter, newest first.
router.get("/", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.query;
    let rows = await store.all(COLL);
    if (status) rows = rows.filter((r) => r.status === status);
    rows = rows
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------- approve ---- */
// POST /:id/approve — mint a real category from the suggestion (body: { parentId? }).
router.post("/:id/approve", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const suggestion = await store.getById(COLL, req.params.id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: "Suggestion not found" });
    }

    const b = req.body || {};
    const cats = await store.all("categories.json");
    const slug = slugify(suggestion.name);
    if (!slug) {
      return res.status(400).json({ success: false, error: "name produces an empty slug" });
    }
    if (cats.some((c) => c.slug === slug)) {
      return res.status(409).json({ success: false, error: "slug already exists" });
    }

    let parent = null;
    if (b.parentId) {
      parent = cats.find((c) => c.id === b.parentId || c.slug === b.parentId);
      if (!parent) return res.status(404).json({ success: false, error: "parent not found" });
    }

    const category = {
      id: "cat_" + slug,
      name: suggestion.name,
      slug,
      parentId: parent ? parent.id : null,
      path: parent ? [...parent.path, slug] : [slug],
      type: parent ? parent.type : "both",
      icon: null,
      description: "",
      facets: parent ? parent.facets : [],
      listingCount: 0,
      order: cats.length,
    };
    const createdCategory = await store.insert("categories.json", category);

    const updatedSuggestion = await store.update(COLL, suggestion.id, {
      status: "approved",
      categoryId: createdCategory.id,
      decidedBy: req.user.id,
      decidedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      data: { category: createdCategory, suggestion: updatedSuggestion },
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------- merge ---- */
// POST /:id/merge — map the suggestion onto an existing category (body: { categoryId }).
router.post("/:id/merge", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const suggestion = await store.getById(COLL, req.params.id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: "Suggestion not found" });
    }
    const b = req.body || {};
    if (!b.categoryId) {
      return res.status(400).json({ success: false, error: "categoryId is required" });
    }
    const target = await store.getById("categories.json", b.categoryId);
    if (!target) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    const updated = await store.update(COLL, suggestion.id, {
      status: "merged",
      mergedInto: target.id,
      decidedBy: req.user.id,
      decidedAt: new Date().toISOString(),
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------------------- reject ---- */
// POST /:id/reject — dismiss the suggestion.
router.post("/:id/reject", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const suggestion = await store.getById(COLL, req.params.id);
    if (!suggestion) {
      return res.status(404).json({ success: false, error: "Suggestion not found" });
    }
    const updated = await store.update(COLL, suggestion.id, {
      status: "rejected",
      decidedBy: req.user.id,
      decidedAt: new Date().toISOString(),
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
