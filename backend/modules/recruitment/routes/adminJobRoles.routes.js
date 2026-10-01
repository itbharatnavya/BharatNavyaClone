/**
 * adminJobRoles.js — admin CRUD for the predefined job-title picklist
 * (RECRUITMENT.md §2). Mounted at /api/admin/job-roles, before the blanket
 * /api/admin guard. Mirrors adminCategories.js's CRUD pattern, simplified — flat
 * list, no parentId/path tree. Note: this collection's display field is `title`,
 * not `name` (matches routes/jobRoles.js's public read).
 */

const express = require("express");
const router = express.Router();
const { jobRolesRepo } = require("../index");
const { authGuard, requireRole } = require("../../../middleware/authGuard");

router.use(authGuard, requireRole("admin"));


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
    const all = await jobRolesRepo.findMany({});
    all.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ success: true, data: all });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, error: "title is required" });
    const all = await jobRolesRepo.findMany({});
    const slug = b.slug ? slugify(b.slug) : slugify(b.title);
    if (all.some((r) => r.slug === slug)) {
      return res.status(409).json({ success: false, error: "slug already exists" });
    }
    const created = await jobRolesRepo.insert({
      id: "jr_" + slug,
      title: b.title,
      slug,
      jobFunction: b.jobFunction || null,
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
    const allowed = ["title", "jobFunction", "order", "isActive"];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    const updated = await jobRolesRepo.updateById(req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: "Job role not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const ok = await jobRolesRepo.deleteById(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: "Job role not found" });
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
