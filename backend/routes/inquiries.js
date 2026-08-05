/**
 * inquiries.js — buyer inquiries / RFQ with lead fan-out (DESIGN.md §3.4, BUILD-SPEC).
 *
 * Two contact economies:
 *   - A specific-listing inquiry (listingId given) attaches to that one seller.
 *   - A broad inquiry (category-level or service RFQ) FANS OUT to up to 6 matching
 *     approved sellers — each delivery is a Lead row in the append-only ledger.
 *
 * Every delivered inquiry produces a Lead in leads-ledger.jsonl (leadType "rfq").
 * All persistence goes through lib/store.js.
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const notify = require("../lib/notify");
const { authGuard, optionalAuth } = require("../middleware/authGuard");

const MAX_FANOUT = 6;

/** Coerce a loose value to a finite Number, or null when absent/invalid. */
function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Is this user an admin? (roles array may be absent on legacy records.) */
function isAdmin(user) {
  return !!user && Array.isArray(user.roles) && user.roles.includes("admin");
}

/**
 * Flat seller "mini" resolved from a users.json record — the same shape
 * /api/listings denormalizes onto a listing card:
 *   { companyName, slug, city, rating, isVerified }
 */
function sellerMini(user) {
  const sp = (user && user.sellerProfile) || {};
  return {
    companyName: sp.companyName || (user && user.name) || null,
    slug: sp.slug || null,
    city: (sp.location && sp.location.city) || (user && user.city) || null,
    rating: sp.rating ?? 0,
    isVerified: !!sp.isVerified,
  };
}

/** Enrich a list of quotes with their resolved seller mini (users loaded once). */
function enrichQuotes(quotes, users) {
  const byId = new Map(users.map((u) => [u.id, u]));
  return quotes.map((q) => ({ ...q, seller: sellerMini(byId.get(q.sellerId)) }));
}

/** The category signal the buyer gave us, if any (accepts a few field names). */
function categoryTerm(body) {
  return String(body.categoryId || body.category || body.legacyCategory || "")
    .trim()
    .toLowerCase();
}

/** Append one Lead row for a (seller, listing) delivery of an inquiry. */
async function appendLead({ sellerId, buyerId, inquiryId, listingId }) {
  const lead = {
    leadId: await store.nextId("lead"),
    sellerId,
    buyerId: buyerId || null,
    inquiryId,
    listingId: listingId || null,
    leadType: "rfq",
    deliveredDate: new Date().toISOString(),
    consumedFromQuota: true,
    chargeable: false,
    billingStatus: "free_quota",
    status: "new",
  };
  await store.appendJsonl("leads-ledger.jsonl", lead);
  return lead;
}

/**
 * Alert a seller that a new lead was delivered to them, reusing lib/notify's
 * createNotification (type "new_lead" — the type NotificationBell already renders).
 * The notification surfaces in GET /api/notifications (bell + dashboard).
 *
 * Best-effort: wrapped so a notify failure NEVER breaks the inquiry POST, and
 * skipped when a seller would be notified about their own inquiry.
 */
async function notifySellerOfLead(sellerId, inquiry) {
  if (!sellerId) return;
  if (inquiry.buyerId && inquiry.buyerId === sellerId) return; // don't self-notify
  try {
    const productName = inquiry.productName || inquiry.categoryId || "your products";
    const buyerName = inquiry.buyerName || "A buyer";
    await notify.createNotification(sellerId, "new_lead", {
      name: buyerName,
      buyerId: inquiry.buyerId || null,
      inquiryId: inquiry.id,
      productName,
      message: `New lead — ${buyerName} is looking for ${productName}. Respond with a quote.`,
      link: "/dashboard?tab=leads",
    });
  } catch (err) {
    // Notifications are non-critical: log and move on, never fail the inquiry.
    console.error("notifySellerOfLead failed:", err && err.message);
  }
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
    const listing = await store.getById("listings.json", body.listingId);
    if (listing) {
      inquiry.sellerId = listing.sellerId;
      return [{ sellerId: listing.sellerId, listingId: listing.id }];
    }
    // Unknown listingId: fall through to broad matching.
  }

  const [listings, users] = await Promise.all([
    store.all("listings.json"),
    store.all("users.json"),
  ]);

  const approvedSellerIds = new Set(
    users
      .filter((u) => u.sellerProfile && u.sellerProfile.status === "approved")
      .map((u) => u.id)
  );

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
router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const id = await store.nextId("inq");

    // An authenticated poster is stamped as the buyer (so the RFQ shows up in their
    // "My RFQs" inbox and quote-back is scoped to them). Guests can still post.
    const buyerId = (req.user && req.user.id) || body.buyerId || null;

    const inquiry = {
      id,
      buyerId,
      buyerName: body.buyerName || "",
      buyerMobile: body.buyerMobile || "",
      buyerEmail: body.buyerEmail || "",
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
    await store.insert("inquiries.json", inquiry);

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
// Authenticated: leads delivered to the caller's seller profile + direct inquiries.
router.get("/", authGuard, async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const allLeads = await store.readJsonl("leads-ledger.jsonl");
    const leads = allLeads.filter((l) => l.sellerId === sellerId);

    const inquiryIds = new Set(leads.map((l) => l.inquiryId));
    const allInquiries = await store.all("inquiries.json");
    const inquiries = allInquiries.filter(
      (i) => i.sellerId === sellerId || inquiryIds.has(i.id)
    );

    return res.json({ success: true, data: { leads, inquiries } });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------- GET /api/inquiries/mine ---------- */
// The authenticated buyer's own RFQs (newest first), each with its quoteCount and
// an enriched quotes[] array. Powers the buyer "My RFQs" comparison inbox.
router.get("/mine", authGuard, async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const [allInquiries, allQuotes, users] = await Promise.all([
      store.all("inquiries.json"),
      store.all("quotes.json"),
      store.all("users.json"),
    ]);

    const mine = allInquiries
      .filter((i) => i.buyerId === buyerId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const quotesByInquiry = new Map();
    for (const q of allQuotes) {
      const arr = quotesByInquiry.get(q.inquiryId) || [];
      arr.push(q);
      quotesByInquiry.set(q.inquiryId, arr);
    }

    const data = mine.map((inq) => {
      const quotes = enrichQuotes(quotesByInquiry.get(inq.id) || [], users);
      return { ...inq, quotes, quoteCount: quotes.length };
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ POST /api/inquiries/:id/quote ------------- */
// A seller submits (or revises) a quote against an inquiry they RECEIVED a lead for.
// One quote per (seller, inquiry): an existing quote is updated in place.
router.post("/:id/quote", authGuard, async (req, res, next) => {
  try {
    const inquiryId = req.params.id;
    const sellerId = req.user.id;
    const body = req.body || {};

    // Authorization: the seller must have been delivered a lead for this inquiry.
    const allLeads = await store.readJsonl("leads-ledger.jsonl");
    const hasLead = allLeads.some(
      (l) => l.sellerId === sellerId && l.inquiryId === inquiryId
    );
    if (!hasLead) {
      return res.status(403).json({
        success: false,
        error: "You can only quote on inquiries delivered to you.",
      });
    }

    const price = num(body.price);
    if (price === null || price <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "A valid price is required." });
    }

    const fields = {
      inquiryId,
      sellerId,
      price,
      unit: body.unit || "",
      moq: num(body.moq),
      deliveryDays: num(body.deliveryDays),
      note: body.note || "",
      validUntil: body.validUntil || null,
      status: "sent",
    };

    // One quote per (seller, inquiry) — update the existing one if present.
    const existing = await store.findOne(
      "quotes.json",
      (q) => q.inquiryId === inquiryId && q.sellerId === sellerId
    );
    if (existing) {
      const updated = await store.update("quotes.json", existing.id, fields);
      return res.json({ success: true, data: updated });
    }

    const quote = {
      id: await store.nextId("q"),
      ...fields,
      createdAt: new Date().toISOString(),
    };
    const inserted = await store.insert("quotes.json", quote);
    return res.json({ success: true, data: inserted });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ GET /api/inquiries/:id/quotes ------------- */
// The quotes for an inquiry — visible ONLY to that inquiry's buyer or an admin.
// Each quote is enriched with a flat seller mini.
router.get("/:id/quotes", authGuard, async (req, res, next) => {
  try {
    const inquiryId = req.params.id;
    const inquiry = await store.getById("inquiries.json", inquiryId);
    if (!inquiry) {
      return res
        .status(404)
        .json({ success: false, error: "Inquiry not found" });
    }
    if (inquiry.buyerId !== req.user.id && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const [allQuotes, users] = await Promise.all([
      store.all("quotes.json"),
      store.all("users.json"),
    ]);
    const quotes = enrichQuotes(
      allQuotes.filter((q) => q.inquiryId === inquiryId),
      users
    );

    return res.json({ success: true, data: quotes });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- PUT /api/inquiries/:id ---- */
// Compatibility: update an inquiry's stage (preserved from the legacy route).
router.put("/:id", authGuard, async (req, res, next) => {
  try {
    const patch = {};
    if (req.body && req.body.stage !== undefined) patch.stage = req.body.stage;
    const updated = await store.update("inquiries.json", req.params.id, patch);
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, error: "Inquiry not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
