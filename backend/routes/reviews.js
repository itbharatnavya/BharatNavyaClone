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

/**
 * GET /api/reviews/recent?limit=6&city= — Directory homepage "Recent Activity"
 * feed: latest approved reviews joined with the reviewed seller's business
 * info + a representative photo. Read-only aggregation (no writes), same
 * shape of join as categories.js's GET /:slug. Unlike routes/searchTrends.js,
 * this is deliberately NOT padded with any fallback/demo content — it only
 * ever reflects real reviews (see plan discussion); it can legitimately be
 * empty, and the frontend self-hides when it is.
 */
router.get("/recent", async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 6));
    const city = req.query.city ? String(req.query.city).trim().toLowerCase() : null;

    const [reviews, users, listings] = await Promise.all([
      store.all("reviews.json"),
      store.all("users.json"),
      store.all("listings.json"),
    ]);
    const usersById = new Map(users.map((u) => [u.id, u]));

    const approved = reviews
      .filter((r) => r.status === "approved")
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const out = [];
    for (const r of approved) {
      if (out.length >= limit) break;
      const seller = usersById.get(r.targetUserId);
      const sp = seller && seller.sellerProfile;
      if (!sp) continue; // only show reviews of real sellers with a business profile

      const sellerCity = (sp.location && sp.location.city) || seller.city || "";
      if (city && !sellerCity.toLowerCase().includes(city)) continue;

      const buyer = usersById.get(r.buyerId);
      const sellerListing = listings.find((l) => l.sellerId === seller.id && l.media && l.media[0]);
      const image =
        (sellerListing && sellerListing.media[0].url) || sp.coverImage || sp.logo || null;

      out.push({
        reviewId: r.id,
        rating: r.rating,
        reviewText: r.reviewText || "",
        createdAt: r.createdAt,
        buyerName: (buyer && buyer.name) || r.buyerName || "A buyer",
        buyerAvatarUrl: (buyer && buyer.avatarUrl) || null,
        sellerId: seller.id,
        sellerSlug: sp.slug || null,
        sellerName: sp.companyName || seller.name || "Business",
        sellerCity,
        whatsappNumber: sp.contactMobile || seller.mobile || null,
        image,
      });
    }

    res.json({ success: true, data: out });
  } catch (err) {
    next(err);
  }
});

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
