/**
 * routes/shortlist.js — a buyer's saved-products shortlist (server-persisted).
 *
 * One saved item is { id, userId, listingId, createdAt } in DB/shortlist.json.
 * Saving is idempotent — a duplicate POST for the same user+listing is a no-op — so
 * the client can optimistically toggle without worrying about duplicates.
 *
 *   GET    /                 → { ids[], listings[] } — the user's saved listing ids
 *                              (newest-saved first) + resolved ACTIVE listings, each
 *                              carrying the flat seller mini the browse endpoint uses.
 *   POST   /   { listingId } → add to the shortlist; returns { ids[] }.
 *   DELETE /:listingId       → remove from the shortlist; returns { ids[] }.
 *
 * NOTE FOR INTEGRATOR: this router must be mounted by index.js with
 *   app.use("/api/shortlist", require("./routes/shortlist"));
 * BEFORE the catch-all app.use("/api", require("./routes/users")).
 */

const express = require("express");
const router = express.Router();

const { repoForCollection } = require("../../_shared");
const identity = require("../../identity");
const directory = require("../index");
const { authGuard } = require("../../../middleware/authGuard");

const shortlistRepo = repoForCollection("shortlist.json");

/** Strip internal scratch fields before returning a listing to clients. */
function clean(l) {
  const { _relevance, _finalScore, _paidTerm, _distanceKm, ...rest } = l;
  return rest;
}

/** The user's saved rows, newest-saved first. */
async function savedRows(userId) {
  const rows = await shortlistRepo.findMany({ where: { userId } });
  return rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// GET / — the user's saved listing ids + resolved ACTIVE listings (newest-saved first).
router.get("/", authGuard, async (req, res, next) => {
  try {
    const rows = await savedRows(req.user.id);
    const ids = rows.map((r) => r.listingId);

    // Resolve in saved-order; drop anything missing or no longer active.
    const resolved = (
      await Promise.all(ids.map((id) => directory.listingsRepo.getById(id)))
    ).filter((l) => l && l.status === "active");

    const cardBySeller = await identity.getSellerBrowseCards(
      resolved.map((l) => l.sellerId)
    );
    const listings = resolved.map((l) => {
      const c = clean(l);
      c.seller = cardBySeller.get(l.sellerId) || null;
      return c;
    });

    return res.json({ success: true, data: { ids, listings } });
  } catch (err) {
    next(err);
  }
});

// POST / — add a listing to the shortlist (idempotent per user+listing).
router.post("/", authGuard, async (req, res, next) => {
  try {
    const listingId = req.body && req.body.listingId;
    if (!listingId) {
      return res
        .status(400)
        .json({ success: false, error: "listingId is required" });
    }

    const listing = await directory.listingsRepo.getById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    const existing = await shortlistRepo.findOne({
      where: { userId: req.user.id, listingId },
    });
    if (!existing) {
      await shortlistRepo.insert(
        { userId: req.user.id, listingId, createdAt: new Date().toISOString() },
        "sl"
      );
    }

    const rows = await savedRows(req.user.id);
    return res.json({ success: true, data: { ids: rows.map((r) => r.listingId) } });
  } catch (err) {
    next(err);
  }
});

// DELETE /:listingId — remove a listing from the shortlist (idempotent).
router.delete("/:listingId", authGuard, async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const existing = await shortlistRepo.findOne({
      where: { userId: req.user.id, listingId },
    });
    if (existing) {
      await shortlistRepo.deleteById(existing.id);
    }

    const rows = await savedRows(req.user.id);
    return res.json({ success: true, data: { ids: rows.map((r) => r.listingId) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
