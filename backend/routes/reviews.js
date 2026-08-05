/**
 * routes/reviews.js — mutual (two-way) user reviews (DESIGN §8 + §12 reconciliation).
 *
 * A logged-in user reviews another user. `direction` records who-reviews-whom
 * (buyer_to_seller default | seller_to_seller | seller_to_buyer) and `targetUserId`
 * is the user being reviewed. `sellerId` is kept as a back-compat alias (= targetUserId
 * when the target is a seller) so existing seller-page callers keep working.
 *
 * Reviews are moderated: created as "pending", only "approved" ones are public.
 * The author (buyerId/buyerName) comes from the JWT, never the client body.
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

// Recognized review directions; anything else defaults to buyer_to_seller.
const REVIEW_DIRECTIONS = new Set([
  "buyer_to_seller",
  "seller_to_seller",
  "seller_to_buyer",
]);

// GET /api/reviews?targetUserId= (or ?sellerId= alias) — approved reviews for a user.
router.get("/", async (req, res, next) => {
  try {
    // targetUserId is canonical; sellerId is accepted as a back-compat alias.
    const target = req.query.targetUserId || req.query.sellerId;
    const reviews = await store.findMany(
      "reviews.json",
      (r) =>
        r.status === "approved" &&
        (!target || r.targetUserId === target || r.sellerId === target)
    );
    return res.json({ success: true, data: { reviews } });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews — review another user (moderated: starts as "pending").
router.post("/", authGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    // Accept targetUserId; fall back to sellerId so old callers keep working.
    const targetUserId = b.targetUserId || b.sellerId;
    if (!targetUserId) {
      return res
        .status(400)
        .json({ success: false, error: "targetUserId is required" });
    }
    const rating = Number(b.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, error: "rating must be a number 1-5" });
    }

    const direction = REVIEW_DIRECTIONS.has(b.direction)
      ? b.direction
      : "buyer_to_seller";
    // sellerId alias is only meaningful when the target is a seller.
    const targetIsSeller =
      direction === "buyer_to_seller" || direction === "seller_to_seller";

    const review = {
      id: await store.nextId("rev"),
      targetUserId,
      sellerId: targetIsSeller ? targetUserId : null,
      direction,
      buyerId: req.user.id,
      buyerName: req.user.name,
      rating,
      reviewText: b.reviewText || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await store.insert("reviews.json", review);

    return res.json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
