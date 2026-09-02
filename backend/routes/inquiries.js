/**
 * inquiries.js — buyer inquiries / RFQ with lead fan-out (DESIGN.md §3.4, BUILD-SPEC).
 *
 * Two contact economies:
 *   - A specific-listing inquiry (listingId given) attaches to that one seller.
 *   - A broad inquiry (category-level or service RFQ) FANS OUT to up to 6 matching
 *     approved sellers — each delivery is a Lead row in the append-only ledger.
 *
 * Every delivered inquiry produces a Lead in leads-ledger.jsonl (leadType "rfq").
 * A seller reaches the buyer directly (Call/WhatsApp — the "Connect" action,
 * POST /leads/:leadId/contact) rather than filling in a quote; there is no
 * quote-back step in this flow. Persistence: `inquiries.json` via a repository;
 * the leads-ledger and `listings` / `users` reads via the leads / directory /
 * identity module ports (BACKEND-AUDIT.md Phase 7 — no lib/store here).
 */

const express = require("express");
const router = express.Router();
const { repoForCollection, nextId } = require("../modules/_shared");
const directory = require("../modules/directory");
const identity = require("../modules/identity");
const {
  appendLead,
  notifySellerOfLead,
  attachSellerDeliveries,
  readLedger,
  updateLead,
} = require("../lib/leads");
const { validate, schemas } = require("../lib/validate");
const { authGuard, optionalAuth } = require("../middleware/authGuard");

const inquiriesRepo = repoForCollection("inquiries.json");

const MAX_FANOUT = 6;

/** The category signal the buyer gave us, if any (accepts a few field names). */
function categoryTerm(body) {
  return String(body.categoryId || body.category || body.legacyCategory || "")
    .trim()
    .toLowerCase();
}

/**
 * Resolve the set of {sellerId, listingId} deliveries for an inquiry.
 *   - specific listing -> the single owning seller
 *   - broad            -> up to MAX_FANOUT distinct approved sellers whose active
 *                         listings match by category / legacyCategory (keyword
 *                         fallback on productName when no category is supplied)
 */
async function resolveTargets(body, inquiry) {
  // Specific-listing inquiry: attach that listing's seller.
  if (body.listingId) {
    const listing = await directory.listingOwner(body.listingId);
    if (listing) {
      inquiry.sellerId = listing.sellerId;
      return [{ sellerId: listing.sellerId, listingId: listing.id }];
    }
    // Unknown listingId: fall through to broad matching.
  }

  const [listings, approvedIds] = await Promise.all([
    directory.rfqMatchListingsLean(),
    identity.getApprovedSellerIds(),
  ]);

  const approvedSellerIds = new Set(approvedIds);

  const term = categoryTerm(body);
  const tokens = String(body.productName || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const matches = (l) => {
    if (l.status !== "active") return false;
    if (!approvedSellerIds.has(l.sellerId)) return false;
    if (term) {
      const cat = String(l.categoryId || "").toLowerCase();
      const legacy = String(l.legacyCategory || "").toLowerCase();
      return cat === term || legacy === term || legacy.includes(term);
    }
    if (!tokens.length) return false;
    const hay = [l.title, l.legacyCategory, ...(l.keywords || [])]
      .join(" ")
      .toLowerCase();
    return tokens.some((t) => hay.includes(t));
  };

  // One delivery per seller (first matching listing), up to MAX_FANOUT.
  const bySeller = new Map();
  for (const l of listings) {
    if (!matches(l)) continue;
    if (!bySeller.has(l.sellerId)) bySeller.set(l.sellerId, l.id);
    if (bySeller.size >= MAX_FANOUT) break;
  }
  return [...bySeller.entries()].map(([sellerId, listingId]) => ({
    sellerId,
    listingId,
  }));
}

/* -------------------------------------------------- POST /api/inquiries ---- */
// Create an inquiry and fan it out to matching sellers as leads.
router.post("/", optionalAuth, validate(schemas.postInquiry), async (req, res, next) => {
  try {
    const body = req.body || {};
    const id = await nextId("inq");

    // The buyer identity is ONLY ever taken from the verified req.user — never
    // from the request body. optionalAuth means this route is reachable by an
    // unauthenticated caller (guests can still post), so trusting a client-
    // supplied buyerId would let anyone attribute a forged RFQ to any account.
    const buyerId = req.user ? req.user.id : null;

    // Same reasoning for contact fields: once logged in, the account's own
    // name/mobile/email are used, not whatever the client happened to send.
    // Only a genuine guest (no req.user) falls back to the body's values.
    const inquiry = {
      id,
      buyerId,
      buyerName: (req.user ? req.user.name : body.buyerName) || "",
      buyerMobile: (req.user ? req.user.mobile : body.buyerMobile) || "",
      buyerEmail: (req.user ? req.user.email : body.buyerEmail) || "",
      productName: body.productName || "",
      quantity: body.quantity || "",
      message: body.message || "",
      listingId: body.listingId || null,
      categoryId: body.categoryId || null,
      intent: body.intent || null,
      sellerId: null, // set below if it targets a specific listing
      createdAt: new Date().toISOString(),
      stage: "New",
    };

    const targets = await resolveTargets(body, inquiry);
    // No seller matched at all (novel category/product, or a real category
    // nobody stocks yet) — flag it so the admin "Unmatched RFQs" queue
    // (routes/adminInquiries.js) can pick it up and manually forward it,
    // instead of it silently vanishing with a false "sent" confirmation.
    inquiry.unmatched = targets.length === 0;
    await inquiriesRepo.insert(inquiry, "inq");

    const leads = [];
    for (const t of targets) {
      leads.push(
        await appendLead({
          sellerId: t.sellerId,
          buyerId,
          inquiryId: inquiry.id,
          listingId: t.listingId,
        })
      );
      // One lead alert per seller per delivered lead (non-fatal on failure).
      await notifySellerOfLead(t.sellerId, inquiry);
    }

    return res.json({
      success: true,
      data: { inquiry, leads, leadsCreated: leads.length },
    });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------------- GET /api/inquiries ---- */
// Authenticated: the caller's own delivered RFQs, one row per lead (a seller
// gets at most one delivery per inquiry), server-paginated + filterable —
// same envelope shape as GET /api/admin/inquiries. Powers the seller
// dashboard's "RFQs" table (components/dashboard/LeadsTab.tsx).
router.get("/", authGuard, async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const status = req.query.status; // "all" | "contacted" | "not_contacted"
    const from = typeof req.query.from === "string" ? req.query.from : "";
    const to = typeof req.query.to === "string" ? req.query.to : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [allLeads, allInquiries] = await Promise.all([
      readLedger(),
      inquiriesRepo.findMany({}),
    ]);
    const inquiriesById = new Map(allInquiries.map((i) => [i.id, i]));

    let rows = allLeads
      .filter((l) => l.sellerId === sellerId)
      .map((l) => {
        const inq = inquiriesById.get(l.inquiryId) || {};
        return {
          ...inq,
          leadId: l.leadId,
          deliveredDate: l.deliveredDate,
          contactedAt: l.contactedAt || null,
          contactedVia: l.contactedVia || null,
        };
      });

    const summary = {
      total: rows.length,
      contacted: rows.filter((r) => r.contactedAt).length,
      notContacted: rows.filter((r) => !r.contactedAt).length,
    };

    if (q) {
      rows = rows.filter(
        (r) =>
          (r.buyerName || "").toLowerCase().includes(q) ||
          (r.buyerMobile || "").includes(q) ||
          (r.productName || "").toLowerCase().includes(q)
      );
    }
    if (status === "contacted") rows = rows.filter((r) => r.contactedAt);
    else if (status === "not_contacted") rows = rows.filter((r) => !r.contactedAt);
    if (from) rows = rows.filter((r) => String(r.deliveredDate) >= from);
    if (to) rows = rows.filter((r) => String(r.deliveredDate) <= to + "T23:59:59.999Z");

    rows = rows.slice().sort((a, b) => String(b.deliveredDate).localeCompare(String(a.deliveredDate)));

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);

    return res.json({ success: true, data: { items, total, page, totalPages, summary } });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------- GET /api/inquiries/mine ---------- */
// The authenticated buyer's own RFQs (newest first), each with the seller(s)
// it was delivered to and their contact status. Powers "My RFQs".
router.get("/mine", authGuard, async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const [mineRaw, allLeads] = await Promise.all([
      inquiriesRepo.findMany({ where: { buyerId } }),
      readLedger(),
    ]);

    const mine = mineRaw
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    // Only the sellers this buyer's RFQs were actually delivered to.
    const mineIds = new Set(mine.map((i) => i.id));
    const sellerIds = allLeads
      .filter((l) => mineIds.has(l.inquiryId))
      .map((l) => l.sellerId);
    const users = await identity.hydrateUsersByIds(sellerIds);

    const data = attachSellerDeliveries(mine, allLeads, users);

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------- POST /api/inquiries/leads/:leadId/contact */
// The RFQ "Connect" action — a seller records that they called/WhatsApp'd the
// buyer directly for this delivered RFQ (replacing the old quote-back step).
// Called alongside opening the tel:/wa.me link client-side, not instead of it.
router.post("/leads/:leadId/contact", authGuard, async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const via = req.body && req.body.via;
    if (via !== "call" && via !== "whatsapp") {
      return res
        .status(400)
        .json({ success: false, error: 'via must be "call" or "whatsapp"' });
    }

    const allLeads = await readLedger();
    const lead = allLeads.find((l) => l.leadId === leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found" });
    }
    if (lead.sellerId !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, error: "You can only update your own leads." });
    }

    const updated = await updateLead(leadId, {
      contactedAt: new Date().toISOString(),
      contactedVia: via,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
