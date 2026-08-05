/**
 * ads.js — PUBLIC ad serving for category/search/home pages (monetization).
 * GET /api/ads?placement=category_top&category=<slug>  -> active ad bookings for that slot.
 * Admin manages inventory via /api/admin/ad-slots + /api/admin/ad-bookings.
 * Serving is gated by status + date window (payment gating is admin-side).
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");

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
    let bookings = await store.all("ad-bookings.json");
    bookings = bookings.filter((b) => active(b, now));
    if (placement) bookings = bookings.filter((b) => b.placementType === placement);
    if (category) {
      bookings = bookings.filter(
        (b) => !b.categoryIds || b.categoryIds.length === 0 || b.categoryIds.includes(category)
      );
    }
    bookings.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
