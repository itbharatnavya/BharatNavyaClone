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
const identity = require("../modules/identity");
const { authGuard, requireRole } = require("../middleware/authGuard");

// Auth + admin role for every endpoint below.
router.use(authGuard, requireRole("admin"));

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isSeller = (u) => u && u.sellerProfile;

/* =============================================================== analytics == */
router.get("/analytics", async (req, res, next) => {
  try {
    const [users, listings, inquiries, jobs, applications] = await Promise.all([
      store.all("users.json"),
      store.all("listings.json"),
      store.all("inquiries.json"),
      store.all("jobs.json"),
      store.all("applications.json"),
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

    /* ----------------------------------------------------- Recruitment ----- */
    const employers = users.filter((u) => u.employerProfile);
    const candidates = users.filter((u) => u.candidateProfile);
    const pendingEmployers = employers.filter(
      (u) => (u.employerProfile.status || "pending") === "pending"
    ).length;
    const activeJobs = jobs.filter((j) => j.status === "active").length;
    const openings = jobs.reduce((sum, j) => sum + (Number(j.openings) || 0), 0);

    const applicationsByStatus = {};
    for (const a of applications) {
      const st = a.status || "applied";
      applicationsByStatus[st] = (applicationsByStatus[st] || 0) + 1;
    }

    // Last 6 months of application volume, same shape as monthlyInquiries.
    const monthlyApplications = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = applications.filter((a) => {
        const raw = a.appliedAt || a.createdAt;
        if (typeof raw !== "string") return false;
        const c = new Date(raw);
        return c.getFullYear() === year && c.getMonth() === month;
      }).length;
      monthlyApplications.push({ month: MONTH_LABELS[month], year, count });
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
        recruitment: {
          totals: {
            employers: employers.length,
            pendingEmployers,
            candidates: candidates.length,
            jobs: jobs.length,
            activeJobs,
            openings,
            applications: applications.length,
            hires: applicationsByStatus.hired || 0,
          },
          applicationsByStatus,
          monthlyApplications,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/* =================================================================== users == */
// GET /users?scope=global|directory|recruitment&type=&status=&planTier=&featured=&q=&page=&limit=
//
// One paginated directory over every account. An account wears any mix of "hats"
// (buyer, seller, employer, candidate, admin) at once — this endpoint is just a
// filtered view of users.json, and GET /users/:id is the per-person cross-product
// detail. `scope` narrows the base set to one product's people and picks which
// approval-status field `status` filters on:
//   - global      → everyone; `status` filters sellerProfile.status
//   - directory   → sellers + plain buyers (no recruitment-only accounts); sellerProfile.status
//   - recruitment → employers + candidates; employerProfile.status
// `planTier` / `featured` are seller-only and ignored elsewhere. passwordHash is stripped.
const isEmployer = (u) => u && u.employerProfile;
const isCandidate = (u) => u && u.candidateProfile;
const isAdminUser = (u) => ((u && u.roles) || []).includes("admin");
const acctStatus = (u) => (u && u.status === "suspended" ? "suspended" : "active");

function hatsOf(u) {
  const hats = ["buyer"]; // every account can buy
  if (isSeller(u)) hats.push("seller");
  if (isEmployer(u)) hats.push("employer");
  if (isCandidate(u)) hats.push("candidate");
  if (isAdminUser(u)) hats.push("admin");
  return hats;
}

// Row shape for the list — full sellerProfile (the list renders many of its fields),
// but only a lightweight slice of employer/candidate (detail view has the rest).
function adminUserRow(u) {
  const { passwordHash, employerProfile, candidateProfile, ...rest } = u;
  return {
    ...rest,
    accountType: isSeller(u) ? "seller" : "user", // back-compat with the old shape
    accountStatus: acctStatus(u),
    hats: hatsOf(u),
    employerProfile: employerProfile
      ? {
          companyName: employerProfile.companyName || "",
          slug: employerProfile.slug || null,
          status: employerProfile.status || "pending",
          isVerified: !!employerProfile.isVerified,
        }
      : null,
    candidateProfile: candidateProfile
      ? {
          headline: candidateProfile.headline || "",
          skills: candidateProfile.skills || [],
          resumeUrl: candidateProfile.resumeUrl || null,
        }
      : null,
  };
}

const USER_SCOPES = new Set(["global", "directory", "recruitment"]);

router.get("/users", async (req, res, next) => {
  try {
    const scope = USER_SCOPES.has(req.query.scope) ? req.query.scope : "global";
    const type = req.query.type || "all";
    const status = req.query.status;
    const planTier = req.query.planTier;
    const featured = req.query.featured;
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    // Phase 6a: scope / type / status / planTier / featured / q filtering, the 7
    // summary counts, the createdAt sort and the page slice all run as indexed SQL
    // in identity.adminUserPage (was a full composite hydrate of every user + a JS
    // pipeline). Only the <=100 page ids are then hydrated + mapped to rows here.
    const { pageIds, total, summary } = await identity.adminUserPage({
      scope,
      type,
      status,
      planTier,
      featured,
      q,
      page,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const items = (await identity.hydrateUsersByIds(pageIds)).map(adminUserRow);

    return res.json({ success: true, data: { items, total, page, totalPages, summary } });
  } catch (err) {
    next(err);
  }
});

// GET /users/:id — one account, every hat, plus cross-product activity counts.
router.get("/users/:id", async (req, res, next) => {
  try {
    const u = await store.getById("users.json", req.params.id);
    if (!u) return res.status(404).json({ success: false, error: "User not found" });

    const [listings, inquiriesSent, jobsPosted, appsSent, appsReceived, reviewsWritten, reviewsReceived] =
      await Promise.all([
        store.findMany("listings.json", (l) => l.sellerId === u.id),
        store.findMany("inquiries.json", (q) => q.buyerId === u.id),
        store.findMany("jobs.json", (j) => j.employerId === u.id),
        store.findMany("applications.json", (a) => a.candidateId === u.id),
        store.findMany("applications.json", (a) => a.employerId === u.id),
        store.findMany("reviews.json", (r) => r.buyerId === u.id),
        store.findMany("reviews.json", (r) => (r.targetUserId || r.sellerId) === u.id),
      ]);

    const { passwordHash, ...safe } = u;
    return res.json({
      success: true,
      data: {
        user: { ...safe, accountStatus: acctStatus(u), hats: hatsOf(u) },
        stats: {
          listings: listings.length,
          inquiriesSent: inquiriesSent.length,
          jobsPosted: jobsPosted.length,
          applicationsSent: appsSent.length,
          applicationsReceived: appsReceived.length,
          reviewsWritten: reviewsWritten.length,
          reviewsReceived: reviewsReceived.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /users/:id/suspend | /users/:id/reactivate — account-level. Independent of
// any product's approval status (a suspended seller-account can't log in at all).
// Admin accounts and your own account are protected.
async function setAccountStatus(req, res, next, status) {
  try {
    const u = await store.getById("users.json", req.params.id);
    if (!u) return res.status(404).json({ success: false, error: "User not found" });
    if (isAdminUser(u)) {
      return res.status(400).json({ success: false, error: "Admin accounts cannot be suspended." });
    }
    if (req.user && req.user.id === u.id) {
      return res.status(400).json({ success: false, error: "You cannot change your own account status." });
    }
    const updated = await store.update("users.json", u.id, { status });
    return res.json({ success: true, data: { id: updated.id, status: acctStatus(updated) } });
  } catch (err) {
    next(err);
  }
}
router.post("/users/:id/suspend", (req, res, next) => setAccountStatus(req, res, next, "suspended"));
router.post("/users/:id/reactivate", (req, res, next) => setAccountStatus(req, res, next, "active"));

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

/* ------------------------------------------------------------------------- *
 * Admin write allowlists (BACKEND-AUDIT.md S1 / 1a-admin). These handlers used
 * to `{...req.body}` straight into store.insert/update — a mass-assignment
 * surface: a caller could set `id`, `createdAt`, or any other mapped column the
 * admin form never means to touch. `pick` keeps only the named fields; every
 * list below is exactly (mapped columns − id − timestamps).
 * ------------------------------------------------------------------------- */
const pick = (body, keys) => {
  const out = {};
  for (const k of keys) if (body && body[k] !== undefined) out[k] = body[k];
  return out;
};

const PLAN_FIELDS = [
  "name", "tier", "billingCycle", "listingLimit", "leadQuotaPerCycle",
  "featuredCreditsPerCycle", "rankBoostBaseline", "verifiedBadgeIncluded",
  "analyticsEnabled", "perLeadPrice", "tierRank",
];
const AD_SLOT_FIELDS = ["name", "placementType", "defaultSize", "isActive"];
const PAYMENT_FIELDS = [
  "sellerId", "relatedEntityType", "relatedEntityId", "amount", "paymentMethod",
  "paymentStatus", "validFrom", "validTo", "referenceNo", "notes", "markedPaidDate",
];

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
    const created = await store.insert(
      "subscription-plans.json",
      { billingCycle: "monthly", ...pick(req.body || {}, PLAN_FIELDS) },
      "plan"
    );
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/plans/:id", async (req, res, next) => {
  try {
    const updated = await store.update("subscription-plans.json", req.params.id, pick(req.body || {}, PLAN_FIELDS));
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
    const created = await store.insert(
      "ad-slots.json",
      { isActive: true, ...pick(req.body || {}, AD_SLOT_FIELDS) },
      "slot"
    );
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/ad-slots/:id", async (req, res, next) => {
  try {
    const updated = await store.update("ad-slots.json", req.params.id, pick(req.body || {}, AD_SLOT_FIELDS));
    if (!updated) return res.status(404).json({ success: false, error: "Ad slot not found" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* ============================================================ ad bookings ===== */
// GET /ad-bookings?product=directory|recruitment&status=&page=&limit=
// Directory and Recruitment share one ad-bookings collection, split only by
// placementType prefix ("recruitment_*" vs everything else — myAds.js's
// isRecruitmentPlacement() uses the same rule). `product` filters to the
// matching set so the two admin Ads tabs never leak each other's campaigns.
function isRecruitmentBooking(b) {
  return typeof b.placementType === "string" && b.placementType.startsWith("recruitment_");
}

router.get("/ad-bookings", async (req, res, next) => {
  try {
    const product = req.query.product;
    const status = req.query.status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let list = await store.all("ad-bookings.json");
    if (product === "recruitment") list = list.filter(isRecruitmentBooking);
    else if (product === "directory") list = list.filter((b) => !isRecruitmentBooking(b));

    if (status && status !== "all") {
      list = list.filter((b) => b.status === status);
    }

    list = list.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = list.slice(start, start + limit);

    return res.json({ success: true, data: { items, total, page, totalPages } });
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
    const patch = pick(req.body || {}, PAYMENT_FIELDS);
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
