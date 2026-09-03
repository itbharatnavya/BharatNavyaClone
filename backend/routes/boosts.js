/**
 * routes/boosts.js — SELF-SERVE BOOSTS (seller requests → admin approves → applied).
 *
 * A seller requests to promote one of their listings (feature / category_top / rank)
 * for N days. The request is stored PENDING in boost-requests.json. An admin approves
 * it — which APPLIES the boost to the listing (listings.json) and flips the request to
 * "active" — or rejects it. No payment gateway: `amount` is admin/monetization data.
 *
 * Mounted TWICE in index.js:
 *   /api/boosts        → seller  POST /  + GET /
 *   /api/admin/boosts  → admin   GET /admin + POST /admin/:id/approve|reject
 * The admin mount is registered BEFORE /api/admin so this (self-guarded) router
 * handles /api/admin/boosts/* first — the admin routes carry their own requireRole guard.
 *
 * Response envelope: { success, data } / { success:false, error }.
 */

const express = require("express");
const router = express.Router();

const { repoForCollection } = require("../modules/_shared");
const identity = require("../modules/identity");
const directory = require("../modules/directory");
const { authGuard, requireRole } = require("../middleware/authGuard");

const boostsRepo = repoForCollection("boost-requests.json");

// The three boost products a seller can request.
const BOOST_TYPES = new Set(["feature", "category_top", "rank"]);

// Rank deltas applied to listing.rankBoostScore on approval (normalized /100 in ranking).
const RANK_BOOST_DELTA = 25; // "rank"         → +25
const CATEGORY_TOP_DELTA = 50; // "category_top" → +50 (pushes to top of its category)

const BOOST_LABELS = {
  feature: "Feature listing",
  category_top: "Top of category",
  rank: "Rank boost",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Coerce a loose value to a finite Number, or null. */
function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------- POST / (seller creates a request) ---- */
router.post("/", authGuard, async (req, res, next) => {
  try {
    const body = req.body || {};
    const listingId = body.listingId;
    const boostType = body.boostType;
    const days = num(body.days);

    if (!listingId) {
      return res.status(400).json({ success: false, error: "listingId is required" });
    }
    if (!BOOST_TYPES.has(boostType)) {
      return res.status(400).json({
        success: false,
        error: "boostType must be one of feature|category_top|rank",
      });
    }
    if (days === null || days <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "days must be a positive number" });
    }

    // The listing must exist AND belong to the requesting seller.
    const listing = await directory.listingsRepo.getById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    if (listing.sellerId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "You can only boost your own listings" });
    }

    const request = {
      sellerId: req.user.id,
      listingId,
      boostType,
      days,
      amount: null,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const saved = await boostsRepo.insert(request, "br");
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------- GET / (the seller's own requests) --- */
router.get("/", authGuard, async (req, res, next) => {
  try {
    const requests = await boostsRepo.findMany({ where: { sellerId: req.user.id } });
    const titleById = await directory.listingTitlesByIds(requests.map((r) => r.listingId));

    const mine = requests
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      )
      .map((r) => ({
        ...r,
        listingTitle: titleById.get(r.listingId) || null,
        boostLabel: BOOST_LABELS[r.boostType] || r.boostType,
      }));

    return res.json({ success: true, data: mine });
  } catch (err) {
    next(err);
  }
});

/* ------------------------ GET /admin (ALL requests; admin only) ------------- */
router.get("/admin", authGuard, requireRole("admin"), async (req, res, next) => {
  try {
    const status = req.query.status;
    const where = status && status !== "all" ? { status } : {};
    const requests = await boostsRepo.findMany({ where });
    const [titleById, companyBySeller] = await Promise.all([
      directory.listingTitlesByIds(requests.map((r) => r.listingId)),
      identity.getSellerCompanyNames(requests.map((r) => r.sellerId)),
    ]);

    const rows = requests
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      )
      .map((r) => {
        const card = companyBySeller.get(r.sellerId);
        return {
          ...r,
          listingTitle: titleById.get(r.listingId) || null,
          boostLabel: BOOST_LABELS[r.boostType] || r.boostType,
          sellerCompany: (card && card.company) || r.sellerId,
        };
      });

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/* --------------- POST /admin/:id/approve (apply the boost; admin only) ------ */
router.post(
  "/admin/:id/approve",
  authGuard,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const request = await boostsRepo.findById(req.params.id);
      if (!request) {
        return res
          .status(404)
          .json({ success: false, error: "Boost request not found" });
      }

      const listing = await directory.listingsRepo.getById(request.listingId);
      if (!listing) {
        return res
          .status(404)
          .json({ success: false, error: "Listing not found" });
      }

      // Apply the boost to the listing per its type.
      const now = new Date();
      const patch = {};
      if (request.boostType === "feature") {
        patch.isFeatured = true;
        patch.featuredStartDate = now.toISOString();
        patch.featuredEndDate = new Date(
          now.getTime() + (Number(request.days) || 0) * DAY_MS
        ).toISOString();
      } else if (request.boostType === "category_top") {
        patch.rankBoostScore =
          (Number(listing.rankBoostScore) || 0) + CATEGORY_TOP_DELTA;
      } else if (request.boostType === "rank") {
        patch.rankBoostScore =
          (Number(listing.rankBoostScore) || 0) + RANK_BOOST_DELTA;
      }
      await directory.listingsRepo.update(listing.id, patch);

      const updated = await boostsRepo.updateById(request.id, {
        status: "active",
        approvedAt: now.toISOString(),
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

/* --------------------- POST /admin/:id/reject (admin only) ------------------ */
router.post(
  "/admin/:id/reject",
  authGuard,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const updated = await boostsRepo.updateById(req.params.id, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      });
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, error: "Boost request not found" });
      }
      return res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
