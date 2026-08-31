/**
 * myAds.js — seller self-serve advertising (mounted at /api/my-ads).
 *
 * A seller builds an ad campaign from their dashboard (promote a listing or upload a
 * custom image) and submits it. We FORCE sellerId = req.user.id, status = "pending",
 * priority = 0 and amount = null, then insert it into the SAME ad-bookings.json the
 * admin Ads tab reads. Because the public serving layer (routes/ads.js) only shows
 * bookings whose status is "active" | "scheduled" within their date window, a pending
 * campaign stays invisible until an admin activates it.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

const PLACEMENTS = [
  "category_top",
  "search_top",
  "home_hero",
  // Recruitment (RECRUITMENT.md) — same booking pipeline (pending → admin
  // review → served by routes/ads.js), just its own placement slots so a
  // Directory campaign never mixes into a Recruitment page or vice versa.
  "recruitment_home",
  "recruitment_search_top",
];

function isAdmin(user) {
  return !!user && (user.roles || []).includes("admin");
}

// Advertisement visibility is public (routes/ads.js has no auth at all); management is
// role-gated. Directory placements keep today's any-authenticated-user behavior — this
// guard only applies to Recruitment placements (enhancement doc §15-19).
function isRecruitmentPlacement(placementType) {
  return typeof placementType === "string" && placementType.startsWith("recruitment_");
}

// POST /api/my-ads — submit a campaign for admin review.
router.post("/", authGuard, async (req, res, next) => {
  try {
    const body = req.body || {};
    const creativeImageUrl =
      typeof body.creativeImageUrl === "string" ? body.creativeImageUrl.trim() : "";
    const headline = typeof body.headline === "string" ? body.headline.trim() : "";
    const placementType = body.placementType;

    if (!creativeImageUrl) {
      return res.status(400).json({ success: false, error: "An ad image is required" });
    }
    if (!headline) {
      return res.status(400).json({ success: false, error: "A headline is required" });
    }
    if (!PLACEMENTS.includes(placementType)) {
      return res.status(400).json({ success: false, error: "Choose a valid placement" });
    }
    if (isRecruitmentPlacement(placementType) && req.user.recruitmentRole !== "recruiter") {
      return res.status(403).json({ success: false, error: "Only recruiters can create Recruitment advertisements." });
    }

    const categoryIds = Array.isArray(body.categoryIds)
      ? body.categoryIds.filter((s) => typeof s === "string" && s.trim() !== "")
      : [];

    const booking = {
      placementType,
      adSlotId: placementType, // parity with admin-created bookings
      slotId: null,
      sellerId: req.user.id, // FORCED — never trust the client
      listingId: body.listingId || null,
      categoryIds,
      creativeImageUrl,
      headline,
      targetUrl:
        (typeof body.targetUrl === "string" && body.targetUrl.trim()) || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      priority: 0, // FORCED
      amount: null, // FORCED — admin owns pricing
      paymentRecordId: null,
      status: "pending", // FORCED — invisible on the public slider until activated
      createdAt: new Date().toISOString(),
    };

    const created = await store.insert("ad-bookings.json", booking, "adb");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// GET /api/my-ads — this seller's own campaigns, newest first.
router.get("/", authGuard, async (req, res, next) => {
  try {
    const rows = await store.findMany(
      "ad-bookings.json",
      (b) => b.sellerId === req.user.id
    );
    rows.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/my-ads/:id — owner (or admin) edits their own campaign. Status may only be
// toggled between active/paused here — pending/booked stay admin-controlled (mirrors
// how planTier/status fields are excluded from PUT /me/employer's whitelist).
router.put("/:id", authGuard, async (req, res, next) => {
  try {
    const ad = await store.getById("ad-bookings.json", req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, error: "Ad not found" });
    }
    if (ad.sellerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    if (isRecruitmentPlacement(ad.placementType) && req.user.recruitmentRole !== "recruiter" && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Only recruiters can manage Recruitment advertisements." });
    }

    const body = req.body || {};
    const patch = {};
    if (body.headline !== undefined) patch.headline = String(body.headline).trim();
    if (body.creativeImageUrl !== undefined) patch.creativeImageUrl = String(body.creativeImageUrl).trim();
    if (body.targetUrl !== undefined) patch.targetUrl = (typeof body.targetUrl === "string" && body.targetUrl.trim()) || null;
    if (body.startDate !== undefined) patch.startDate = body.startDate || null;
    if (body.endDate !== undefined) patch.endDate = body.endDate || null;
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status) || !["active", "paused"].includes(ad.status)) {
        return res.status(400).json({ success: false, error: "Only an active or paused campaign can be toggled here" });
      }
      patch.status = body.status;
    }

    const updated = await store.update("ad-bookings.json", ad.id, patch);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/my-ads/:id — owner (or admin) deletes their own campaign.
router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const ad = await store.getById("ad-bookings.json", req.params.id);
    if (!ad) {
      return res.status(404).json({ success: false, error: "Ad not found" });
    }
    if (ad.sellerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    await store.remove("ad-bookings.json", ad.id);
    return res.json({ success: true, data: { id: ad.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
