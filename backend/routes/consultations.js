/**
 * consultations.js — the BOOKING flow for the "Consultations" product.
 *
 * A booking is a buyer's request to hire an EXPERT (a service-provider seller), optionally
 * against a specific PACKAGE (a service listing). Bookings persist to
 * consultation-bookings.json. Each booking also (best-effort) appends a Lead row to the
 * shared leads-ledger.jsonl — mirroring routes/inquiries.js — and notifies the expert, so
 * incoming consultation requests surface in the same seller inbox/bell as other leads.
 *
 *   POST /api/consultations/book      → create a booking (guests allowed via optionalAuth)
 *   GET  /api/consultations/bookings  → an expert's incoming requests (authGuard)
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const notify = require("../lib/notify");
const { authGuard, optionalAuth } = require("../middleware/authGuard");

const COLLECTION = "consultation-bookings.json";

/** True when a user record is an approved expert (bookable). */
function isApprovedExpert(user) {
  return !!(
    user &&
    user.sellerProfile &&
    user.sellerProfile.expert &&
    user.sellerProfile.status === "approved"
  );
}

/**
 * Resolve the target expert from an { expertSlug | expertId } body. Returns the user
 * record only if it's an approved expert, else null.
 */
async function resolveExpert(body) {
  const users = await store.all("users.json");
  let user = null;
  if (body.expertId) {
    user = users.find((u) => u.id === body.expertId) || null;
  }
  if (!user && body.expertSlug) {
    user = users.find((u) => u.sellerProfile && u.sellerProfile.slug === body.expertSlug) || null;
  }
  return isApprovedExpert(user) ? user : null;
}

/**
 * Append a Lead row for a consultation booking, mirroring inquiries.js's ledger shape
 * (leadType "consultation"). Best-effort: never let a ledger failure fail the booking.
 */
async function appendConsultationLead({ expertId, buyerId, bookingId }) {
  try {
    const lead = {
      leadId: await store.nextId("lead"),
      sellerId: expertId,
      buyerId: buyerId || null,
      bookingId,
      inquiryId: null,
      listingId: null,
      leadType: "consultation",
      deliveredDate: new Date().toISOString(),
      consumedFromQuota: true,
      chargeable: false,
      billingStatus: "free_quota",
      status: "new",
    };
    await store.appendJsonl("leads-ledger.jsonl", lead);
  } catch (err) {
    console.error("appendConsultationLead failed:", err && err.message);
  }
}

/* ----------------------------------------- POST /api/consultations/book ---- */
// Create a consultation booking. optionalAuth: an authenticated buyer is stamped as
// userId, but guests can book too.
router.post("/book", optionalAuth, async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const mobile = String(body.mobile || "").trim();

    if (!name || !mobile) {
      return res
        .status(400)
        .json({ success: false, error: "name and mobile are required" });
    }

    const expert = await resolveExpert(body);
    if (!expert) {
      return res
        .status(404)
        .json({ success: false, error: "Expert not found" });
    }

    // If a package was named, resolve its title (and verify it belongs to this expert).
    let packageTitle = null;
    if (body.packageId) {
      const listing = await store.getById("listings.json", body.packageId);
      if (listing && listing.sellerId === expert.id) {
        packageTitle = listing.title;
      }
    }

    const doc = {
      expertId: expert.id,
      expertSlug: expert.sellerProfile.slug || null,
      expertName: expert.sellerProfile.companyName || expert.name || null,
      packageId: body.packageId || null,
      packageTitle,
      name,
      mobile,
      email: body.email || null,
      preferredDate: body.preferredDate || null,
      preferredTime: body.preferredTime || null,
      mode: body.mode || null,
      message: body.message || "",
      status: "new",
      userId: (req.user && req.user.id) || null,
      createdAt: new Date().toISOString(),
    };

    const booking = await store.insert(COLLECTION, doc, "booking");

    // Best-effort fan-out to the seller's lead ledger + notification bell (non-fatal).
    await appendConsultationLead({
      expertId: expert.id,
      buyerId: booking.userId,
      bookingId: booking.id,
    });
    try {
      await notify.createNotification(expert.id, "consultation_request", {
        bookingId: booking.id,
        name: booking.name,
        packageTitle: booking.packageTitle,
        message: `New consultation request from ${booking.name}${
          booking.packageTitle ? ` for "${booking.packageTitle}"` : ""
        }.`,
        link: "/dashboard?tab=consultations",
      });
    } catch (err) {
      console.error("consultation notify failed:", err && err.message);
    }

    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------- GET /api/consultations/bookings ----- */
// An expert's incoming consultation requests (newest first).
router.get("/bookings", authGuard, async (req, res, next) => {
  try {
    const bookings = (await store.all(COLLECTION))
      .filter((b) => b.expertId === req.user.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
