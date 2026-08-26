/**
 * adminInquiries.js — admin visibility over the RFQ fan-out.
 *
 * routes/inquiries.js's POST / flags a broad RFQ `unmatched: true` when
 * resolveTargets() finds no approved seller listing to fan out to (a novel
 * category/product, or a real category nobody stocks yet). Before this route
 * existed, such an RFQ was a silent dead end: the buyer got a "sent"
 * confirmation and no seller or admin ever saw it again.
 *
 * GET  /                  — full RFQ log: every inquiry, who sent it, which
 *                           seller(s) it was forwarded to, paginated + filterable.
 *                           The Unmatched RFQs queue is just this endpoint called
 *                           with status=unmatched&adminStatus=pending (see
 *                           components/admin/RfqLogTab.tsx's queueMode prop) —
 *                           there is no separate /unmatched route.
 * POST /:id/forward        — admin delivers/re-delivers it to a chosen seller
 *                           (creates a real lead + notification, same as
 *                           automatic fan-out) — usable on ANY inquiry
 * POST /:id/dismiss        — admin reviewed an unmatched RFQ and chose not to
 *                           forward it
 *
 * Mounted at /api/admin/inquiries in index.js, BEFORE the blanket
 * app.use("/api/admin", require("./routes/admin")) line — same pattern as
 * adminCategories.js / moderation.js / adminListings.js.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { appendLead, notifySellerOfLead, attachSellerDeliveries } = require("../lib/leads");
const { authGuard, requireRole } = require("../middleware/authGuard");

router.use(authGuard, requireRole("admin"));

/* ------------------------------------------------------------------ GET / --- */
// Full RFQ audit log — every inquiry (not just unmatched ones), each enriched
// with the seller(s) it was actually delivered to, plus their contact status.
// Server-paginated and filtered, same shape as GET /api/admin/users
// (routes/admin.js): { items, total, page, totalPages, summary }.
router.get("/", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : "";
    const status = req.query.status; // "all" | "matched" | "unmatched"
    const adminStatus = req.query.adminStatus; // "all" | "pending" | "forwarded" | "dismissed"
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : "";
    const from = typeof req.query.from === "string" ? req.query.from : "";
    const to = typeof req.query.to === "string" ? req.query.to : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [allInquiries, allLeads, allUsers] = await Promise.all([
      store.all("inquiries.json"),
      store.readJsonl("leads-ledger.jsonl"),
      store.all("users.json"),
    ]);

    // Batch: inquiryId -> its lead rows (one pass, not one query per inquiry) —
    // only needed here for the sellerId filter; attachSellerDeliveries below
    // builds its own copy for the final page slice.
    const leadsByInquiry = new Map();
    for (const l of allLeads) {
      if (!l.inquiryId) continue;
      const arr = leadsByInquiry.get(l.inquiryId) || [];
      arr.push(l);
      leadsByInquiry.set(l.inquiryId, arr);
    }

    const summary = {
      total: allInquiries.length,
      matched: allInquiries.filter((i) => !i.unmatched).length,
      unmatched: allInquiries.filter((i) => i.unmatched).length,
    };

    let list = allInquiries;
    if (q) {
      list = list.filter(
        (i) =>
          (i.buyerName || "").toLowerCase().includes(q) ||
          (i.buyerMobile || "").includes(q) ||
          (i.buyerEmail || "").toLowerCase().includes(q) ||
          (i.productName || "").toLowerCase().includes(q)
      );
    }
    if (categoryId) list = list.filter((i) => i.categoryId === categoryId);
    if (from) list = list.filter((i) => String(i.createdAt) >= from);
    if (to) list = list.filter((i) => String(i.createdAt) <= to + "T23:59:59.999Z");
    if (status === "matched") list = list.filter((i) => !i.unmatched);
    else if (status === "unmatched") list = list.filter((i) => i.unmatched);
    if (adminStatus === "pending") list = list.filter((i) => !i.adminStatus);
    else if (adminStatus === "forwarded" || adminStatus === "dismissed") {
      list = list.filter((i) => i.adminStatus === adminStatus);
    }
    if (sellerId) {
      list = list.filter((i) =>
        (leadsByInquiry.get(i.id) || []).some((l) => l.sellerId === sellerId)
      );
    }

    list = list.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = attachSellerDeliveries(list.slice(start, start + limit), allLeads, allUsers);

    return res.json({ success: true, data: { items, total, page, totalPages, summary } });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------ POST /:id/forward */
// body: { sellerId, listingId? } — admin picks a seller to deliver this RFQ to.
// Works on ANY inquiry (matched or unmatched) — used from both the Unmatched
// RFQs queue and the general RFQ Log's "add seller" action.
router.post("/:id/forward", async (req, res, next) => {
  try {
    const inquiry = await store.getById("inquiries.json", req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }
    const sellerId = req.body && req.body.sellerId;
    if (!sellerId) {
      return res.status(400).json({ success: false, error: "sellerId is required" });
    }
    const listingId = (req.body && req.body.listingId) || null;

    // Don't double-deliver: this seller may already have a lead for this RFQ,
    // either from the automatic fan-out or an earlier manual forward.
    const existingLeads = await store.readJsonl("leads-ledger.jsonl");
    const alreadyHasLead = existingLeads.some(
      (l) => l.inquiryId === inquiry.id && l.sellerId === sellerId
    );
    if (alreadyHasLead) {
      return res.status(409).json({
        success: false,
        error: "This seller already has this RFQ as a lead.",
      });
    }

    await appendLead({
      sellerId,
      buyerId: inquiry.buyerId || null,
      inquiryId: inquiry.id,
      listingId,
    });
    await notifySellerOfLead(sellerId, inquiry);

    const updated = await store.update("inquiries.json", inquiry.id, {
      unmatched: false,
      adminStatus: "forwarded",
      decidedBy: req.user.id,
      decidedAt: new Date().toISOString(),
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------ POST /:id/dismiss */
router.post("/:id/dismiss", async (req, res, next) => {
  try {
    const inquiry = await store.getById("inquiries.json", req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }
    const updated = await store.update("inquiries.json", inquiry.id, {
      unmatched: false,
      adminStatus: "dismissed",
      decidedBy: req.user.id,
      decidedAt: new Date().toISOString(),
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
