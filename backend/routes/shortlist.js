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

const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

const FILE = "shortlist.json";

// Flat seller mini-object for cards — built EXACTLY as the browse endpoint builds it
// (company name + slug link + trust), so shortlist cards render like search results.
function makeSellerMini(users) {
  const userById = new Map(users.map((u) => [u.id, u]));
  return (sellerId) => {
    const u = userById.get(sellerId);
    if (!u) return null;
    const sp = u.sellerProfile || {};
    return {
      id: u.id,
      name: u.name,
      companyName: sp.companyName || u.name || null,
      slug: sp.slug || null,
      city: (sp.location && sp.location.city) || null,
      state: (sp.location && sp.location.state) || null,
      logo: sp.logo || u.avatarUrl || null,
      isVerified: !!sp.isVerified,
      rating: sp.rating ?? 0,
      reviewCount: sp.reviewCount ?? 0,
      responseRate: sp.responseRate ?? 0,
    };
  };
}

/** Strip internal scratch fields before returning a listing to clients. */
function clean(l) {
  const { _relevance, _finalScore, _paidTerm, _distanceKm, ...rest } = l;
  return rest;
}

/** The user's saved rows, newest-saved first. */
async function savedRows(userId) {
  const rows = await store.findMany(FILE, (s) => s.userId === userId);
  return rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

// GET / — the user's saved listing ids + resolved ACTIVE listings (newest-saved first).
router.get("/", authGuard, async (req, res, next) => {
  try {
    const rows = await savedRows(req.user.id);
    const ids = rows.map((r) => r.listingId);

    const [allListings, users] = await Promise.all([
      store.all("listings.json"),
      store.all("users.json"),
    ]);
    const sellerMini = makeSellerMini(users);
    const byId = new Map(allListings.map((l) => [l.id, l]));

    // Resolve in saved-order; drop anything missing or no longer active.
    const listings = ids
      .map((id) => byId.get(id))
      .filter((l) => l && l.status === "active")
      .map((l) => {
        const c = clean(l);
        c.seller = sellerMini(l.sellerId);
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

    const listing = await store.getById("listings.json", listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    const existing = await store.findOne(
      FILE,
      (s) => s.userId === req.user.id && s.listingId === listingId
    );
    if (!existing) {
      await store.insert(
        FILE,
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
    const existing = await store.findOne(
      FILE,
      (s) => s.userId === req.user.id && s.listingId === listingId
    );
    if (existing) {
      await store.remove(FILE, existing.id);
    }

    const rows = await savedRows(req.user.id);
    return res.json({ success: true, data: { ids: rows.map((r) => r.listingId) } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
