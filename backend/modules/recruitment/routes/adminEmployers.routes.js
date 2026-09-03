/**
 * routes/adminEmployers.js — admin approval queue for Recruitment employers
 * (RECRUITMENT.md §3 "Admin"). Mirrors the seller-approval capability Directory's
 * admin already has, scoped to employerProfile.status.
 *
 * Mounted at /api/admin/employers, BEFORE the blanket `/api/admin` guard in index.js —
 * same nested-admin-route pattern as boosts/entitlements/categories (CLAUDE.md §5).
 * The whole router is self-guarded below, so it's safe regardless of mount order.
 *
 * GET  /              all employers, optional ?status=pending|approved|suspended
 *                      (mirrors GET /api/admin/sellers?status= in routes/admin.js)
 * GET  /pending        employers awaiting approval (kept — used by the AI/legacy path)
 * POST /:userId/approve
 * POST /:userId/suspend
 */

const express = require("express");
const router = express.Router();

const identity = require("../../identity");
const { authGuard, requireRole } = require("../../../middleware/authGuard");

router.use(authGuard, requireRole("admin"));

// Phase 7: the list/pending reads are indexed employer_profiles probes + a
// by-id composite hydrate (was `store.findMany("users.json", u => !!u.employerProfile)`
// — a full composite scan of every user); the approve/suspend write goes through
// `identity.setEmployerApproval`, the port's one exposed write.
router.get("/", async (req, res, next) => {
  try {
    const status = req.query.status;
    const wantStatus = status && status !== "all" ? status : undefined;
    const ids = await identity.getEmployerUserIds(wantStatus);
    const employers = await identity.hydrateUsersByIds(ids);
    const data = employers
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        createdAt: u.createdAt,
        ...u.employerProfile,
      }))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/pending", async (req, res, next) => {
  try {
    const users = await identity.hydrateUsersByIds(
      await identity.getEmployerUserIds("pending")
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
    const updated = await identity.setEmployerApproval(req.params.userId, status, req.user.id);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Employer not found" });
    }
    return res.json({ success: true, data: { id: updated.id, status: updated.employerProfile.status } });
  } catch (err) {
    next(err);
  }
}

router.post("/:userId/approve", (req, res, next) => setStatus(req, res, next, "approved"));
router.post("/:userId/suspend", (req, res, next) => setStatus(req, res, next, "suspended"));

module.exports = router;
