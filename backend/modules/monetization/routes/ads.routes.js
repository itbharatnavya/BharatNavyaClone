/**
 * ads.js — PUBLIC ad serving for category/search/home pages (monetization).
 * GET /api/ads?placement=category_top&category=<slug>  -> active ad bookings for that slot.
 * Admin manages inventory via /api/admin/ad-slots + /api/admin/ad-bookings.
 * Serving is gated by status + date window (payment gating is admin-side).
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../../_shared");

// Phase 7: ad-bookings.json is a flat collection — this public read graduates onto
// the repo. (routes/admin.js still writes it, so it isn't fully graduated yet.)
const adBookingsRepo = repoForCollection("ad-bookings.json");

function active(b, now) {
  if (b.status && !["active", "scheduled"].includes(b.status)) return false;
  if (b.startDate && now < Date.parse(b.startDate)) return false;
  if (b.endDate && now > Date.parse(b.endDate)) return false;
  return true;
}

router.get("/", async (req, res, next) => {
  try {
    const { placement, category } = req.query;
    const now = Date.now();
    let bookings = await adBookingsRepo.findMany({});
    bookings = bookings.filter((b) => active(b, now));
    if (placement) bookings = bookings.filter((b) => b.placementType === placement);
    if (category) {
      // `category` may be one slug or a comma-separated path (a listing page sends its whole
      // category path), so an ad targeted at a parent category still matches a leaf page.
      const wanted = String(category).split(",").map((s) => s.trim()).filter(Boolean);
      bookings = bookings.filter(
        (b) =>
          !b.categoryIds ||
          b.categoryIds.length === 0 ||
          b.categoryIds.some((id) => wanted.includes(id))
      );
    }
    bookings.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    // Every approved ad for the slot is returned (the page rotates through all of them);
    // `limit` is only a safety ceiling for the payload.
    const asked = parseInt(req.query.limit, 10);
    const limit = asked >= 1 ? Math.min(100, asked) : 50;
    res.json({ success: true, data: bookings.slice(0, limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
