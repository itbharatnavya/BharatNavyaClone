/**
 * routes/reports.js — user-submitted listing reports (DESIGN §12 reconciliation).
 *
 * Any authenticated user can flag a listing. A report is created "open" and moved to
 * "resolved" / "dismissed" from the admin moderation queue (see routes/admin.js).
 * The reporter (reporterId) comes from the JWT, never the client body.
 *
 * NOTE FOR INTEGRATOR: this router must be mounted by index.js with
 *   app.use("/api/reports", require("./routes/reports"));
 */

const express = require("express");
const router = express.Router();

const { repoForCollection } = require("../modules/_shared");
const { authGuard } = require("../middleware/authGuard");

// Phase 7: reports.json is a flat collection — its one writer graduates onto the
// criteria-grammar repo. (routes/admin.js still store.update()s it from the
// moderation queue, so the collection isn't fully graduated yet.)
const reportsRepo = repoForCollection("reports.json");

// POST /api/reports — flag a listing (body: { listingId, reason, details? }).
router.post("/", authGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.listingId || String(b.listingId).trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "listingId is required" });
    }
    if (!b.reason || String(b.reason).trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "reason is required" });
    }

    const created = await reportsRepo.insert(
      {
        listingId: b.listingId,
        reporterId: req.user.id,
        reason: String(b.reason).trim(),
        details: b.details || "",
        status: "open",
        createdAt: new Date().toISOString(),
      },
      "rpt"
    );
    // Keep the exact pre-Phase-7 response shape (the repo row also carries the
    // null resolvedBy/resolvedAt columns; the old handler didn't echo those).
    const report = {
      id: created.id,
      listingId: created.listingId,
      reporterId: created.reporterId,
      reason: created.reason,
      details: created.details,
      status: created.status,
      createdAt: created.createdAt,
    };

    return res.json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
