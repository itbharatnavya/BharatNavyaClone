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
 * POST /:id/forward        — admin delivers/re-delivers it to one OR MANY chosen
 *                           sellers (body.sellerIds[] or legacy body.sellerId)
 *                           (creates a real lead + notification per seller, same
 *                           as automatic fan-out) — usable on ANY inquiry
 * POST /:id/dismiss        — admin reviewed an unmatched RFQ and chose not to
 *                           forward it
 *
 * Mounted at /api/admin/inquiries in index.js, BEFORE the blanket
 * app.use("/api/admin", require("./routes/admin")) line — same pattern as
 * adminCategories.js / moderation.js / adminListings.js.
 */

const express = require("express");
const router = express.Router();
const { repoForCollection } = require("../../_shared");
const identity = require("../../identity");
const { appendLead, notifySellerOfLead, attachSellerDeliveries, readLedger } = require("../../../lib/leads");
const { authGuard, requireRole } = require("../../../middleware/authGuard");

const inquiriesRepo = repoForCollection("inquiries.json");

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

    const [allInquiries, allLeads] = await Promise.all([
      inquiriesRepo.findMany({}),
      readLedger(),
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
    const pageSlice = list.slice(start, start + limit);
    // Only the sellers referenced by THIS page's leads are needed for the minis.
    const pageSellerIds = pageSlice.flatMap((i) =>
      (leadsByInquiry.get(i.id) || []).map((l) => l.sellerId)
    );
    const pageUsers = await identity.hydrateUsersByIds(pageSellerIds);
    const items = attachSellerDeliveries(pageSlice, allLeads, pageUsers);

    return res.json({ success: true, data: { items, total, page, totalPages, summary } });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------ POST /:id/forward */
// body: { sellerIds: string[], listingId? }  (legacy: { sellerId } — a single id)
// Admin picks one or more sellers to deliver this RFQ to. Works on ANY inquiry
// (matched or unmatched) — used from both the Unmatched RFQs queue and the
// general RFQ Log's "add sellers" action.
//
// Partial success is normal (an admin bulk-assigns a set, some of whom already
// had the RFQ from the auto fan-out), so this never 409s on a duplicate: it
// skips the ones that already have a lead and reports them in `alreadyHad`.
// 400 only when the request names no seller at all.
router.post("/:id/forward", async (req, res, next) => {
  try {
    const inquiry = await inquiriesRepo.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }

    const body = req.body || {};
    const raw = Array.isArray(body.sellerIds)
      ? body.sellerIds
      : body.sellerId
      ? [body.sellerId]
      : [];
    const sellerIds = [
      ...new Set(raw.filter((s) => typeof s === "string" && s.trim())),
    ];
    if (sellerIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "sellerIds is required" });
    }
    const listingId = body.listingId || null;

    // Validate every id is a real seller before writing anything.
    const sellerSet = new Set(await identity.filterSellerIds(sellerIds));
    const unknown = sellerIds.filter((id) => !sellerSet.has(id));
    if (unknown.length) {
      return res.status(400).json({
        success: false,
        error: `Unknown seller id(s): ${unknown.join(", ")}`,
      });
    }

    // Don't double-deliver: a seller may already have a lead for this RFQ from
    // the automatic fan-out or an earlier manual forward.
    const existingLeads = await readLedger();
    const hasLead = new Set(
      existingLeads
        .filter((l) => l.inquiryId === inquiry.id)
        .map((l) => l.sellerId)
    );

    const added = [];
    const alreadyHad = [];
    for (const sellerId of sellerIds) {
      if (hasLead.has(sellerId)) {
        alreadyHad.push(sellerId);
        continue;
      }
      await appendLead({
        sellerId,
        buyerId: inquiry.buyerId || null,
        inquiryId: inquiry.id,
        listingId,
      });
      await notifySellerOfLead(sellerId, inquiry);
      added.push(sellerId);
    }

    let updated = inquiry;
    if (added.length > 0) {
      updated = await inquiriesRepo.updateById(inquiry.id, {
        unmatched: false,
        adminStatus: "forwarded",
        decidedBy: req.user.id,
        decidedAt: new Date().toISOString(),
      });
    }
    return res.json({ success: true, data: { added, alreadyHad, inquiry: updated } });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------ POST /:id/dismiss */
router.post("/:id/dismiss", async (req, res, next) => {
  try {
    const inquiry = await inquiriesRepo.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: "Inquiry not found" });
    }
    const updated = await inquiriesRepo.updateById(inquiry.id, {
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
