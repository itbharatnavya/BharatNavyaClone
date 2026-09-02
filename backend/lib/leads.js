/**
 * leads.js — shared lead-delivery helpers.
 *
 * Extracted from routes/inquiries.js so routes/adminInquiries.js (manual
 * admin forward of an unmatched RFQ to a chosen seller) can create a lead the
 * same way the automatic fan-out does, without duplicating the logic.
 */

const store = require("./store");
const notify = require("./notify");
const logger = require("./logger");

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

/** The whole leads-ledger, as rows. The one read path for the append-only ledger —
 *  lets routes reach it without importing lib/store directly (BACKEND-AUDIT.md
 *  Phase 7). Same underlying mapper as `store.readJsonl("leads-ledger.jsonl")`. */
function readLedger() {
  return store.readJsonl("leads-ledger.jsonl");
}

/** Patch one lead row by leadId (the RFQ "Connect" contact-status fields —
 *  contactedAt / contactedVia). The one write path for the append-only ledger
 *  that routes reach through, so they don't import lib/store directly
 *  (BACKEND-AUDIT.md Phase 7). Same underlying op as store.updateLead. */
function updateLead(leadId, patch) {
  return store.updateLead(leadId, patch);
}

/**
 * Alert a seller that a new lead was delivered to them, reusing lib/notify's
 * createNotification (type "new_lead" — the type NotificationBell already renders).
 * The notification surfaces in GET /api/notifications (bell + dashboard).
 *
 * Best-effort: wrapped so a notify failure NEVER breaks the caller, and
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
      message: `New RFQ — ${buyerName} is looking for ${productName}. Reach out by call or WhatsApp.`,
      link: "/dashboard?tab=leads",
    });
  } catch (err) {
    // Notifications are non-critical: log and move on, never fail the caller.
    logger.error({ err }, "notifySellerOfLead failed");
  }
}

/**
 * Given a batch of inquiries plus the full leads-ledger and users collections
 * (each read once by the caller — no per-inquiry queries), attach a `sellers`
 * array to each inquiry: every seller it was actually delivered to, with
 * their contact-status (`contactedAt`/`contactedVia`, set via the RFQ
 * "Connect" action — POST /api/inquiries/leads/:leadId/contact). Used by the
 * buyer's "My RFQs" list and the admin RFQ Log — NOT by a seller's own list,
 * which only ever needs its own single delivery per inquiry (see routes/
 * inquiries.js's GET / for that flatter shape).
 */
function attachSellerDeliveries(inquiries, allLeads, allUsers) {
  const leadsByInquiry = new Map();
  for (const l of allLeads) {
    if (!l.inquiryId) continue;
    const arr = leadsByInquiry.get(l.inquiryId) || [];
    arr.push(l);
    leadsByInquiry.set(l.inquiryId, arr);
  }
  const usersById = new Map(allUsers.map((u) => [u.id, u]));

  return inquiries.map((inquiry) => {
    const leads = leadsByInquiry.get(inquiry.id) || [];
    const sellers = leads.map((l) => ({
      sellerId: l.sellerId,
      leadId: l.leadId,
      deliveredDate: l.deliveredDate,
      contactedAt: l.contactedAt || null,
      contactedVia: l.contactedVia || null,
      ...sellerMini(usersById.get(l.sellerId)),
    }));
    return { ...inquiry, sellers };
  });
}

module.exports = { appendLead, notifySellerOfLead, sellerMini, attachSellerDeliveries, readLedger, updateLead };
