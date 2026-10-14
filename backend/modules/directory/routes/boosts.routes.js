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

const { repoForCollection } = require("../../_shared");
const identity = require("../../identity");
const directory = require("../index");
const { authGuard, requireRole } = require("../../../middleware/authGuard");
const { sellerLock } = require("../../../middleware/sellerLock");

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

const MAX_BOOST_DAYS = 365;

// An approved boost whose window has passed reads as "expired" — computed, not stored,
// so nothing needs a scheduler (serverless-safe) and the DB row stays the audit trail.
function withExpiry(r, now) {
  if (r.status === "active" && r.expiresAt && Date.parse(r.expiresAt) < now) {
    return { ...r, status: "expired" };
  }
  return r;
}

/** Coerce a loose value to a finite Number, or null. */
function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------- POST / (seller creates a request) ---- */
router.post("/", authGuard, sellerLock, async (req, res, next) => {
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
    if (days === null || !Number.isInteger(days) || days <= 0 || days > MAX_BOOST_DAYS) {
      return res.status(400).json({
        success: false,
        error: `days must be a whole number between 1 and ${MAX_BOOST_DAYS}`,
      });
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

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Only a live (active) listing can be boosted",
      });
    }

    // One open request per listing + boost type: stops accidental double-submits and
    // double-charging the same boost.
    const open = await boostsRepo.findMany({
      where: { sellerId: req.user.id, listingId, boostType, status: "pending" },
    });
    if (open.length > 0) {
      return res.status(409).json({
        success: false,
        error: "You already have a pending request for this boost on this listing",
      });
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

    const now = Date.now();
    const mine = requests
      .map((r) => withExpiry(r, now))
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

    const now = Date.now();
    const rows = requests
      .map((r) => withExpiry(r, now))
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

      // Only a pending request can be approved — a second click (or a stale admin tab)
      // must not apply the same boost twice.
      if (request.status !== "pending") {
        return res.status(409).json({
          success: false,
          error: `Request is already ${request.status} — only pending requests can be approved`,
        });
      }

      const listing = await directory.listingsRepo.getById(request.listingId);
      if (!listing) {
        return res
          .status(404)
          .json({ success: false, error: "Listing not found" });
      }

      // Apply the boost to the listing per its type, honouring `days` for every type.
      const now = new Date();
      const days = Number(request.days) || 0;
      const patch = {};
      let expiresAt;
      if (request.boostType === "feature") {
        // Extend an already-running feature window instead of resetting it.
        const curEnd = listing.featuredEndDate ? Date.parse(listing.featuredEndDate) : 0;
        const running = listing.isFeatured && curEnd > now.getTime();
        const base = running ? curEnd : now.getTime();
        patch.isFeatured = true;
        patch.featuredStartDate = running && listing.featuredStartDate ? listing.featuredStartDate : now.toISOString();
        expiresAt = new Date(base + days * DAY_MS).toISOString();
        patch.featuredEndDate = expiresAt;
      } else {
        const delta = request.boostType === "category_top" ? CATEGORY_TOP_DELTA : RANK_BOOST_DELTA;
        const curScore = Number(listing.rankBoostScore) || 0;
        const curEnd = listing.rankBoostEndDate ? Date.parse(listing.rankBoostEndDate) : null;
        // A lapsed boost no longer counts; a score with no end date is an admin-set
        // permanent boost, which stays permanent.
        const lapsed = curEnd !== null && curEnd < now.getTime();
        const activeScore = lapsed ? 0 : curScore;
        patch.rankBoostScore = activeScore + delta;
        if (activeScore > 0 && curEnd === null) {
          patch.rankBoostEndDate = null;
          expiresAt = null;
        } else {
          const base = curEnd !== null && !lapsed ? Math.max(curEnd, now.getTime()) : now.getTime();
          expiresAt = new Date(base + days * DAY_MS).toISOString();
          patch.rankBoostEndDate = expiresAt;
        }
      }
      await directory.listingsRepo.update(listing.id, patch);

      const updated = await boostsRepo.updateById(request.id, {
        status: "active",
        approvedAt: now.toISOString(),
        expiresAt,
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
      const request = await boostsRepo.findById(req.params.id);
      if (!request) {
        return res
          .status(404)
          .json({ success: false, error: "Boost request not found" });
      }
      if (request.status !== "pending") {
        return res.status(409).json({
          success: false,
          error: `Request is already ${request.status} — only pending requests can be rejected`,
        });
      }
      const updated = await boostsRepo.updateById(request.id, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
