/**
 * features.js — the living Feature Catalog.
 * Public GET (sales/marketing + the public /features & /pricing pages read it).
 * Admin can add/edit/remove to keep it current.
 */

const express = require("express");
const router = express.Router();
const { featuresRepo } = require("../index");
const { authGuard, requireRole } = require("../../../middleware/authGuard");

// Public: list all features (optionally filter by group/audience/status/plan)
router.get("/", async (req, res, next) => {
  try {
    let features = await featuresRepo.findMany({});
    const { group, audience, status, plan } = req.query;
    if (group) features = features.filter((f) => f.group === group);
    if (audience) features = features.filter((f) => f.audience === audience || f.audience === "all");
    if (status) features = features.filter((f) => f.status === status);
    if (plan) features = features.filter((f) => (f.plans || []).includes(plan));
    res.json({ success: true, data: features });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const f = await featuresRepo.findById(req.params.id);
    if (!f) return res.status(404).json({ success: false, error: "Feature not found" });
    res.json({ success: true, data: f });
  } catch (err) {
    next(err);
  }
});

// Admin: create / update / delete
router.post("/", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name || !b.group) {
      return res.status(400).json({ success: false, error: "name and group are required" });
    }
    const feature = {
      name: b.name,
      group: b.group,
      description: b.description || "",
      audience: b.audience || "all",
      plans: Array.isArray(b.plans) ? b.plans : ["free", "silver", "gold"],
      status: b.status || "live",
      phase: b.phase || 1,
    };
    const created = await featuresRepo.insert(feature, "feat");
    res.json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const allowed = ["name", "group", "description", "audience", "plans", "status", "phase"];
    const patch = {};
    for (const k of allowed) if (k in (req.body || {})) patch[k] = req.body[k];
    const updated = await featuresRepo.updateById(req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: "Feature not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const ok = await featuresRepo.deleteById(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: "Feature not found" });
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
