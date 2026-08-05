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

const PLACEMENTS = ["category_top", "search_top", "home_hero"];

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

module.exports = router;
