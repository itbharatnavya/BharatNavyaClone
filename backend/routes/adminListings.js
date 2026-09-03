/**
 * adminListings.js — admin listing (product/service) AI-verification queue.
 *
 * Every new listing is scored on submit (lib/listingVerification.js) and starts as
 * "active" (auto-approved, score >= 70 with the AI CLI's blessing) or "pending"
 * (needs a human look). Listings created BEFORE this feature shipped have no
 * `verification` block at all — they show up here as "unverified" so an admin can
 * still check them, one at a time or in bulk. This surface lets an admin see EVERY
 * listing, filter/search/paginate it, approve/reject/re-run-AI individually or as a
 * batch, and edit a listing's details (via the existing PUT /api/listings/:id, which
 * already allows admin as well as the owner).
 *
 * EVERY route is admin-only (guard applied inside, mounted BEFORE the blanket
 * /api/admin router — same nested-admin-route pattern as routes/moderation.js):
 *   app.use("/api/admin/listings", require("./routes/adminListings"))
 *
 *   GET  /?status=&verification=&category=&q=&dateFrom=&dateTo=&page=&limit=
 *                                   → paginated { items, total, page, totalPages }
 *   GET  /:id                      → single listing detail (admin view)
 *   POST /:id/approve              → manual approval → listing goes live
 *   POST /:id/reject               → manual rejection → listing stays off the site
 *   POST /:id/reverify             → re-run the AI check (e.g. after a seller edit)
 *   POST /bulk/approve             → { ids: string[] }              → approve many
 *   POST /bulk/reject              → { ids: string[], reason? }     → reject many
 *   POST /bulk/reverify            → { ids: string[] }              → AI-check many
 */

const express = require("express");
const router = express.Router();
const directory = require("../modules/directory");
const identity = require("../modules/identity");
const { authGuard, requireRole } = require("../middleware/authGuard");
const { verifyListing } = require("../lib/listingVerification");

router.use(authGuard, requireRole("admin"));

// Approve/reject are cheap local writes; reverify shells out to the `claude` CLI
// (max 2 concurrent, ~3-15s each — see lib/claudeCli.js), so it's capped much lower
// to keep one bulk request from running for minutes.
const BULK_MAX = 200;
const BULK_AI_MAX = 25;

function summarize(listing, byId) {
  const who = byId.get(listing.sellerId);
  return {
    id: listing.id,
    type: listing.type,
    title: listing.title,
    slug: listing.slug,
    status: listing.status,
    sellerId: listing.sellerId,
    sellerCompany: (who && who.company) || listing.sellerId,
    categoryId: listing.categoryId || null,
    category: listing.legacyCategory || (Array.isArray(listing.categoryPath) ? listing.categoryPath.join(" > ") : "") || null,
    price: listing.product ? listing.product.price : null,
    media: Array.isArray(listing.media) ? listing.media : [],
    verification: listing.verification || null,
    createdAt: listing.createdAt,
  };
}

async function approveOne(listing, adminId) {
  const verification = {
    ...(listing.verification || {}),
    status: "admin_approved",
    reviewedBy: adminId,
    reviewedAt: new Date().toISOString(),
  };
  return directory.listingsRepo.update(listing.id, { status: "active", verification });
}

async function rejectOne(listing, adminId, reason) {
  const verification = {
    ...(listing.verification || {}),
    status: "rejected",
    reviewedBy: adminId,
    reviewedAt: new Date().toISOString(),
    rejectionReason: reason || null,
  };
  return directory.listingsRepo.update(listing.id, { status: "rejected", verification });
}

async function reverifyOne(listing) {
  const result = await verifyListing(listing);
  const verification = {
    status: result.status,
    score: result.score,
    aiRan: result.aiRan,
    deterministicChecks: result.deterministic.checks,
    ai: result.ai,
    summary: result.summary,
    createdAt: (listing.verification && listing.verification.createdAt) || result.checkedAt,
    reviewedBy: null,
    reviewedAt: null,
  };
  const status = result.status === "auto_approved" ? "active" : "pending";
  return directory.listingsRepo.update(listing.id, { status, verification });
}

/** Normalize a request's `ids` body field into a deduped array of strings, capped at `max`. */
function idsFromBody(body, max) {
  const raw = Array.isArray(body && body.ids) ? body.ids : [];
  const ids = Array.from(new Set(raw.filter((id) => typeof id === "string" && id.trim())));
  return ids.slice(0, max);
}

// GET /?status=active|pending|rejected|inactive|sold|all
//     &verification=auto_approved|needs_review|admin_approved|rejected|unverified|all
//     &category=<categoryId>&q=<search text>&dateFrom=<ISO date>&dateTo=<ISO date>
//     &page=1&limit=20
router.get("/", async (req, res, next) => {
  try {
    const statusFilter = req.query.status;
    const verificationFilter = req.query.verification;
    const categoryFilter = req.query.category ? String(req.query.category) : null;
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : "";
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const listings = await directory.listingsRepo.all();

    let rows = listings;
    if (statusFilter && statusFilter !== "all") {
      rows = rows.filter((l) => l.status === statusFilter);
    }
    if (verificationFilter && verificationFilter !== "all") {
      rows =
        verificationFilter === "unverified"
          ? rows.filter((l) => !l.verification)
          : rows.filter((l) => (l.verification && l.verification.status) === verificationFilter);
    }
    if (categoryFilter) {
      rows = rows.filter((l) => l.categoryId === categoryFilter);
    }
    if (dateFrom) {
      const fromMs = Date.parse(dateFrom);
      if (!Number.isNaN(fromMs)) rows = rows.filter((l) => Date.parse(l.createdAt || "") >= fromMs);
    }
    if (dateTo) {
      // Treat dateTo as inclusive of the whole day when given a bare date (no time part).
      const toMs = Date.parse(dateTo) + (/^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? 24 * 60 * 60 * 1000 - 1 : 0);
      if (!Number.isNaN(toMs)) rows = rows.filter((l) => Date.parse(l.createdAt || "") <= toMs);
    }

    // Company names only for the filtered rows' sellers (one indexed query) —
    // not a `store.all("users.json")` hydrate of every user (Phase 5e).
    const byId = await identity.getSellerCompanyNames(rows.map((l) => l.sellerId));

    let data = rows
      .map((l) => summarize(l, byId))
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    if (q) {
      data = data.filter(
        (r) => r.title.toLowerCase().includes(q) || r.sellerCompany.toLowerCase().includes(q)
      );
    }

    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = data.slice(start, start + limit);

    return res.json({ success: true, data: { items, total, page, totalPages } });
  } catch (err) {
    next(err);
  }
});

// GET /:id — full listing (admin detail/edit view).
router.get("/:id", async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });
    const byId = await identity.getSellerCompanyNames([listing.sellerId]);
    const who = byId.get(listing.sellerId);
    return res.json({
      success: true,
      data: { ...listing, sellerCompany: (who && who.company) || listing.sellerId },
    });
  } catch (err) {
    next(err);
  }
});

// ---- bulk routes MUST be registered before /:id/* below — otherwise Express
// matches e.g. POST /bulk/approve against POST /:id/approve first (id="bulk"). ----

// POST /bulk/approve — { ids: string[] } → approve up to BULK_MAX listings at once.
// Used for the "verify older products directly" checkbox flow.
router.post("/bulk/approve", async (req, res, next) => {
  try {
    const ids = idsFromBody(req.body, BULK_MAX);
    if (ids.length === 0) return res.status(400).json({ success: false, error: "ids is required" });

    const results = [];
    const errors = [];
    for (const id of ids) {
      const listing = await directory.listingsRepo.getById(id);
      if (!listing) {
        errors.push({ id, message: "Not found" });
        continue;
      }
      results.push(await approveOne(listing, req.user.id));
    }
    return res.json({ success: true, data: { approved: results.length, errors } });
  } catch (err) {
    next(err);
  }
});

// POST /bulk/reject — { ids: string[], reason? } → reject up to BULK_MAX listings at once.
router.post("/bulk/reject", async (req, res, next) => {
  try {
    const ids = idsFromBody(req.body, BULK_MAX);
    if (ids.length === 0) return res.status(400).json({ success: false, error: "ids is required" });
    const reason =
      req.body && typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : null;

    const results = [];
    const errors = [];
    for (const id of ids) {
      const listing = await directory.listingsRepo.getById(id);
      if (!listing) {
        errors.push({ id, message: "Not found" });
        continue;
      }
      results.push(await rejectOne(listing, req.user.id, reason));
    }
    return res.json({ success: true, data: { rejected: results.length, errors } });
  } catch (err) {
    next(err);
  }
});

// POST /bulk/reverify — { ids: string[] } → run the AI check on up to BULK_AI_MAX
// listings at once (e.g. a batch of pre-AI-verification "unverified" listings).
// Runs sequentially per listing but each call internally shares the `claude` CLI's
// own 2-concurrent semaphore (lib/claudeCli.js), so this stays bounded either way.
router.post("/bulk/reverify", async (req, res, next) => {
  try {
    const ids = idsFromBody(req.body, BULK_AI_MAX);
    if (ids.length === 0) return res.status(400).json({ success: false, error: "ids is required" });
    if (Array.isArray(req.body?.ids) && req.body.ids.length > BULK_AI_MAX) {
      return res.status(400).json({
        success: false,
        error: `AI re-check is limited to ${BULK_AI_MAX} listings per request — select fewer and try again.`,
      });
    }

    const results = [];
    const errors = [];
    for (const id of ids) {
      const listing = await directory.listingsRepo.getById(id);
      if (!listing) {
        errors.push({ id, message: "Not found" });
        continue;
      }
      try {
        const updated = await reverifyOne(listing);
        results.push({ id, status: updated.status, verificationStatus: updated.verification?.status });
      } catch (err) {
        errors.push({ id, message: err.message || "Re-check failed" });
      }
    }
    return res.json({ success: true, data: { checked: results.length, results, errors } });
  } catch (err) {
    next(err);
  }
});

// POST /:id/approve — manual admin approval → listing goes live.
router.post("/:id/approve", async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });
    const updated = await approveOne(listing, req.user.id);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /:id/reject — manual admin rejection → listing stays off the site.
router.post("/:id/reject", async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });
    const reason =
      req.body && typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 500) : null;
    const updated = await rejectOne(listing, req.user.id, reason);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /:id/reverify — re-run the AI check (useful after an admin edits a listing
// via PUT /api/listings/:id, or to retry once the `claude` CLI comes back online).
router.post("/:id/reverify", async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, error: "Listing not found" });
    const updated = await reverifyOne(listing);
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
