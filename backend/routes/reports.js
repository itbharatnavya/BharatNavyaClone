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

const store = require("../lib/store");
const { authGuard } = require("../middleware/authGuard");

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

    const report = {
      id: await store.nextId("rpt"),
      listingId: b.listingId,
      reporterId: req.user.id,
      reason: String(b.reason).trim(),
      details: b.details || "",
      status: "open",
      createdAt: new Date().toISOString(),
    };
    await store.insert("reports.json", report);

    return res.json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
