/**
 * adminCategories.js — admin CRUD for the category tree (no-code taxonomy edits).
 * Mounted at /api/admin/categories. Keeps parentId + path[] consistent.
 */

const express = require("express");
const router = express.Router();
const directory = require("../modules/directory");
const { authGuard, requireRole } = require("../middleware/authGuard");

const categoriesRepo = directory.categoriesRepo;

router.use(authGuard, requireRole("admin"));

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alphanumerics -> single dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes

// Create a category node (optionally under a parent).
router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, error: "name is required" });
    const cats = await categoriesRepo.findMany({});
    const slug = b.slug ? slugify(b.slug) : slugify(b.name);
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
      name: b.name,
      slug,
      parentId: parent ? parent.id : null,
      path: parent ? [...parent.path, slug] : [slug],
      type: b.type || (parent ? parent.type : "both"),
      icon: b.icon || null,
      description: b.description || "",
      facets: b.facets || (parent ? parent.facets : []),
      listingCount: 0,
      order: typeof b.order === "number" ? b.order : cats.length,
    };
    const created = await categoriesRepo.insert(category);
    res.json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const allowed = ["name", "description", "icon", "facets", "order", "type"];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    const updated = await categoriesRepo.updateById(req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: "Category not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const cats = await categoriesRepo.findMany({});
    const target = cats.find((c) => c.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: "Category not found" });
    if (cats.some((c) => c.parentId === target.id)) {
      return res
        .status(400)
        .json({ success: false, error: "Category has sub-categories; delete those first" });
    }
    await categoriesRepo.deleteById(req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
