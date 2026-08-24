/**
 * routes/adminEmployers.js — admin approval queue for Recruitment employers
 * (RECRUITMENT.md §3 "Admin"). Mirrors the seller-approval capability Directory's
 * admin already has, scoped to employerProfile.status.
 *
 * Mounted at /api/admin/employers, BEFORE the blanket `/api/admin` guard in index.js —
 * same nested-admin-route pattern as boosts/entitlements/categories (CLAUDE.md §5).
 * The whole router is self-guarded below, so it's safe regardless of mount order.
 *
 * GET  /pending        employers awaiting approval
 * POST /:userId/approve
 * POST /:userId/suspend
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");
const { authGuard, requireRole } = require("../middleware/authGuard");

router.use(authGuard, requireRole("admin"));

router.get("/pending", async (req, res, next) => {
  try {
    const users = await store.findMany(
      "users.json",
      (u) => u.employerProfile && u.employerProfile.status === "pending"
    );
    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      companyName: u.employerProfile.companyName,
      slug: u.employerProfile.slug,
      industry: u.employerProfile.industry,
      location: u.employerProfile.location,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

async function setStatus(req, res, next, status) {
  try {
    const user = await store.getById("users.json", req.params.userId);
    if (!user || !user.employerProfile) {
      return res.status(404).json({ success: false, error: "Employer not found" });
    }
    const employerProfile = { ...user.employerProfile, status };
    const updated = await store.update("users.json", user.id, { employerProfile });
    return res.json({ success: true, data: { id: updated.id, status: updated.employerProfile.status } });
  } catch (err) {
    next(err);
  }
}

router.post("/:userId/approve", (req, res, next) => setStatus(req, res, next, "approved"));
router.post("/:userId/suspend", (req, res, next) => setStatus(req, res, next, "suspended"));

module.exports = router;
