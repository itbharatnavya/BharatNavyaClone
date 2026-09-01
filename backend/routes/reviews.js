/**
 * routes/reviews.js — mutual (two-way) user reviews (DESIGN §8 + §12 reconciliation).
 *
 * A logged-in user reviews another user. `direction` records who-reviews-whom
 * (buyer_to_seller default | seller_to_seller | seller_to_buyer) and `targetUserId`
 * is the user being reviewed. `sellerId` is kept as a back-compat alias (= targetUserId
 * when the target is a seller) so existing seller-page callers keep working.
 *
 * Reviews publish immediately (no admin approval step) — `status` stays on every
 * row only as a back-compat field (always "approved"). The author (buyerId/
 * buyerName) comes from the JWT, never the client body.
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");
const directory = require("../modules/directory");
const { authGuard } = require("../middleware/authGuard");
const { recomputeSellerRating } = require("../lib/sellerRating");

// Phase 5b: reviews.json writes (POST /) + the per-user lookups go through
// modules/directory `reviewsRepo` (criteria grammar → SQL), not the predicate
// store. The homepage aggregation reads (/recent, /recruitment-recent) still join
// users/listings via `store` — reads may straddle until those collections graduate.
const reviewsRepo = directory.reviewsRepo;

// Recognized review directions; anything else defaults to buyer_to_seller.
const REVIEW_DIRECTIONS = new Set([
  "buyer_to_seller",
  "seller_to_seller",
  "seller_to_buyer",
]);

// Product scope for a review. The same user id can be a Directory seller AND a
// Recruitment employer — `context` keeps the two review pools (and the ratings
// derived from them) separate. Legacy rows carry no context and count as
// "directory" everywhere (here + lib/sellerRating.js).
const REVIEW_CONTEXTS = new Set(["directory", "recruitment"]);
const contextOf = (r) => r.context || "directory";

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
      .filter((r) => r.status === "approved" && contextOf(r) === "directory")
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

/**
 * GET /api/reviews/recruitment-recent?limit=6 — Recruitment homepage testimonials
 * strip: the latest messaged, approved company reviews, ONE per company, joined
 * with the employer's company info. Server-capped so the home page makes a single
 * small request instead of one GET /api/reviews per hiring company. Recruitment
 * analog of GET /recent above (that one is Directory/seller-scoped).
 */
router.get("/recruitment-recent", async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(12, parseInt(req.query.limit, 10) || 6));

    const [reviews, users] = await Promise.all([
      store.all("reviews.json"),
      store.all("users.json"),
    ]);
    const usersById = new Map(users.map((u) => [u.id, u]));

    const approved = reviews
      .filter(
        (r) =>
          r.status === "approved" &&
          contextOf(r) === "recruitment" &&
          typeof r.reviewText === "string" &&
          r.reviewText.trim()
      )
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const out = [];
    const seenCompanies = new Set();
    for (const r of approved) {
      if (out.length >= limit) break;
      const companyId = r.targetUserId;
      if (!companyId || seenCompanies.has(companyId)) continue;
      const employer = usersById.get(companyId);
      const ep = employer && employer.employerProfile;
      if (!ep) continue; // only reviews of real employers with a company profile

      seenCompanies.add(companyId);
      const buyer = usersById.get(r.buyerId);
      out.push({
        reviewId: r.id,
        rating: r.rating,
        reviewText: r.reviewText,
        createdAt: r.createdAt,
        buyerName: (buyer && buyer.name) || r.buyerName || "A candidate",
        company: {
          id: employer.id,
          name: ep.companyName || employer.name || "Company",
          slug: ep.slug || null,
          logo: ep.logo || null,
        },
      });
    }

    res.json({ success: true, data: out });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews?targetUserId= (or ?sellerId= alias) — every review for a user,
// newest first. Reviews are live the moment they're submitted (no moderation
// gate), so this is a plain public read.
//
// Returns EVERY review (message or star-only) — callers decide their own
// presentation rules: the public ReviewsPanel (seller profile) only lists messaged
// ones, while the seller's own dashboard ReviewsTab shows everything they've been
// rated, since that's their private "what did buyers actually say" view.
router.get("/", async (req, res, next) => {
  try {
    // targetUserId is canonical; sellerId is accepted as a back-compat alias.
    const target = req.query.targetUserId || req.query.sellerId;
    // Optional product scope. Omitted → every context (back-compat); the
    // Directory seller page passes "directory", the Recruitment company page
    // passes "recruitment", so the two never see each other's reviews.
    const context = REVIEW_CONTEXTS.has(req.query.context) ? req.query.context : null;
    // targetUserId | sellerId match compiles to an _or; the NULL-context-means-
    // "directory" rule can't be expressed in the grammar, so it stays a JS filter
    // over the (small) per-target result set.
    const reviews = target
      ? await reviewsRepo.findMany({ where: { _or: [{ targetUserId: target }, { sellerId: target }] } })
      : await reviewsRepo.findMany({});
    const filtered = context ? reviews.filter((r) => contextOf(r) === context) : reviews;
    filtered.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    return res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews — review another user. Publishes immediately, no
// moderation step. One review per (buyer, target): resubmitting the same
// pair EDITS the existing row in place rather than creating a second one —
// a buyer can't stack multiple reviews for the same seller, only update
// their one review.
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
    // Can't review yourself (BACKEND-AUDIT.md S2) — this path runs
    // recomputeSellerRating on the target, so self-review = self-inflated rating.
    if (targetUserId === req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "You can't review your own account." });
    }
    // The target must actually exist — a review pointing at a bogus id would
    // otherwise be stored and skew nothing visibly, but pollutes the collection.
    const target = await store.getById("users.json", targetUserId);
    if (!target) {
      return res
        .status(404)
        .json({ success: false, error: "That account no longer exists." });
    }
    const rating = Number(b.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, error: "rating must be a number 1-5" });
    }
    const context = REVIEW_CONTEXTS.has(b.context) ? b.context : "directory";

    // One review per (buyer, target, context) — a user can leave one Directory
    // review and one Recruitment review for the same person, but not two of either.
    // Fetch this buyer's reviews for the target (tiny set), then apply the
    // NULL-context-means-"directory" rule in JS (not expressible in the grammar).
    const mineForTarget = await reviewsRepo.findMany({
      where: { buyerId: req.user.id, _or: [{ targetUserId }, { sellerId: targetUserId }] },
    });
    const existing = mineForTarget.find((r) => contextOf(r) === context) || null;

    let review;
    if (existing) {
      review = await reviewsRepo.updateById(existing.id, {
        rating,
        reviewText: b.reviewText || "",
        status: "approved",
        createdAt: new Date().toISOString(),
      });
    } else {
      const direction = REVIEW_DIRECTIONS.has(b.direction)
        ? b.direction
        : "buyer_to_seller";
      // sellerId alias is only meaningful for a Directory review of a seller;
      // a Recruitment company review always leaves it null.
      const targetIsSeller =
        context === "directory" &&
        (direction === "buyer_to_seller" || direction === "seller_to_seller");

      review = await reviewsRepo.insert(
        {
          targetUserId,
          sellerId: targetIsSeller ? targetUserId : null,
          direction,
          context,
          buyerId: req.user.id,
          buyerName: req.user.name,
          rating,
          reviewText: b.reviewText || "",
          status: "approved",
          createdAt: new Date().toISOString(),
        },
        "rev"
      );
    }
    await recomputeSellerRating(review.targetUserId || review.sellerId);

    // Flat, matching every other POST in this codebase (blogs.js, etc.) — a
    // previous `data: { review }` nesting here meant postReview() on the
    // frontend, typed to read the review straight off `data`, actually got
    // `{ review }` and rendered undefined createdAt/reviewText ("Invalid
    // Date", blank comment) for the review it had just optimistically shown.
    return res.json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
