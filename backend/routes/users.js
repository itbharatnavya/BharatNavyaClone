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

/** Ensure a seller slug is unique across all users (append -2, -3, ... on collision). */
async function uniqueSlug(base) {
  const users = await store.all("users.json");
  const taken = new Set(
    users.map((u) => u.sellerProfile && u.sellerProfile.slug).filter(Boolean)
  );
  let slug = base || "seller";
  let n = 1;
  while (taken.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/**
 * Resolve a seller's branch locations. Returns sellerProfile.locations when it is a
 * non-empty array; otherwise derives a single-element array from the legacy
 * sellerProfile.location so every seller always has at least one location to assign
 * listings to (no migration needed — this is derived at read time).
 */
function resolveSellerLocations(sellerProfile) {
  const sp = sellerProfile || {};
  if (Array.isArray(sp.locations) && sp.locations.length > 0) {
    return sp.locations;
  }
  const loc = sp.location || {};
  return [
    {
      id: "loc_primary",
      label: "Head Office",
      city: loc.city || "",
      state: loc.state || "",
      pincode: loc.pincode || "",
      address: "",
    },
  ];
}

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
// Active-listing counts per seller (single pass over listings) — shared by
// /sellers and /sellers/featured, memoized on store.js's listings.json
// version so a burst of concurrent requests to either endpoint shares one
// scan instead of redoing it per request.
let _activeCountsCache = null; // { listVersion, counts }
function getActiveListingCounts(listings) {
  const listVersion = store.getVersion("listings.json");
  if (_activeCountsCache && _activeCountsCache.listVersion === listVersion) {
    return _activeCountsCache.counts;
  }
  const counts = new Map();
  for (const l of listings) {
    if (l && l.status === "active" && l.sellerId) {
      counts.set(l.sellerId, (counts.get(l.sellerId) || 0) + 1);
    }
  }
  _activeCountsCache = { listVersion, counts };
  return counts;
}

function computeApprovedSellerCards(users, listings) {
  const activeCounts = getActiveListingCounts(listings);
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

// Memoized on (users.json, listings.json) versions — independent of the
// q/limit/page query params, so every /sellers request (any query) shares
// this same computed-and-sorted base list; filtering by q and paginating
// stay per-request (cheap — operating on a few dozen already-sorted rows).
let _approvedSellerCardsCache = null; // { userVersion, listVersion, cards }
function getApprovedSellerCards(users, listings) {
  const userVersion = store.getVersion("users.json");
  const listVersion = store.getVersion("listings.json");
  if (
    _approvedSellerCardsCache &&
    _approvedSellerCardsCache.userVersion === userVersion &&
    _approvedSellerCardsCache.listVersion === listVersion
  ) {
    return _approvedSellerCardsCache.cards;
  }
  const cards = computeApprovedSellerCards(users, listings);
  _approvedSellerCardsCache = { userVersion, listVersion, cards };
  return cards;
}

router.get("/sellers", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [users, listings] = await Promise.all([
      store.all("users.json"),
      store.all("listings.json"),
    ]);

    const allCards = getApprovedSellerCards(users, listings);
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

function computeFeaturedSellerCards(users, listings) {
  const activeCounts = getActiveListingCounts(listings);
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

// Memoized on (users.json, listings.json) versions — /sellers/featured takes
// no query params, so the whole response can be cached and reused as-is.
let _featuredSellerCardsCache = null; // { userVersion, listVersion, data }
function getFeaturedSellerCards(users, listings) {
  const userVersion = store.getVersion("users.json");
  const listVersion = store.getVersion("listings.json");
  if (
    _featuredSellerCardsCache &&
    _featuredSellerCardsCache.userVersion === userVersion &&
    _featuredSellerCardsCache.listVersion === listVersion
  ) {
    return _featuredSellerCardsCache.data;
  }
  const data = computeFeaturedSellerCards(users, listings);
  _featuredSellerCardsCache = { userVersion, listVersion, data };
  return data;
}

// GET /api/users/sellers/featured — PUBLIC list of up to 8 top sellers.
// MUST be declared BEFORE "/sellers/:slug" so "featured" isn't captured as a :slug.
router.get("/sellers/featured", async (req, res, next) => {
  try {
    const [users, listings] = await Promise.all([
      store.all("users.json"),
      store.all("listings.json"),
    ]);

    const data = getFeaturedSellerCards(users, listings);

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
    const user = await store.findOne(
      "users.json",
      (u) => u.sellerProfile && u.sellerProfile.slug === slug
    );
    if (!user || !user.sellerProfile) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    const listings = await store.findMany(
      "listings.json",
      (l) => l.sellerId === user.id && l.status === "active"
    );

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
    const all = await store.all("listings.json");
    const mine = all
      .filter((l) => l.sellerId === req.user.id)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
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
    const [listings, leads, inquiries, reviews] = await Promise.all([
      store.all("listings.json"),
      store.readJsonl("leads-ledger.jsonl"),
      store.all("inquiries.json"),
      store.all("reviews.json"),
    ]);

    const myListings = listings.filter((l) => l.sellerId === me);
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

    // Approved reviews written ABOUT me (targetUserId or the sellerId alias).
    const myReviews = reviews.filter(
      (r) =>
        r.status === "approved" && (r.targetUserId === me || r.sellerId === me)
    );
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

module.exports = router;
// Shared with routes/listings.js for denormalizing a chosen branch onto a listing.
module.exports.resolveSellerLocations = resolveSellerLocations;
