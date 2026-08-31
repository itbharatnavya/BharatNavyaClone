/**
 * adminJobFunctions.js — admin CRUD for the flat, admin-editable job-function
 * taxonomy (RECRUITMENT.md §2: "New, small, admin-editable flat list"). Mounted at
 * /api/admin/job-functions, before the blanket /api/admin guard. Mirrors
 * adminCategories.js's CRUD pattern, simplified — flat list, no parentId/path tree.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { authGuard, requireRole } = require("../middleware/authGuard");

router.use(authGuard, requireRole("admin"));

const COLLECTION = "job-functions.json";

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// GET / — all rows, including inactive ones (the public read filters those out, so
// this is the only way the admin UI can see/reactivate a soft-deleted row).
router.get("/", async (req, res, next) => {
  try {
    const all = await store.all(COLLECTION);
    all.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ success: true, data: all });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, error: "name is required" });
    const all = await store.all(COLLECTION);
    const slug = b.slug ? slugify(b.slug) : slugify(b.name);
    if (all.some((r) => r.slug === slug)) {
      return res.status(409).json({ success: false, error: "slug already exists" });
    }
    const created = await store.insert(COLLECTION, {
      id: "jf_" + slug,
      name: b.name,
      slug,
      order: typeof b.order === "number" ? b.order : all.length,
      isActive: b.isActive !== false,
    });
    res.json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const allowed = ["name", "order", "isActive"];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    const updated = await store.update(COLLECTION, req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: "Job function not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await store.remove(COLLECTION, req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: "Job function not found" });
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
