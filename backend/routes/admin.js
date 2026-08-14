/**
 * admin.js — the Phase 3 admin panel API (DESIGN.md §8, BUILD-SPEC).
 *
 * The whole money layer is admin-controlled data (no payment gateway): sellers,
 * plans, ad slots/bookings, payment records (the entitlements backbone) and ranking
 * settings are all CRUD'd here.
 *
 * EVERY route is admin-only. The guard is applied inside the router (router.use)
 * so index.js can mount it plainly:  app.use("/api/admin", require("./routes/admin")).
 */

const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { authGuard, requireRole } = require("../middleware/authGuard");

// Auth + admin role for every endpoint below.
router.use(authGuard, requireRole("admin"));

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isSeller = (u) => u && u.sellerProfile;

/* =============================================================== analytics == */
router.get("/analytics", async (req, res, next) => {
  try {
    const [users, listings, inquiries] = await Promise.all([
      store.all("users.json"),
      store.all("listings.json"),
      store.all("inquiries.json"),
    ]);

    const sellers = users.filter(isSeller);
    const pendingSellers = sellers.filter((u) => u.sellerProfile.status === "pending").length;

    // Active paid sellers grouped by plan tier.
    const activePaidSellersByTier = { silver: 0, gold: 0 };
    const sellersByTier = { free: 0, silver: 0, gold: 0 };
    let activePaidSellers = 0;
    for (const u of sellers) {
      const sp = u.sellerProfile;
      const tier = sp.planTier || "free";
      if (sellersByTier[tier] === undefined) sellersByTier[tier] = 0;
      sellersByTier[tier] += 1;
      const paidActive = tier !== "free" && (sp.planStatus || "active") === "active";
      if (paidActive) {
        activePaidSellers += 1;
        if (activePaidSellersByTier[tier] === undefined) activePaidSellersByTier[tier] = 0;
        activePaidSellersByTier[tier] += 1;
      }
    }

    // Last 6 months of inquiry volume (oldest -> newest, incl. current month).
    const now = new Date();
    const monthlyInquiries = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = inquiries.filter((i) => {
        if (typeof i.createdAt !== "string") return false;
        const c = new Date(i.createdAt);
        return c.getFullYear() === year && c.getMonth() === month;
      }).length;
      monthlyInquiries.push({ month: MONTH_LABELS[month], year, count });
    }

    return res.json({
      success: true,
      data: {
        totals: {
          users: users.length,
          sellers: sellers.length,
          listings: listings.length,
          inquiries: inquiries.length,
          pendingSellers,
          activePaidSellers,
        },
        sellersByTier,
        activePaidSellersByTier,
        monthlyInquiries,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* =================================================================== users == */
// GET /users?type=all|user|seller&status=&planTier=&featured=&q=&page=&limit=
// Unified, paginated user directory. `type` splits accounts into plain users
// (no sellerProfile) vs sellers (sellerProfile present — a seller is still a
// normal user underneath, just with the seller block attached). `status`,
// `planTier` and `featured` (yes|no) all filter on sellerProfile fields and are
// ignored for plain users, which have none of these. Sensitive fields
// (passwordHash) are stripped.
function sanitizeUser(u) {
  const { passwordHash, ...rest } = u;
  return { ...rest, accountType: isSeller(u) ? "seller" : "user" };
}

router.get("/users", async (req, res, next) => {
  try {
    const type = req.query.type;
    const status = req.query.status;
    const planTier = req.query.planTier;
    const featured = req.query.featured;
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const all = await store.all("users.json");
    const summary = {
      total: all.length,
      users: all.filter((u) => !isSeller(u)).length,
      sellers: all.filter(isSeller).length,
    };

    let list = all;
    if (type === "seller") list = list.filter(isSeller);
    else if (type === "user") list = list.filter((u) => !isSeller(u));

    if (status && status !== "all") {
      list = list.filter((u) => isSeller(u) && u.sellerProfile.status === status);
    }

    if (planTier && planTier !== "all") {
      list = list.filter((u) => isSeller(u) && (u.sellerProfile.planTier || "free") === planTier);
    }

    if (featured === "yes" || featured === "no") {
      const want = featured === "yes";
      list = list.filter((u) => isSeller(u) && !!u.sellerProfile.isFeaturedSeller === want);
    }

    if (q) {
      list = list.filter((u) => {
        return (
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.mobile || "").toLowerCase().includes(q) ||
          (u.sellerProfile?.companyName || "").toLowerCase().includes(q)
        );
      });
    }

    list = list.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit).map(sanitizeUser);

    return res.json({ success: true, data: { items, total, page, totalPages, summary } });
  } catch (err) {
    next(err);
  }
});

/* ================================================================= sellers == */
// GET /sellers?status=approved|pending|rejected|suspended
router.get("/sellers", async (req, res, next) => {
  try {
    const status = req.query.status;
    let sellers = (await store.all("users.json")).filter(isSeller);
    if (status && status !== "all") {
      sellers = sellers.filter((u) => u.sellerProfile.status === status);
    }
    return res.json({ success: true, data: sellers });
  } catch (err) {
    next(err);
  }
});

const APPROVAL_STATUS = { approve: "approved", reject: "rejected", suspend: "suspended" };

// PUT /sellers/:id/approve | reject | suspend
router.put("/sellers/:id/:action", async (req, res, next) => {
  try {
    const status = APPROVAL_STATUS[req.params.action];
    if (!status) {
      return res.status(400).json({ success: false, error: "Invalid action" });
    }
    const user = await store.getById("users.json", req.params.id);
    if (!isSeller(user)) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }
    const sellerProfile = { ...user.sellerProfile, status };
    if (req.params.action === "approve") sellerProfile.isVerified = true;
    const updated = await store.update("users.json", user.id, { sellerProfile });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /sellers/:id/monetization — merge monetization fields into the seller profile.
const MONETIZATION_FIELDS = [
  "rankBoostScore",
  "priorityTier",
  "isFeaturedSeller",
  "featuredStartDate",
  "featuredEndDate",
  "planTier",
  "featuredCredits",
  "boostCategoryIds",
  "boostKeywords",
  "adminNotes",
];

router.put("/sellers/:id/monetization", async (req, res, next) => {
  try {
    const user = await store.getById("users.json", req.params.id);
    if (!isSeller(user)) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }
    const body = req.body || {};
    const sellerProfile = { ...user.sellerProfile };
    for (const f of MONETIZATION_FIELDS) {
      if (body[f] !== undefined) sellerProfile[f] = body[f];
    }
    const updated = await store.update("users.json", user.id, { sellerProfile });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* =================================================== subscription plans ===== */
router.get("/plans", async (req, res, next) => {
  try {
    return res.json({ success: true, data: await store.all("subscription-plans.json") });
  } catch (err) {
    next(err);
  }
});

router.post("/plans", async (req, res, next) => {
  try {
    const created = await store.insert("subscription-plans.json", { billingCycle: "monthly", ...(req.body || {}) }, "plan");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/plans/:id", async (req, res, next) => {
  try {
    const updated = await store.update("subscription-plans.json", req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ success: false, error: "Plan not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ============================================================== ad slots ===== */
router.get("/ad-slots", async (req, res, next) => {
  try {
    return res.json({ success: true, data: await store.all("ad-slots.json") });
  } catch (err) {
    next(err);
  }
});

router.post("/ad-slots", async (req, res, next) => {
  try {
    const created = await store.insert("ad-slots.json", { isActive: true, ...(req.body || {}) }, "slot");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/ad-slots/:id", async (req, res, next) => {
  try {
    const updated = await store.update("ad-slots.json", req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ success: false, error: "Ad slot not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ============================================================ ad bookings ===== */
router.get("/ad-bookings", async (req, res, next) => {
  try {
    return res.json({ success: true, data: await store.all("ad-bookings.json") });
  } catch (err) {
    next(err);
  }
});

// Normalise a booking body into the served shape (routes/ads.js reads
// placementType + categoryIds + creativeImageUrl/headline/targetUrl). Kept
// backward-compatible: legacy singular categoryId still accepted.
function normaliseBooking(body) {
  const categoryIds = Array.isArray(body.categoryIds)
    ? body.categoryIds.filter((s) => typeof s === "string" && s.trim() !== "")
    : body.categoryId
    ? [body.categoryId]
    : [];
  return {
    placementType: body.placementType || null,
    adSlotId: body.adSlotId || body.slotId || body.placementType || null,
    slotId: body.slotId || null,
    sellerId: body.sellerId || null,
    listingId: body.listingId || null,
    categoryIds,
    creativeImageUrl: body.creativeImageUrl || null,
    headline: body.headline || null,
    targetUrl: body.targetUrl || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    priority: body.priority != null ? body.priority : 0,
    amount: body.amount != null ? body.amount : null,
    paymentRecordId: body.paymentRecordId || null,
    status: body.status || "booked",
  };
}

// POST /ad-bookings — AdBooking (DESIGN §3.6). id adb_xxx.
router.post("/ad-bookings", async (req, res, next) => {
  try {
    const booking = {
      ...normaliseBooking(req.body || {}),
      createdAt: new Date().toISOString(),
    };
    const created = await store.insert("ad-bookings.json", booking, "adb");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /ad-bookings/:id — edit an existing booking (where/which/how + status).
router.put("/ad-bookings/:id", async (req, res, next) => {
  try {
    const body = req.body || {};
    const patch = {};
    const fields = [
      "placementType",
      "adSlotId",
      "slotId",
      "sellerId",
      "listingId",
      "creativeImageUrl",
      "headline",
      "targetUrl",
      "startDate",
      "endDate",
      "priority",
      "amount",
      "paymentRecordId",
      "status",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) patch[f] = body[f];
    }
    if (body.categoryIds !== undefined) {
      patch.categoryIds = Array.isArray(body.categoryIds)
        ? body.categoryIds.filter((s) => typeof s === "string" && s.trim() !== "")
        : [];
    } else if (body.categoryId !== undefined) {
      patch.categoryIds = body.categoryId ? [body.categoryId] : [];
    }
    const updated = await store.update("ad-bookings.json", req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: "Ad booking not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ============================================================== payments ===== */
router.get("/payments", async (req, res, next) => {
  try {
    return res.json({ success: true, data: await store.all("payment-records.json") });
  } catch (err) {
    next(err);
  }
});

// POST /payments — create a PaymentRecord (entitlements backbone). id pay_xxx.
router.post("/payments", async (req, res, next) => {
  try {
    const body = req.body || {};
    const nowIso = new Date().toISOString();
    const status = body.paymentStatus || "pending";
    const settled = status === "paid" || status === "waived";
    const record = {
      sellerId: body.sellerId || null,
      relatedEntityType: body.relatedEntityType || null,
      relatedEntityId: body.relatedEntityId || null,
      amount: body.amount != null ? body.amount : 0,
      paymentMethod: body.paymentMethod || null,
      paymentStatus: status,
      validFrom: body.validFrom || null,
      validTo: body.validTo || null,
      referenceNo: body.referenceNo || null,
      notes: body.notes || null,
      markedPaidDate: settled ? body.markedPaidDate || nowIso : body.markedPaidDate || null,
      createdAt: nowIso,
    };
    const created = await store.insert("payment-records.json", record, "pay");
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /payments/:id — mark paid/waived (or edit). Stamps markedPaidDate on settle.
router.put("/payments/:id", async (req, res, next) => {
  try {
    const patch = { ...(req.body || {}) };
    if ((patch.paymentStatus === "paid" || patch.paymentStatus === "waived") && !patch.markedPaidDate) {
      patch.markedPaidDate = new Date().toISOString();
    }
    const updated = await store.update("payment-records.json", req.params.id, patch);
    if (!updated) return res.status(404).json({ success: false, error: "Payment record not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* =============================================================== reports ===== */
// Listing-report moderation queue (§12 reconciliation). Reports are created by users
// via POST /api/reports (routes/reports.js); admins resolve or dismiss them here.

// GET /reports?status=open|resolved|dismissed  (omit/status=all → every report)
router.get("/reports", async (req, res, next) => {
  try {
    const status = req.query.status;
    let reports = await store.all("reports.json");
    if (status && status !== "all") {
      reports = reports.filter((r) => r.status === status);
    }
    return res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// PUT /reports/:id/resolve — mark a report resolved (stamps resolvedBy/resolvedAt).
router.put("/reports/:id/resolve", async (req, res, next) => {
  try {
    const updated = await store.update("reports.json", req.params.id, {
      status: "resolved",
      resolvedBy: req.user.id,
      resolvedAt: new Date().toISOString(),
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /reports/:id/dismiss — dismiss a report (stamps resolvedBy/resolvedAt).
router.put("/reports/:id/dismiss", async (req, res, next) => {
  try {
    const updated = await store.update("reports.json", req.params.id, {
      status: "dismissed",
      resolvedBy: req.user.id,
      resolvedAt: new Date().toISOString(),
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ============================================================== settings ===== */
router.get("/settings", async (req, res, next) => {
  try {
    return res.json({ success: true, data: await store.readJson("settings.json", {}) });
  } catch (err) {
    next(err);
  }
});

// PUT /settings — shallow-merge the patch into settings.json (locked read-modify-write).
router.put("/settings", async (req, res, next) => {
  try {
    const merged = await store.withLock("settings.json", async () => {
      const current = await store.readJson("settings.json", {});
      const next = { ...current, ...(req.body || {}) };
      await store.writeJson("settings.json", next);
      return next;
    });
    return res.json({ success: true, data: merged });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
