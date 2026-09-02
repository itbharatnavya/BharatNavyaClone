/**
 * routes/users.js — public seller mini-sites + lazy seller-profile creation (DESIGN §3.1).
 *
 * A user is a person, not a role. `sellerProfile` is created lazily the first time a
 * user opts into selling. Monetization/verification/status fields are admin-owned and
 * never writable by the client here.
 */

const express = require("express");
const router = express.Router();

const store = require("../lib/store");
const { repoForCollection } = require("../modules/_shared");
const identity = require("../modules/identity");
const directory = require("../modules/directory");
const recruitment = require("../modules/recruitment");
const { readLedger } = require("../lib/leads");
const { authGuard, optionalAuth } = require("../middleware/authGuard");
const { coordsForCity } = require("../lib/geo");
const { deriveBadges } = require("../lib/badges");
const { trustScore } = require("../lib/trustScore");

/** Strip secrets (passwordHash) before a user leaves the API. */
function sanitizeUser(u) {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

/** URL-safe slug from an arbitrary string. */
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ensure a seller slug is unique (append -2, -3, ... on collision). Phase 6b:
 *  indexed `seller_profiles.slug` probes, was a `store.all("users.json")` slug-set. */
async function uniqueSlug(base) {
  let slug = base || "seller";
  let n = 1;
  while (await identity.sellerSlugTaken(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

// resolveSellerLocations moved to lib/sellerLocations.js in Phase 5d (it's a pure
// helper and routes/listings.js needed it — a route importing a route). Re-exported
// at the bottom of this file for any existing `require("./users").resolveSellerLocations`.
const { resolveSellerLocations } = require("../lib/sellerLocations");

/**
 * Normalize a client-supplied locations array: keep only objects that have at least a
 * city, generate an id when missing, coerce string fields, and cap the list at 20.
 */
function normalizeLocations(input) {
  const out = [];
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;
    const city = String(raw.city || "").trim();
    if (!city) continue; // require at least a city
    const id =
      raw.id && String(raw.id).trim()
        ? String(raw.id).trim()
        : `loc_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
    out.push({
      id,
      label: String(raw.label || "").trim() || "Branch",
      city,
      state: String(raw.state || "").trim(),
      pincode: raw.pincode != null ? String(raw.pincode).trim() : "",
      address: raw.address != null ? String(raw.address).trim() : "",
    });
    if (out.length >= 20) break; // cap at 20 branches
  }
  return out;
}

/**
 * Normalize a client-supplied serviceAreas array (the lighter "where you serve" list):
 * keep only objects with a city, coerce {city,state} to trimmed strings, cap at 30.
 */
function normalizeServiceAreas(input) {
  const out = [];
  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i];
    if (!raw || typeof raw !== "object") continue;
    const city = String(raw.city || "").trim();
    if (!city) continue;
    out.push({ city, state: String(raw.state || "").trim() });
    if (out.length >= 30) break; // cap at 30 service areas
  }
  return out;
}

/**
 * Public subset of a seller: their profile plus non-sensitive user fields.
 * `contactMobile`/`contactEmail` (the direct Call/WhatsApp channel) are only
 * included when `includeContact` is true — callers pass this based on
 * whether the request is authenticated, so anonymous visitors never receive
 * a seller's number in the response (not just hidden in the UI).
 */
function publicSeller(user, includeContact) {
  const { contactMobile, contactEmail, ...sellerProfile } = user.sellerProfile || {};
  return {
    id: user.id,
    name: user.name,
    city: user.city,
    state: user.state,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    ...sellerProfile,
    ...(includeContact ? { contactMobile, contactEmail } : {}),
  };
}

// GET /api/users/sellers?q=&limit=&page= — PUBLIC search of approved sellers by
// company name. Powers the "Companies" bucket of the Directory search overview
// (frontend /search page) — same shaping as /sellers/featured just below (kept
// field-compatible with FeaturedSellers.tsx's mapSeller()), plus a text filter
// and real pagination.
// Phase 6b: `users` is now exactly the approved sellers (identity.getApprovedSellerIds
// + hydrateUsersByIds), and `activeCounts` is directory.activeListingCountsBySeller()
// (one GROUP BY) — was store.all("users.json") + store.all("listings.json") +
// getActiveListingCounts(). Shared by /sellers and /sellers/featured.
function computeApprovedSellerCards(users, activeCounts) {
  const approved = users.filter(
    (u) => u.sellerProfile && u.sellerProfile.status === "approved"
  );

  // Highest rating, then most reviews — same convention as /sellers/featured.
  approved.sort((a, b) => {
    const sa = a.sellerProfile;
    const sb = b.sellerProfile;
    if ((sb.rating || 0) !== (sa.rating || 0)) return (sb.rating || 0) - (sa.rating || 0);
    return (sb.reviewCount || 0) - (sa.reviewCount || 0);
  });

  return approved.map((u) => {
    const sp = u.sellerProfile;
    return {
      id: u.id,
      name: sp.companyName || u.name,
      slug: sp.slug,
      city: sp.location && sp.location.city,
      state: sp.location && sp.location.state,
      logo: sp.logo || null,
      rating: sp.rating,
      reviewCount: sp.reviewCount,
      isVerified: sp.isVerified,
      trustSealVerified: sp.trustSealVerified,
      gstNumber: sp.gstNumber,
      yearEstablished: sp.yearEstablished,
      responseRate: sp.responseRate,
      listingCount: activeCounts.get(u.id) || 0,
      badges: deriveBadges(sp),
      _companyNameLc: String(sp.companyName || "").toLowerCase(),
    };
  });
}

function getApprovedSellerCards(users, activeCounts) {
  return computeApprovedSellerCards(users, activeCounts);
}

async function approvedSellersAndCounts() {
  const ids = await identity.getApprovedSellerIds();
  const [users, activeCounts] = await Promise.all([
    identity.hydrateUsersByIds(ids),
    directory.activeListingCountsBySeller(),
  ]);
  return { users, activeCounts };
}

router.get("/sellers", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const { users, activeCounts } = await approvedSellersAndCounts();
    const allCards = getApprovedSellerCards(users, activeCounts);
    const filtered = q ? allCards.filter((c) => c._companyNameLc.includes(q)) : allCards;

    const total = filtered.length;
    const start = (page - 1) * limit;
    // eslint-disable-next-line no-unused-vars
    const sellers = filtered.slice(start, start + limit).map(({ _companyNameLc, ...card }) => card);

    return res.json({ success: true, data: { sellers, total } });
  } catch (err) {
    next(err);
  }
});

function computeFeaturedSellerCards(users, activeCounts) {
  const approved = users.filter(
    (u) => u.sellerProfile && u.sellerProfile.status === "approved"
  );

  // Featured first, then highest rating, then most reviews.
  approved.sort((a, b) => {
    const sa = a.sellerProfile;
    const sb = b.sellerProfile;
    const fa = sa.isFeaturedSeller ? 1 : 0;
    const fb = sb.isFeaturedSeller ? 1 : 0;
    if (fb !== fa) return fb - fa;
    if ((sb.rating || 0) !== (sa.rating || 0)) return (sb.rating || 0) - (sa.rating || 0);
    return (sb.reviewCount || 0) - (sa.reviewCount || 0);
  });

  return approved.slice(0, 8).map((u) => {
    const sp = u.sellerProfile;
    return {
      id: u.id,
      name: u.name,
      slug: sp.slug,
      city: sp.location && sp.location.city,
      state: sp.location && sp.location.state,
      rating: sp.rating,
      reviewCount: sp.reviewCount,
      isVerified: sp.isVerified,
      responseRate: sp.responseRate,
      listingCount: activeCounts.get(u.id) || 0,
      badges: deriveBadges(sp),
    };
  });
}

function getFeaturedSellerCards(users, activeCounts) {
  return computeFeaturedSellerCards(users, activeCounts);
}

// GET /api/users/sellers/featured — PUBLIC list of up to 8 top sellers.
// MUST be declared BEFORE "/sellers/:slug" so "featured" isn't captured as a :slug.
router.get("/sellers/featured", async (req, res, next) => {
  try {
    const { users, activeCounts } = await approvedSellersAndCounts();
    const data = getFeaturedSellerCards(users, activeCounts);

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/sellers/:slug — public seller profile + their active listings.
// optionalAuth: contactMobile/contactEmail are only attached below when the
// request carries a valid session — logged-out visitors get everything else
// (ratings, badges, listings, etc.) but never the seller's direct number.
router.get("/sellers/:slug", optionalAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    // Phase 6b: indexed seller_profiles.slug probe + single-id hydrate, was a
    // store.findOne full composite scan of every user.
    const user = await identity.getSellerBySlug(slug);
    if (!user || !user.sellerProfile) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    // Phase 6b: indexed active-listing-ids probe + per-id composite hydrate (the
    // document read stays on store by design), was a store.findMany full scan.
    const listingIds = await directory.activeListingIdsForSeller(user.id);
    const listings = [];
    for (const lid of listingIds) {
      const doc = await store.getById("listings.json", lid);
      if (doc) listings.push(doc);
    }

    // Gamified trust badges (derived on read) + geo coords stamped from the city.
    const seller = publicSeller(user, !!req.user);
    seller.badges = deriveBadges(user.sellerProfile);
    // Computed 0–100 trust score (verification + rating + reviews + response + years).
    const ts = trustScore(user.sellerProfile);
    seller.trustScore = ts.score;
    seller.trustBand = ts.band;
    seller.trustFactors = ts.factors;
    const coords = coordsForCity(seller.location && seller.location.city);
    if (coords) {
      seller.location = { ...(seller.location || {}), lat: coords.lat, lng: coords.lng };
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
        city: user.city,
        state: user.state,
        seller,
        listings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/become-seller — lazily create the seller profile.
router.post("/become-seller", authGuard, async (req, res, next) => {
  try {
    // Already a seller → return the current (sanitized) user unchanged.
    if (req.user.sellerProfile) {
      return res.json({ success: true, data: { user: sanitizeUser(req.user) } });
    }

    const b = req.body || {};
    if (!b.companyName || String(b.companyName).trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "companyName is required" });
    }

    const slug = await uniqueSlug(slugify(b.companyName));
    const sellerProfile = {
      companyName: String(b.companyName).trim(),
      slug,
      about: b.about || "",
      logo: null,
      coverImage: null,
      gstNumber: b.gstNumber || null,
      yearEstablished: null,
      employeeCount: null,
      certifications: [],
      website: null,
      contactMobile: b.contactMobile || req.user.mobile || "",
      contactEmail: b.contactEmail || req.user.email || null,
      location: {
        city: b.city || req.user.city || "",
        state: b.state || req.user.state || "",
        pincode: "",
      },
      legacyCategories: Array.isArray(b.categories) ? b.categories : [],
      // --- trust / verification (admin-owned) ---
      status: "pending",
      isVerified: false,
      trustSealVerified: false,
      verifiedBadgeExpiry: null,
      rating: 0,
      reviewCount: 0,
      responseRate: 0,
      performance: {
        onTimeDelivery: 0,
        avgResponseTimeHours: 0,
        repeatBuyers: 0,
        orderCompletion: 0,
        performanceScore: 0,
      },
      // --- monetization (admin-owned) ---
      planId: null,
      planTier: "free",
      planStartDate: null,
      planEndDate: null,
      planStatus: "active",
      listingLimit: null,
      leadQuotaPerCycle: null,
      leadsConsumed: 0,
      leadQuotaResetDate: null,
      featuredCredits: 0,
      perLeadPrice: null,
      rankBoostScore: 0,
      priorityTier: "none",
      isFeaturedSeller: false,
      featuredStartDate: null,
      featuredEndDate: null,
      boostCategoryIds: [],
      boostKeywords: [],
      boostGeoLocations: [],
      analyticsEnabled: false,
      accountManagerId: null,
      adminNotes: null,
    };

    const updated = await store.update("users.json", req.user.id, { sellerProfile });
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me/seller — update editable seller-profile fields only.
router.put("/me/seller", authGuard, async (req, res, next) => {
  try {
    if (!req.user.sellerProfile) {
      return res
        .status(400)
        .json({ success: false, error: "No seller profile to update" });
    }

    const b = req.body || {};
    const allowed = [
      "about",
      "logo",
      "coverImage",
      "website",
      "employeeCount",
      "certifications",
      "contactMobile",
      "contactEmail",
      "location",
    ];
    const patch = {};
    for (const key of allowed) {
      if (b[key] !== undefined) patch[key] = b[key];
    }

    // Multi-location branches: accept + persist a `locations` array (each needs a city).
    if (b.locations !== undefined) {
      if (!Array.isArray(b.locations)) {
        return res
          .status(400)
          .json({ success: false, error: "locations must be an array of objects" });
      }
      const locations = normalizeLocations(b.locations);
      patch.locations = locations;
      // Keep the legacy single `location` in sync as the primary/first branch, unless
      // the client explicitly sent its own `location` in the same request.
      if (locations.length > 0 && b.location === undefined) {
        const first = locations[0];
        patch.location = {
          city: first.city,
          state: first.state,
          pincode: first.pincode || "",
        };
      }
    }

    // Service areas: the lighter "cities you operate in" list — an array of {city,state}.
    if (b.serviceAreas !== undefined) {
      if (!Array.isArray(b.serviceAreas)) {
        return res
          .status(400)
          .json({ success: false, error: "serviceAreas must be an array of objects" });
      }
      patch.serviceAreas = normalizeServiceAreas(b.serviceAreas);
    }

    // Shallow-merge onto the existing profile; monetization/status fields untouched.
    const sellerProfile = { ...req.user.sellerProfile, ...patch };
    const updated = await store.update("users.json", req.user.id, { sellerProfile });
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/me/verification — a seller submits GST/PAN to "Get verified".
// Stores a pending verification-requests row and persists gst/pan onto the profile.
// An admin approves it (routes/moderation.js) to set the verified badge + trust seal.
router.post("/me/verification", authGuard, async (req, res, next) => {
  try {
    if (!req.user.sellerProfile) {
      return res
        .status(400)
        .json({ success: false, error: "Create a seller profile first" });
    }
    const b = req.body || {};
    const gstNumber = String(b.gstNumber || "").trim();
    const panNumber = String(b.panNumber || "").trim();
    if (!gstNumber && !panNumber) {
      return res
        .status(400)
        .json({ success: false, error: "gstNumber or panNumber is required" });
    }

    const request = await store.insert(
      "verification-requests.json",
      {
        sellerId: req.user.id,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null,
        note: b.note ? String(b.note).trim() : null,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      "vr"
    );

    // Persist the submitted identifiers onto the profile (verification stays admin-owned).
    const sellerProfile = { ...req.user.sellerProfile };
    if (gstNumber) sellerProfile.gstNumber = gstNumber;
    if (panNumber) sellerProfile.panNumber = panNumber;
    await store.update("users.json", req.user.id, { sellerProfile });

    return res.json({ success: true, data: { request } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/me/profile — update general (non-seller) user profile fields only.
const PROFILE_VISIBILITY = new Set(["public", "on_request", "hidden"]);

router.put("/me/profile", authGuard, async (req, res, next) => {
  try {
    const b = req.body || {};
    const allowed = [
      "name",
      "avatarUrl",
      "city",
      "state",
      "interests",
      "contactVisibility",
    ];
    const patch = {};
    for (const key of allowed) {
      if (b[key] !== undefined) patch[key] = b[key];
    }

    if (patch.interests !== undefined && !Array.isArray(patch.interests)) {
      return res
        .status(400)
        .json({ success: false, error: "interests must be an array of category slugs" });
    }
    if (
      patch.contactVisibility !== undefined &&
      !PROFILE_VISIBILITY.has(patch.contactVisibility)
    ) {
      return res.status(400).json({
        success: false,
        error: "contactVisibility must be one of public|on_request|hidden",
      });
    }

    const updated = await store.update("users.json", req.user.id, patch);
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/me/listings — the authenticated seller's OWN listings, every status
// (active/draft/sold/inactive). Unlike the public browse endpoint, this is NOT
// gated by seller-approval, so a seller always sees their own catalogue in the
// dashboard even while pending/suspended.
router.get("/me/listings", authGuard, async (req, res, next) => {
  try {
    // The every-listing scan is now an indexed id list; the composite document
    // read stays per-id on store by design (BACKEND-AUDIT.md).
    const ids = await directory.sellerListingIds(req.user.id);
    const docs = (
      await Promise.all(ids.map((id) => store.getById("listings.json", id)))
    ).filter(Boolean);
    const mine = docs.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
    return res.json({ success: true, data: { listings: mine, total: mine.length } });
  } catch (err) {
    next(err);
  }
});

// GET /api/me/analytics — the authenticated seller's performance snapshot (SELLER
// ANALYTICS). Computed on read from existing data: their listings (views/status),
// the append-only lead ledger (leads delivered to them), inquiries (open ones), and
// approved reviews about them. Drives the dashboard Analytics tab (and its boost upsell).
// Inquiry stages considered "closed" — everything else counts as an open enquiry.
const CLOSED_INQUIRY_STAGES = new Set([
  "Closed",
  "Won",
  "Lost",
  "Converted",
  "Rejected",
  "Archived",
]);

router.get("/me/analytics", authGuard, async (req, res, next) => {
  try {
    const me = req.user.id;
    const [myListings, leads, inquiries, myReviews] = await Promise.all([
      directory.sellerListingStats(me),
      readLedger(),
      repoForCollection("inquiries.json").findMany({}),
      directory.reviewsRepo.findMany({
        where: { status: "approved", _or: [{ targetUserId: me }, { sellerId: me }] },
      }),
    ]);

    const myLeads = leads.filter((l) => l.sellerId === me);

    // Leads delivered per listing id (for the per-listing breakdown).
    const leadsByListing = new Map();
    for (const ld of myLeads) {
      if (!ld.listingId) continue;
      leadsByListing.set(ld.listingId, (leadsByListing.get(ld.listingId) || 0) + 1);
    }

    const totalViews = myListings.reduce((sum, l) => sum + (Number(l.views) || 0), 0);

    // Open inquiries: those tied to a lead delivered to me (or directly targeting me)
    // whose stage is not one of the closed stages. Best-effort — 0 if unresolvable.
    const myInquiryIds = new Set(myLeads.map((l) => l.inquiryId));
    const openInquiries = inquiries.filter(
      (i) =>
        (i.sellerId === me || myInquiryIds.has(i.id)) &&
        !CLOSED_INQUIRY_STAGES.has(i.stage)
    ).length;

    // Approved reviews written ABOUT me (targetUserId or the sellerId alias) —
    // the criteria are pushed into the repo query above.
    const reviewCount = myReviews.length;
    const avgRating = reviewCount
      ? Math.round(
          (myReviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviewCount) * 10
        ) / 10
      : 0;

    // Per-listing performance, top ~10 by views.
    const perListing = myListings
      .map((l) => ({
        id: l.id,
        title: l.title,
        views: Number(l.views) || 0,
        leads: leadsByListing.get(l.id) || 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const sp = req.user.sellerProfile || {};

    return res.json({
      success: true,
      data: {
        totalListings: myListings.length,
        activeListings: myListings.filter((l) => l.status === "active").length,
        featuredListings: myListings.filter((l) => !!l.isFeatured).length,
        totalViews,
        totalLeads: myLeads.length,
        openInquiries,
        reviewCount,
        avgRating,
        responseRate: sp.responseRate ?? 0,
        listings: perListing,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ================================================================
 * Recruitment (RECRUITMENT.md) — employerProfile / candidateProfile.
 * Deliberately separate from the seller helpers above: own slug namespace, own
 * status/approval flow — see RECRUITMENT.md §1's "separate collections" decision.
 * ================================================================ */

/** Ensure an employer slug is unique across all users — its own namespace from
 *  seller slugs (different URL prefix, /employer/:slug vs /seller/:slug). */
async function uniqueEmployerSlug(base) {
  let slug = base || "employer";
  let n = 1;
  while (await identity.employerSlugTaken(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/** Public subset of an employer profile — contactMobile/contactEmail only when
 *  includeContact is true, same server-side gating shape as publicSeller() above. */
function publicEmployer(user, includeContact) {
  const { contactMobile, contactEmail, ...employerProfile } = user.employerProfile || {};
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    ...employerProfile,
    ...(includeContact ? { contactMobile, contactEmail } : {}),
  };
}

/** Public subset of a candidate profile — contactPhone/contactEmail only when
 *  includeContact is true. */
function publicCandidate(user, includeContact) {
  const { contactPhone, contactEmail, ...candidateProfile } = user.candidateProfile || {};
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
    ...candidateProfile,
    ...(includeContact ? { contactPhone, contactEmail } : {}),
  };
}

// POST /api/me/recruitment-role — select Candidate or Recruiter. Only settable while
// unlocked (recruitmentRoleLockedAt is null); the lock itself is set the moment the
// matching profile is first successfully created (become-employer / PUT me/candidate
// below), not here — this endpoint just records intent so the dashboard can show the
// right profile-setup flow before that first submit.
router.post("/me/recruitment-role", authGuard, async (req, res, next) => {
  try {
    const role = req.body && req.body.role;
    if (role !== "candidate" && role !== "recruiter") {
      return res.status(400).json({ success: false, error: "role must be 'candidate' or 'recruiter'" });
    }
    if (req.user.recruitmentRoleLockedAt && req.user.recruitmentRole !== role) {
      return res.status(409).json({
        success: false,
        error: `Your Recruitment role is locked to '${req.user.recruitmentRole}' and cannot be changed.`,
      });
    }
    const updated = await store.update("users.json", req.user.id, { recruitmentRole: role });
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/become-employer — lazily create the employer profile (mirrors become-seller).
router.post("/become-employer", authGuard, async (req, res, next) => {
  try {
    if (req.user.employerProfile) {
      return res.json({ success: true, data: { user: sanitizeUser(req.user) } });
    }
    if (req.user.recruitmentRoleLockedAt && req.user.recruitmentRole !== "recruiter") {
      return res.status(403).json({
        success: false,
        error: "Your Recruitment role is locked to 'candidate' — recruiters and candidates are separate roles.",
      });
    }
    const b = req.body || {};
    if (!b.companyName || String(b.companyName).trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "companyName is required" });
    }
    const slug = await uniqueEmployerSlug(slugify(b.companyName));
    const employerProfile = {
      companyName: String(b.companyName).trim(),
      slug,
      about: b.about || "",
      logo: null,
      coverImage: null,
      industry: b.industry || null,
      companySize: b.companySize || null,
      website: b.website || null,
      contactMobile: b.contactMobile || req.user.mobile || "",
      contactEmail: b.contactEmail || req.user.email || null,
      location: { city: b.city || req.user.city || "", state: b.state || req.user.state || "" },
      employeeCount: b.employeeCount || null,
      benefits: Array.isArray(b.benefits) ? b.benefits.map((x) => String(x).trim()).filter(Boolean) : [],
      workingHours: b.workingHours || null,
      // --- trust / verification + monetization (admin-owned) ---
      status: "pending",
      isVerified: false,
      planTier: "free",
      jobPostLimit: null,
      applicationQuota: null,
    };
    // First-ever employer profile for this account locks the Recruitment role — see
    // the migration/enhancement-doc comment above POST /me/recruitment-role.
    const updated = await store.update("users.json", req.user.id, {
      employerProfile,
      recruitmentRole: "recruiter",
      recruitmentRoleLockedAt: req.user.recruitmentRoleLockedAt || new Date().toISOString(),
    });
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/me/employer — update editable employer-profile fields only. status/
// isVerified/planTier/jobPostLimit/applicationQuota stay admin-owned, same rule as
// seller monetization fields on PUT /me/seller.
router.put("/me/employer", authGuard, async (req, res, next) => {
  try {
    if (!req.user.employerProfile) {
      return res
        .status(400)
        .json({ success: false, error: "No employer profile to update" });
    }
    const b = req.body || {};
    const allowed = [
      "about", "logo", "coverImage", "industry", "companySize", "website",
      "contactMobile", "contactEmail", "location",
      "employeeCount", "benefits", "workingHours",
    ];
    const patch = {};
    for (const key of allowed) {
      if (b[key] !== undefined) patch[key] = b[key];
    }
    if (patch.benefits !== undefined) {
      patch.benefits = Array.isArray(patch.benefits)
        ? patch.benefits.map((x) => String(x).trim()).filter(Boolean)
        : [];
    }
    const employerProfile = { ...req.user.employerProfile, ...patch };
    const updated = await store.update("users.json", req.user.id, { employerProfile });
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/me/candidate — create-or-update the candidate profile. No approval gate
// (RECRUITMENT.md §2) — unlike become-employer, this isn't admin-gated and can be
// called repeatedly to build the profile up over time. It does still require a
// non-empty `headline` (mirrors become-employer's `companyName` requirement) —
// submitting a blank profile isn't a valid "create."
router.put("/me/candidate", authGuard, async (req, res, next) => {
  try {
    if (req.user.recruitmentRoleLockedAt && req.user.recruitmentRole !== "candidate") {
      return res.status(403).json({
        success: false,
        error: "Your Recruitment role is locked to 'recruiter' — recruiters and candidates are separate roles.",
      });
    }
    const b = req.body || {};
    const hadProfile = !!req.user.candidateProfile;
    const existing = req.user.candidateProfile || {
      headline: "", summary: "", resumeUrl: null, skills: [], experienceYears: null,
      currentRole: null, currentCompany: null, expectedSalary: null, preferredLocations: [],
      preferredJobTypes: [], contactPhone: req.user.mobile || null, contactEmail: req.user.email || null,
      isOpenToWork: true, education: [], workHistory: [],
    };
    const allowed = [
      "headline", "summary", "resumeUrl", "skills", "experienceYears", "currentRole",
      "currentCompany", "expectedSalary", "preferredLocations", "preferredJobTypes",
      "contactPhone", "contactEmail", "isOpenToWork", "education", "workHistory",
    ];
    const patch = {};
    for (const key of allowed) {
      if (b[key] !== undefined) patch[key] = b[key];
    }
    const candidateProfile = { ...existing, ...patch };
    if (!candidateProfile.headline || !String(candidateProfile.headline).trim()) {
      return res.status(400).json({ success: false, error: "headline is required" });
    }
    // First-ever candidate profile for this account locks the Recruitment role, same
    // rule as become-employer above.
    const roleUpdate = hadProfile
      ? {}
      : {
          recruitmentRole: "candidate",
          recruitmentRoleLockedAt: req.user.recruitmentRoleLockedAt || new Date().toISOString(),
        };
    const updated = await store.update("users.json", req.user.id, { candidateProfile, ...roleUpdate });
    return res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// GET /api/employers/:slug — public employer profile + their active jobs. optionalAuth:
// contactMobile/contactEmail only attached when the request is authenticated — same
// server-side gating shape as GET /sellers/:slug (never client-side-only, CLAUDE.md §2).
router.get("/employers/:slug", optionalAuth, async (req, res, next) => {
  try {
    // Phase 6b: indexed employer_profiles.slug probe + single-id hydrate.
    const user = await identity.getEmployerBySlug(req.params.slug);
    if (!user || !user.employerProfile) {
      return res.status(404).json({ success: false, error: "Employer not found" });
    }
    // Phase 6b: jobs.json graduated in Phase 4d — read it through the recruitment
    // port's repo (criteria → SQL), not a store.findMany predicate scan. No
    // orderBy → queryBuilder appends "id" ASC, matching the old store.all order.
    const jobs = await recruitment.jobsRepo.findMany({
      where: { employerId: user.id, status: "active" },
    });
    const employer = publicEmployer(user, !!req.user);
    return res.json({ success: true, data: { employer, jobs } });
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates/:id — public candidate profile. optionalAuth: contactPhone/
// contactEmail only attached when authenticated, same gating shape as employers/sellers.
router.get("/candidates/:id", optionalAuth, async (req, res, next) => {
  try {
    const user = await store.getById("users.json", req.params.id);
    if (!user || !user.candidateProfile) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }
    const candidate = publicCandidate(user, !!req.user);
    return res.json({ success: true, data: { candidate } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
// Shared with routes/listings.js for denormalizing a chosen branch onto a listing.
module.exports.resolveSellerLocations = resolveSellerLocations;
