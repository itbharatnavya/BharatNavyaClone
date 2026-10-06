/**
 * routes/listings.js — public browse + listing CRUD (DESIGN §3.2, BUILD-SPEC listings).
 *
 * GET  /            faceted, ranked browse (search → paid-boost blend → paginate)
 * GET  /:id         single listing + public seller info
 * POST /            create listing (authGuard; auto-creates a sellerProfile if missing)
 * PUT  /:id         merge-update (authGuard; owner or admin)
 * DELETE /:id       delete (authGuard; owner or admin)
 *
 * Response envelope per BUILD-SPEC: { success, data } / { success:false, error }.
 */

const express = require("express");
const router = express.Router();

const identity = require("../../identity");
const directory = require("../index");
const { authGuard } = require("../../../middleware/authGuard");
const { searchListings, computeFacets, slugify } = require("../../../lib/search");
const { rankListings } = require("../../../lib/ranking");
const { coordsForCity, distanceKm } = require("../../../lib/geo");
const { resolveSellerLocations } = require("../../../lib/sellerLocations");
const { verifyListing, deterministicChecks } = require("../../../lib/listingVerification");
const { resolveUpload } = require("../../../lib/uploadStorage");

const DETERMINISTIC_SORTS = new Set(["price_asc", "price_desc", "rating", "newest"]);
const DEFAULT_LIMIT = 12;
// First upper bound for GET /api/listings (finding C9 — it was the only paginated
// route with no cap). Set well above every real caller (admin AdsTab asks for 500,
// CollectionsTab 200) so this only ever rejects an abuse-sized `limit`, not a
// legitimate one. Tighten per-route later if a caller is narrowed.
const MAX_LIMIT = 1000;

// Cap one bulk-catalog upload so a single request can't rewrite listings.json forever.
const BULK_MAX_ROWS = 200;

// Listing lifecycle statuses; "sold" was added in the §12 reconciliation.
// "pending" (awaiting AI/admin verification) and "rejected" (admin declined) were
// added for the AI-VERIFICATION flow — see lib/listingVerification.js.
const VALID_LISTING_STATUSES = new Set(["active", "inactive", "sold", "pending", "rejected"]);
// Product condition (§12 reconciliation); anything unknown normalizes to "na".
const VALID_CONDITIONS = new Set(["new", "used", "refurbished", "na"]);

/* ------------------------------------------------------------- helpers ----- */

// Normalize a listing's `media` array: any entry whose `url` is a "data:" URL is
// stored via lib/uploadStorage and replaced with its "/uploads/…" path; plain URLs
// (and non-object entries) pass through untouched.
async function resolveMediaList(media) {
  if (!Array.isArray(media)) return media;
  return Promise.all(
    media.map(async (m) =>
      m && typeof m === "object" && typeof m.url === "string"
        ? { ...m, url: await resolveUpload(m.url) }
        : m
    )
  );
}

// A bad inline upload ("data:" URL failing validation) → the matching 4xx JSON;
// everything else is rethrown to the error handler.
function uploadFail(res, err, next) {
  if (err && err.isUploadInputError) {
    return res.status(err.status || 400).json({ success: false, error: err.message });
  }
  return next(err);
}

function normalizeCondition(c) {
  return VALID_CONDITIONS.has(c) ? c : "na";
}

/** Coerce a boolean-ish value (accepts true/"true"). */
function toBool(v) {
  return v === true || v === "true";
}

/**
 * Normalize a client-supplied serviceCities array: keep only objects with a city,
 * coerce {city,state} to trimmed strings, drop the rest, and cap the list at 30.
 */
function normalizeServiceCities(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const city = String(raw.city || "").trim();
    if (!city) continue;
    out.push({ city, state: String(raw.state || "").trim() });
    if (out.length >= 30) break;
  }
  return out;
}

function priceOf(l) {
  return l.product && typeof l.product.price === "number" ? l.product.price : null;
}

/**
 * productKeyOf(listing) — the normalized grouping key for MULTI-VENDOR-PER-PRODUCT.
 *
 * The SAME product sold by different sellers shares one key: slugify(brand + title).
 * slugify already lowercases, strips punctuation, and collapses whitespace, so two
 * listings with the same brand + core title collapse to the same key (e.g. a Havells
 * wire listed by three sellers). Computed at create/update time AND at read time so it
 * works for existing seed data without a migration.
 */
function productKeyOf(listing) {
  const brand = (listing && listing.product && listing.product.brand) || "";
  const title = (listing && listing.title) || "";
  return slugify(`${brand} ${title}`.trim());
}

/**
 * Resolve the canonical categoryPath/legacyCategory for a listing from its
 * categoryId (falling back to an explicit category slug/name), by looking the
 * category up in categories.json. This is the SERVER-SIDE source of truth —
 * category browse pages filter listings by categoryPath (see lib/search.js
 * matchesCategorySlug), so a listing whose categoryPath was left empty (e.g. a
 * client that only sent categoryId) would silently never appear on its own
 * category page even though it's active and the seller is approved.
 */
async function resolveCategoryFields({ categoryId, categorySlugOrName }) {
  const categories = await directory.categoriesRepo.findMany({});
  let cat = null;
  if (categoryId) {
    cat = categories.find((c) => c.id === categoryId) || null;
  }
  if (!cat && categorySlugOrName) {
    const s = slugify(categorySlugOrName);
    cat = categories.find((c) => c.slug === s || slugify(c.name) === s) || null;
  }
  if (!cat) return { categoryId: categoryId || null, categoryPath: [], legacyCategory: null };
  return {
    categoryId: cat.id,
    categoryPath: Array.isArray(cat.path) && cat.path.length ? cat.path : [cat.slug],
    legacyCategory: cat.name || null,
  };
}

function isOwnerOrAdmin(user, listing) {
  if (!user) return false;
  if ((user.roles || []).includes("admin")) return true;
  return listing.sellerId === user.id;
}

/** Strip internal scratch fields before returning to clients. */
function clean(l) {
  const { _relevance, _finalScore, _paidTerm, _distanceKm, ...rest } = l;
  return rest;
}

/** Sort by distance to the `near` city, nearest first; unknown distances last. */
function sortByDistance(list) {
  return list.slice().sort((a, b) => {
    const da = a._distanceKm;
    const db = b._distanceKm;
    if (da === null && db === null) return 0;
    if (da === null) return 1; // unknown-distance listings sort last
    if (db === null) return -1;
    return da - db;
  });
}

function deterministicSort(list, sort) {
  const arr = list.slice();
  const priceCmp = (dir) => (a, b) => {
    const pa = priceOf(a);
    const pb = priceOf(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1; // nulls last
    if (pb === null) return -1;
    return dir * (pa - pb);
  };
  switch (sort) {
    case "price_asc":
      return arr.sort(priceCmp(1));
    case "price_desc":
      return arr.sort(priceCmp(-1));
    case "rating":
      return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "newest":
      return arr.sort(
        (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
      );
    default:
      return arr;
  }
}

/** Minimal sellerProfile, lazily created the first time a user publishes (DESIGN §3.1). */
function minimalSellerProfile(user) {
  return {
    companyName: user.name || "",
    slug: slugify(user.name || "seller") + "-" + String(user.id).replace(/[^a-z0-9]/gi, ""),
    about: "",
    logo: null,
    coverImage: null,
    gstNumber: null,
    yearEstablished: null,
    employeeCount: null,
    certifications: [],
    website: null,
    contactMobile: user.mobile || null,
    contactEmail: user.email || null,
    location: { city: user.city || "", state: user.state || "", pincode: null },
    legacyCategories: [],
    status: "pending",
    isVerified: false,
    trustSealVerified: false,
    verifiedBadgeExpiry: null,
    rating: 0,
    reviewCount: 0,
    responseRate: 0,
    performance: {},
    planId: null,
    planTier: "free",
    planStartDate: null,
    planEndDate: null,
    planStatus: "inactive",
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
}

function buildProductBlock(input = {}) {
  return {
    sku: input.sku ?? null,
    price: input.price !== undefined && input.price !== null && input.price !== "" ? Number(input.price) : null,
    currency: input.currency || "INR",
    priceTiers: Array.isArray(input.priceTiers) ? input.priceTiers : [],
    unitOfMeasure: input.unitOfMeasure || "unit",
    moq: input.moq !== undefined && input.moq !== null && input.moq !== "" ? Number(input.moq) : 1,
    stockQty: input.stockQty ?? null,
    availability: input.availability || "in_stock",
    leadTime: input.leadTime ?? null,
    specifications: input.specifications && typeof input.specifications === "object" ? input.specifications : {},
    certifications: Array.isArray(input.certifications) ? input.certifications : [],
    variants: Array.isArray(input.variants) ? input.variants : [],
    sampleAvailable: !!input.sampleAvailable,
    condition: normalizeCondition(input.condition),
  };
}

function buildServiceBlock(input = {}) {
  return {
    rateCard: Array.isArray(input.rateCard) ? input.rateCard : [],
    pricingModel: input.pricingModel || "quote",
    serviceArea: Array.isArray(input.serviceArea) ? input.serviceArea : [],
    serviceMode: input.serviceMode || "onsite",
    availabilitySchedule: input.availabilitySchedule ?? null,
    credentials: Array.isArray(input.credentials) ? input.credentials : [],
    experienceYears: input.experienceYears !== undefined && input.experienceYears !== null && input.experienceYears !== "" ? Number(input.experienceYears) : 0,
    teamSize: input.teamSize ?? null,
    portfolio: Array.isArray(input.portfolio) ? input.portfolio : [],
    sla: input.sla ?? null,
    warranty: input.warranty ?? null,
    bookingType: input.bookingType || "enquiry",
  };
}

/** Loose boolean coercion for CSV cells: yes/y/true/1 → true (case-insensitive). */
function toBoolLoose(v) {
  if (v === true) return true;
  const s = String(v == null ? "" : v).trim().toLowerCase();
  return s === "yes" || s === "y" || s === "true" || s === "1";
}

/**
 * Pick a sensible default /demo image for a bulk-created listing from its category.
 * Keyword-matches the category slug/name/path to one of the local /demo themes (every
 * theme ships a "<theme>-1.jpg"); falls back to a generic industry image. This keeps
 * bulk uploads from landing image-less without asking non-technical sellers for a URL.
 */
const BULK_IMAGE_THEMES = [
  [/textile|fabric|yarn|apparel|garment|cloth|leather/, "textile"],
  [/metal|steel|alloy|iron|alumin/, "metal"],
  [/machine|tool|equipment|industrial|pump|motor/, "machinery"],
  [/agri|farm|crop|seed|grain|fertil/, "agriculture"],
  [/food|beverage|grocery|spice|snack|dairy/, "food"],
  [/electr|electronic|gadget|led|solar|battery/, "electronics"],
  [/construct|build|cement|brick|hardware|pipe|tile/, "construction"],
  [/chemical|paint|polymer|plastic|rubber|adhesive/, "chemical"],
  [/medic|health|pharma|surgical|hospital|lab/, "medical"],
  [/auto|vehicle|car|automobile|tyre|bike/, "automotive"],
  [/pack|packaging|carton|bag|bottle/, "packaging"],
  [/logistic|transport|freight|courier|shipping/, "logistics"],
  [/home|furnitur|decor|kitchen|appliance/, "home"],
  [/retail|store|shop|gift|stationery/, "retail"],
];

function demoImageForCategory(cat) {
  const hay = `${(cat && cat.slug) || ""} ${(cat && cat.name) || ""} ${
    (cat && Array.isArray(cat.path) && cat.path.join(" ")) || ""
  }`.toLowerCase();
  for (const [re, theme] of BULK_IMAGE_THEMES) {
    if (re.test(hay)) return `/demo/${theme}-1.jpg`;
  }
  return "/demo/industry-1.jpg";
}

/* --------------------------------------------------- GET / (browse) -------- */

router.get("/", async (req, res, next) => {
  try {
    const q = req.query.q ? String(req.query.q) : "";
    const sort = req.query.sort ? String(req.query.sort) : "relevance";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const category = req.query.category ? String(req.query.category) : undefined;

    // Geo "near me": distance from each listing's city to `near`, optional radius filter.
    const near = req.query.near ? String(req.query.near) : undefined;
    const rawRadius = req.query.radiusKm;
    const hasRadius =
      near && rawRadius !== undefined && rawRadius !== null && rawRadius !== "";
    const radiusKm = hasRadius ? Number(rawRadius) : null;

    // Public browse: restrict to listings owned by APPROVED sellers. Phase 5c:
    // one indexed query instead of `store.all("users.json")` (a full composite
    // hydrate of every user just to read sellerProfile.status).
    const approvedSellerIds = await identity.getApprovedSellerIds();

    const filters = {
      type: req.query.type ? String(req.query.type) : undefined,
      category,
      city: req.query.city ? String(req.query.city) : undefined,
      state: req.query.state ? String(req.query.state) : undefined,
      verified: req.query.verified === "true" || req.query.verified === true,
      featured: req.query.featured === "true" || req.query.featured === true,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      condition: req.query.condition ? String(req.query.condition) : undefined,
      // Public browse shows only live listings — never "sold" or "inactive".
      status: "active",
      sellerIds: approvedSellerIds,
    };

    // 1. Hard filters + BM25/recency scoring over the full (approved) survivor set.
    const scored = await searchListings({ q, filters });
    let listings = scored.map((s) => ({ ...s.listing, _relevance: s.score }));

    // 1b. When `near` is given, stamp each listing's distance (km) to the target city
    //     and, if a radiusKm is set, drop listings beyond it (unknown distances too).
    if (near) {
      listings = listings.map((l) => ({
        ...l,
        _distanceKm: distanceKm(l.location && l.location.city, near),
      }));
      if (hasRadius && !Number.isNaN(radiusKm)) {
        listings = listings.filter(
          (l) => l._distanceKm !== null && l._distanceKm <= radiusKm
        );
      }
    }

    // 2. Ordering: distance sort (needs `near`) and deterministic sorts skip the
    //    paid-boost blend entirely.
    if (near && sort === "distance") {
      listings = sortByDistance(listings);
    } else if (DETERMINISTIC_SORTS.has(sort)) {
      listings = deterministicSort(listings, sort);
    } else {
      // relevance (default) → blend organic relevance with paid boost (sponsored labeled).
      // Phase 5c: hand ranking a { sellerId -> priorityTier } map from one query
      // instead of letting it `store.all("users.json")`.
      const tierBySeller = await identity.getSellerPriorityTiers(listings.map((l) => l.sellerId));
      listings = await rankListings(listings, { query: q, categorySlug: category, tierBySeller });
    }

    // 3. Facets over the full filtered set (pre-pagination).
    const facets = await computeFacets(listings);

    // 4. Paginate.
    const total = listings.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    // Flat seller mini-object for cards (company name + slug link + trust) — one
    // JOIN over just the page's seller ids (Phase 5c), not a hydrate of every user.
    const pageSlice = listings.slice(start, start + limit);
    const sellerById = await identity.getSellerBrowseCards(pageSlice.map((l) => l.sellerId));
    const pageItems = pageSlice.map((l) => {
      const c = clean(l);
      c.seller = sellerById.get(l.sellerId) || null;
      // When `near` is queried, surface the distance (km, 1 decimal; null if unknown).
      if (near) {
        c.distanceKm =
          l._distanceKm === null || l._distanceKm === undefined
            ? null
            : Math.round(l._distanceKm * 10) / 10;
      }
      return c;
    });

    return res.json({
      success: true,
      data: { listings: pageItems, total, page, totalPages, facets },
    });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- GET /:id (detail) --------- */

router.get("/:id", async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    // Light view tracking (SELLER ANALYTICS): best-effort increment of listing.views.
    // Fire-and-forget. Phase 5d: an ATOMIC single-column UPDATE — the old
    // store.update() read-modify-write was a lost-update race (finding C2) and
    // re-upserted every child table for a display metric.
    directory.bumpListingViews(listing.id).catch(() => {});

    let seller = null;
    const user = await identity.getAuthUser(listing.sellerId);
    if (user) {
      const sp = user.sellerProfile || {};
      // FLAT shape — the frontend's ListingSeller reads seller.slug / .companyName
      // / .city directly. (Nested sellerProfile kept for backward compatibility.)
      seller = {
        id: user.id,
        name: user.name,
        companyName: sp.companyName || user.name || null,
        slug: sp.slug || null,
        city: (sp.location && sp.location.city) || null,
        state: (sp.location && sp.location.state) || null,
        logo: sp.logo || user.avatarUrl || null,
        isVerified: !!sp.isVerified,
        trustSealVerified: !!sp.trustSealVerified,
        gstNumber: sp.gstNumber || null,
        yearEstablished: sp.yearEstablished || null,
        rating: sp.rating ?? 0,
        reviewCount: sp.reviewCount ?? 0,
        responseRate: sp.responseRate ?? 0,
        sellerProfile: {
          companyName: sp.companyName || null,
          slug: sp.slug || null,
          rating: sp.rating ?? 0,
          reviewCount: sp.reviewCount ?? 0,
          isVerified: !!sp.isVerified,
          responseRate: sp.responseRate ?? 0,
          location: sp.location || null,
        },
      };
    }

    return res.json({ success: true, data: { ...clean(listing), seller } });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ GET /:id/offers (other sellers) ------------- */
/**
 * Public: OTHER active listings that are the SAME product (same productKey) as :id,
 * offered by a DIFFERENT approved seller. This powers the "Also offered by N sellers"
 * comparison on the listing-detail page (MULTI-VENDOR-PER-PRODUCT).
 *
 * Keys are computed at read time so existing seed data groups without a migration.
 * Returns { offers[], offerCount, minPrice }; an empty list (200) when nobody else
 * sells it — never a 404.
 */
router.get("/:id/offers", async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }

    const key = productKeyOf(listing);
    // Composite hydrate of every listing is unavoidable here — productKeyOf reads
    // product.brand + title and the offer row reads product/location — but the
    // seller side is now the indexed identity port, not a full users hydrate.
    const [allListings, approvedIds] = await Promise.all([
      directory.listingsRepo.all(),
      identity.getApprovedSellerIds(),
    ]);
    const approvedSellerIds = new Set(approvedIds);

    // Flat seller mini — identity.getSellerBrowseCards is the SAME 11-key shape
    // the browse endpoint builds (id/name/companyName/slug/city/state/logo/
    // isVerified/rating/reviewCount/responseRate), resolved once for just the
    // sellers on this product's other offers (all approved ⇒ all present).
    const matched = allListings.filter(
      (l) =>
        l.id !== listing.id &&
        l.status === "active" &&
        l.sellerId !== listing.sellerId &&
        approvedSellerIds.has(l.sellerId) &&
        productKeyOf(l) === key
    );
    const _sellerCards = await identity.getSellerBrowseCards(matched.map((l) => l.sellerId));
    const sellerMini = (sellerId) => _sellerCards.get(sellerId) || null;

    const offers = matched
      .map((l) => {
        const p = l.product || {};
        return {
          listingId: l.id,
          sellerId: l.sellerId,
          seller: sellerMini(l.sellerId),
          price: typeof p.price === "number" ? p.price : null,
          unitOfMeasure: p.unitOfMeasure || "unit",
          moq: p.moq ?? null,
          location: l.location
            ? { city: l.location.city || null, state: l.location.state || null }
            : null,
          availability: p.availability || null,
        };
      })
      .sort((a, b) => {
        // price ascending, nulls last
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return a.price - b.price;
      });

    const prices = offers.map((o) => o.price).filter((p) => typeof p === "number");
    const minPrice = prices.length ? Math.min(...prices) : null;

    return res.json({
      success: true,
      data: { offers, offerCount: offers.length, minPrice },
    });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- POST / (create) ----------- */

router.post("/", authGuard, async (req, res, next) => {
  try {
    const body = req.body || {};
    const type = body.type;
    if (type !== "product" && type !== "service") {
      return res.status(400).json({ success: false, error: "type must be 'product' or 'service'" });
    }
    if (!body.title || !String(body.title).trim()) {
      return res.status(400).json({ success: false, error: "title is required" });
    }

    // Lazily create a minimal sellerProfile the first time a user publishes (DESIGN §3.1).
    let user = req.user;
    if (!user.sellerProfile) {
      const updated = await identity.updateUser(user.id, {
        sellerProfile: minimalSellerProfile(user),
      });
      user = updated || user;
    }
    const sp = user.sellerProfile || {};

    const category = body.category ? String(body.category) : null;

    // Resolve categoryId/categoryPath/legacyCategory from categories.json so a
    // listing is always findable on its category page, regardless of whether the
    // client sent a full categoryPath (bulk upload) or just a categoryId (the
    // /sell form). Explicit client values win when present.
    const resolvedCategory = await resolveCategoryFields({
      categoryId: body.categoryId || null,
      categorySlugOrName: category,
    });
    const legacyCategory = body.legacyCategory || body.category || resolvedCategory.legacyCategory || null;

    // Location precedence: PAN India → specific service cities → a chosen branch →
    // a raw location/city+state. PAN India serves the whole country (no city).
    const panIndia = toBool(body.panIndia);
    const serviceCities = normalizeServiceCities(body.serviceCities);
    let location = body.location || {
      city: body.city || "",
      state: body.state || "",
      pincode: body.pincode || null,
    };
    let locationId = null;

    if (panIndia) {
      location = { panIndia: true };
    } else if (serviceCities.length > 0) {
      // Denormalize the first service city as the primary display location.
      const first = serviceCities[0];
      location = { city: first.city, state: first.state, pincode: null };
    } else if (body.locationId) {
      // Multi-location: when a branch is chosen, denormalize its city/state/pincode
      // onto the listing and remember which branch it came from.
      const branch = resolveSellerLocations(sp).find((l) => l.id === body.locationId);
      if (branch) {
        location = {
          city: branch.city || "",
          state: branch.state || "",
          pincode: branch.pincode || null,
        };
        locationId = branch.id;
      }
    }
    // Stamp coordinates from the city so listings are geo-searchable ("near me").
    // PAN-India listings have no single city, so this is skipped for them.
    if (!panIndia && location && location.city) {
      const coords = coordsForCity(location.city);
      if (coords) {
        location.lat = coords.lat;
        location.lng = coords.lng;
      }
    }

    const listing = {
      sellerId: user.id,
      type,
      title: String(body.title).trim(),
      slug: body.slug ? slugify(body.slug) : slugify(body.title),
      description: body.description || "",
      categoryId: body.categoryId || resolvedCategory.categoryId || null,
      legacyCategory,
      categoryPath: Array.isArray(body.categoryPath) && body.categoryPath.length
        ? body.categoryPath
        : resolvedCategory.categoryPath.length
        ? resolvedCategory.categoryPath
        : category
        ? [slugify(category)]
        : [],
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      media: Array.isArray(body.media) ? await resolveMediaList(body.media) : [],
      location,
      locationId,
      panIndia,
      serviceCities,
      status: "pending", // gated live by verification below
      createdAt: new Date().toISOString(),
      rating: 0,
      reviewCount: 0,
      isVerifiedSeller: !!sp.isVerified,
      isFeatured: false,
      featuredStartDate: null,
      featuredEndDate: null,
      rankBoostScore: 0,
      isSponsored: false,
      boostToTopLastUsed: null,
      manualPinRank: null,
      product: type === "product" ? buildProductBlock(body.product) : null,
      service: type === "service" ? buildServiceBlock(body.service) : null,
    };

    // Stamp the multi-vendor grouping key so this listing groups with other sellers'
    // matching products (same brand + title) without any schema migration.
    listing.productKey = productKeyOf(listing);

    // AI-VERIFICATION GATE: a new listing is never published blind. It's scored by
    // deterministic checks + (when the local `claude` CLI is available) a semantic
    // review — see lib/listingVerification.js. >=70% AND no AI flags → goes live
    // immediately; otherwise it's held as "pending" for an admin to review in
    // /admin#listing-verification. The seller sees which happened in the response.
    const verification = await verifyListing(listing);
    listing.status = verification.status === "auto_approved" ? "active" : "pending";
    listing.verification = {
      status: verification.status, // auto_approved | needs_review (→ admin_approved | rejected later)
      score: verification.score,
      aiRan: verification.aiRan,
      deterministicChecks: verification.deterministic.checks,
      ai: verification.ai,
      summary: verification.summary,
      createdAt: verification.checkedAt,
      reviewedBy: null,
      reviewedAt: null,
    };

    const saved = await directory.listingsRepo.insert(listing, "lst");
    return res.json({ success: true, data: saved });
  } catch (err) {
    uploadFail(res, err, next);
  }
});

/* --------------------------------------- POST /bulk (bulk catalog upload) --- */
/**
 * Bulk-create listings from a parsed CSV (BULK CATALOG UPLOAD). The client parses the
 * seller's CSV into plain row objects and POSTs `{ rows: [...] }`. Each row uses the
 * template columns: title, type, category_slug, price, unit, moq, brand, description,
 * city, state, pan_india.
 *
 * Per row we validate the required fields (title + price + category_slug), resolve the
 * category slug against categories.json (→ categoryId + categoryPath), and build a
 * listing with the SAME shape as the single-create path (buildProductBlock /
 * buildServiceBlock, productKeyOf, a themed /demo image, panIndia handling). The seller
 * profile is lazily created once for the whole batch. Invalid rows never abort the run:
 * they are collected into `errors` while valid rows are created.
 *
 * Returns { created, errors:[{row, message}] }. `row` is the 1-based index into the
 * received `rows` array. Capped at BULK_MAX_ROWS rows per request.
 */
router.post("/bulk", authGuard, async (req, res, next) => {
  try {
    const body = req.body || {};
    const rows = Array.isArray(body.rows) ? body.rows : null;
    if (!rows) {
      return res
        .status(400)
        .json({ success: false, error: "rows must be an array of row objects" });
    }
    if (rows.length === 0) {
      return res.json({ success: true, data: { created: 0, errors: [] } });
    }
    if (rows.length > BULK_MAX_ROWS) {
      return res.status(400).json({
        success: false,
        error: `Too many rows — max ${BULK_MAX_ROWS} products per upload`,
      });
    }

    // Lazily create a minimal sellerProfile ONCE for the whole batch (DESIGN §3.1).
    let user = req.user;
    if (!user.sellerProfile) {
      const updated = await identity.updateUser(user.id, {
        sellerProfile: minimalSellerProfile(user),
      });
      user = updated || user;
    }
    const sp = user.sellerProfile || {};

    // Category resolver: slug (case-insensitive) → category doc (for id + full path).
    const categories = await directory.categoriesRepo.findMany({});
    const catBySlug = new Map(
      categories.map((c) => [String(c.slug || "").trim().toLowerCase(), c])
    );

    let created = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const raw = rows[i] || {};
      const rowNum = i + 1;
      try {
        const title = String(raw.title || "").trim();
        const categorySlug = String(raw.category_slug || raw.categorySlug || "")
          .trim()
          .toLowerCase();
        const priceCell = raw.price;
        const type =
          String(raw.type || "product").trim().toLowerCase() === "service"
            ? "service"
            : "product";

        // --- required-field validation (title + price + category_slug) ---
        if (!title) {
          errors.push({ row: rowNum, message: "Missing title" });
          continue;
        }
        if (priceCell === undefined || priceCell === null || String(priceCell).trim() === "") {
          errors.push({ row: rowNum, message: "Missing price" });
          continue;
        }
        const price = Number(priceCell);
        if (Number.isNaN(price)) {
          errors.push({ row: rowNum, message: `Price "${priceCell}" is not a number` });
          continue;
        }
        if (!categorySlug) {
          errors.push({ row: rowNum, message: "Missing category_slug" });
          continue;
        }
        const cat = catBySlug.get(categorySlug);
        if (!cat) {
          errors.push({
            row: rowNum,
            message: `Unknown category "${categorySlug}" — use a valid category slug`,
          });
          continue;
        }

        // --- optional fields ---
        const brand = String(raw.brand || "").trim();
        const unit = String(raw.unit || "").trim() || "unit";
        const moqCell = raw.moq;
        const description = String(raw.description || "").trim();
        const panIndia = toBoolLoose(raw.pan_india);
        const city = String(raw.city || "").trim();
        const state = String(raw.state || "").trim();

        // Location: PAN India serves the whole country (no city); otherwise stamp
        // city/state (+ geo coords) exactly like the single-create path.
        let location;
        if (panIndia) {
          location = { panIndia: true };
        } else {
          location = { city, state, pincode: null };
          if (city) {
            const coords = coordsForCity(city);
            if (coords) {
              location.lat = coords.lat;
              location.lng = coords.lng;
            }
          }
        }

        const categoryPath =
          Array.isArray(cat.path) && cat.path.length ? cat.path : [cat.slug];
        const categoryId = cat.id || "cat_" + cat.slug;

        // Product rows reuse buildProductBlock (+ brand, which productKeyOf reads).
        // Service rows seed a single rate-card line from price/unit.
        const product =
          type === "product"
            ? {
                ...buildProductBlock({ price, unitOfMeasure: unit, moq: moqCell }),
                brand: brand || null,
              }
            : null;
        const service =
          type === "service"
            ? buildServiceBlock({ rateCard: [{ label: title, price, unit }] })
            : null;

        const listing = {
          sellerId: user.id,
          type,
          title,
          slug: slugify(title),
          description,
          categoryId,
          legacyCategory: cat.name || null,
          categoryPath,
          keywords: [],
          media: [{ type: "image", url: demoImageForCategory(cat) }],
          location,
          locationId: null,
          panIndia,
          serviceCities: [],
          status: "pending", // bulk rows are never published blind — see verification below
          createdAt: new Date().toISOString(),
          rating: 0,
          reviewCount: 0,
          isVerifiedSeller: !!sp.isVerified,
          isFeatured: false,
          featuredStartDate: null,
          featuredEndDate: null,
          rankBoostScore: 0,
          isSponsored: false,
          boostToTopLastUsed: null,
          manualPinRank: null,
          product,
          service,
        };
        // Stamp the multi-vendor grouping key (brand + title) like the single-create path.
        listing.productKey = productKeyOf(listing);

        // Bulk rows skip the per-row AI review (a 200-row sheet would mean 200 CLI calls)
        // but must not skip verification: they carry the deterministic checks and are held
        // as needs_review, so an admin approves them from the same queue
        // (/admin → listing verification, incl. "approve many") before they go live.
        const det = deterministicChecks(listing);
        listing.verification = {
          status: "needs_review",
          score: det.score,
          aiRan: false,
          deterministicChecks: det.checks,
          ai: null,
          summary: "Bulk upload — held for admin review before going live.",
          createdAt: new Date().toISOString(),
          reviewedBy: null,
          reviewedAt: null,
          source: "bulk",
        };

        await directory.listingsRepo.insert(listing, "lst");
        created += 1;
      } catch (rowErr) {
        errors.push({
          row: rowNum,
          message: (rowErr && rowErr.message) || "Failed to create listing",
        });
      }
    }

    return res.json({ success: true, data: { created, errors } });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------------------- PUT /:id (update) --------- */

// Fields a buyer sees and that verification judged: if any changed, the old approval no
// longer vouches for the listing. Compared after normalisation (media by URL list).
function isMaterialChange(listing, patch) {
  const urls = (m) => (Array.isArray(m) ? m.map((x) => (x && x.url) || "").join("|") : "");
  const norm = (v) => String(v == null ? "" : v).trim();
  if (patch.media !== undefined && urls(patch.media) !== urls(listing.media)) return true;
  if (patch.title !== undefined && norm(patch.title) !== norm(listing.title)) return true;
  if (patch.description !== undefined && norm(patch.description) !== norm(listing.description)) return true;
  if (patch.categoryId !== undefined && norm(patch.categoryId) !== norm(listing.categoryId)) return true;
  if (patch.product && typeof patch.product === "object") {
    const oldBrand = norm(listing.product && listing.product.brand);
    if (patch.product.brand !== undefined && norm(patch.product.brand) !== oldBrand) return true;
  }
  return false;
}

router.put("/:id", authGuard, async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    if (!isOwnerOrAdmin(req.user, listing)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // Allowlist, not blocklist (BACKEND-AUDIT.md S1). A blocklist here let a seller
    // PUT isFeatured / rankBoostScore / isSponsored / manualPinRank (free paid
    // placement), isVerifiedSeller (trust-badge forgery), rating / reviewCount
    // (fake reviews) and verification.status (a 2-step moderation bypass). Those
    // fields are only ever set by the dedicated admin / boost / verification
    // endpoints — never by an owner edit. The set below is exactly what the
    // create route and the frontend edit forms (/sell, dashboard ListingsTab,
    // admin ListingVerificationTab) legitimately write.
    const LISTING_EDITABLE = new Set([
      "title", "slug", "description",
      "category", "categoryId", "legacyCategory", "categoryPath",
      "keywords", "media",
      "location", "locationId", "panIndia", "serviceCities", "city", "state", "pincode",
      "status", "product", "service",
    ]);
    const body = req.body || {};
    const patch = {};
    for (const key of Object.keys(body)) {
      if (LISTING_EDITABLE.has(key)) patch[key] = body[key];
    }
    // A media entry may arrive as a "data:" URL — store it, swap in the /uploads/ path.
    if (patch.media !== undefined) patch.media = await resolveMediaList(patch.media);

    // status may be set to active | inactive | sold (§12 reconciliation), or
    // pending | rejected (AI-verification flow, admin/system-set only below).
    if (patch.status !== undefined && !VALID_LISTING_STATUSES.has(patch.status)) {
      return res
        .status(400)
        .json({ success: false, error: "status must be one of active|inactive|sold|pending|rejected" });
    }
    // AI-VERIFICATION GATE: a non-admin owner can freely toggle active<->inactive/sold
    // once a listing has cleared verification, but can't self-publish a listing that's
    // still needs_review/rejected by simply PUTting status:"active" — only the AI (at
    // create time) or an admin (POST /api/admin/listings/:id/approve) may do that.
    const isAdmin = (req.user.roles || []).includes("admin");
    if (!isAdmin && patch.status === "active") {
      const vStatus = listing.verification && listing.verification.status;
      if (vStatus === "needs_review" || vStatus === "rejected") {
        return res.status(403).json({
          success: false,
          error: "This listing is still awaiting verification — an admin needs to approve it first.",
        });
      }
    }
    // Normalize/default product.condition when a product block is supplied.
    if (patch.product && typeof patch.product === "object") {
      patch.product = {
        ...patch.product,
        condition: normalizeCondition(patch.product.condition),
      };
    }

    // Re-resolve categoryPath/legacyCategory whenever categoryId changes without an
    // explicit categoryPath — same gap as the create route (see resolveCategoryFields).
    if (patch.categoryId !== undefined && !(Array.isArray(patch.categoryPath) && patch.categoryPath.length)) {
      const resolvedCategory = await resolveCategoryFields({
        categoryId: patch.categoryId,
        categorySlugOrName: patch.category ? String(patch.category) : null,
      });
      patch.categoryPath = resolvedCategory.categoryPath;
      if (!patch.legacyCategory && resolvedCategory.legacyCategory) {
        patch.legacyCategory = resolvedCategory.legacyCategory;
      }
    }

    // PAN India: serves the whole country — clear any branch/city and store the flag.
    if (patch.panIndia !== undefined) {
      patch.panIndia = toBool(patch.panIndia);
      if (patch.panIndia) {
        patch.location = { panIndia: true };
        patch.locationId = null;
        patch.serviceCities = [];
      }
    }
    // Specific service cities: denormalize the first as the primary display location
    // (unless this same request is marking the listing PAN India).
    if (patch.serviceCities !== undefined && !patch.panIndia) {
      const sc = normalizeServiceCities(patch.serviceCities);
      patch.serviceCities = sc;
      if (sc.length > 0) {
        const first = sc[0];
        const loc = { city: first.city, state: first.state, pincode: null };
        const coords = coordsForCity(loc.city);
        if (coords) {
          loc.lat = coords.lat;
          loc.lng = coords.lng;
        }
        patch.location = loc;
      }
    }

    // Multi-location: if the listing is reassigned to a branch, denormalize that
    // branch's city/state/pincode (+ geo coords) onto listing.location. Skipped when
    // the same request set PAN India.
    if (patch.locationId && !patch.panIndia) {
      const owner = await identity.getAuthUser(listing.sellerId);
      const branch = resolveSellerLocations(owner && owner.sellerProfile).find(
        (l) => l.id === patch.locationId
      );
      if (branch) {
        const loc = {
          city: branch.city || "",
          state: branch.state || "",
          pincode: branch.pincode || null,
        };
        const coords = coordsForCity(loc.city);
        if (coords) {
          loc.lat = coords.lat;
          loc.lng = coords.lng;
        }
        patch.location = loc;
        patch.locationId = branch.id;
      }
    }

    // A raw city/state location (the edit form's "current location" choice) gets its geo
    // coordinates stamped the same way create does, so "near me" search keeps working.
    if (patch.location && patch.location.city && !patch.panIndia && patch.location.lat === undefined) {
      const coords = coordsForCity(patch.location.city);
      if (coords) patch.location = { ...patch.location, lat: coords.lat, lng: coords.lng };
    }

    // Re-stamp the multi-vendor grouping key from the merged title/brand (store.update
    // shallow-merges, so `product` is replaced wholesale when patched).
    patch.productKey = productKeyOf({ ...listing, ...patch });

    // RE-VERIFICATION: a seller can't change what a buyer sees (photos, title, description,
    // category, brand) on an already-approved listing and keep the approval. Material edits
    // by a non-admin run the same verifier as create; an admin edit is trusted as-is. A price
    // / status / location-only edit is not material and never re-queues the listing.
    if (!isAdmin && isMaterialChange(listing, patch)) {
      const merged = { ...listing, ...patch };
      const verification = await verifyListing(merged);
      patch.verification = {
        status: verification.status,
        score: verification.score,
        aiRan: verification.aiRan,
        deterministicChecks: verification.deterministic.checks,
        ai: verification.ai,
        summary: verification.summary,
        createdAt: verification.checkedAt,
        reviewedBy: null,
        reviewedAt: null,
        reverifiedAfterEdit: true,
      };
      const requested = patch.status !== undefined ? patch.status : listing.status;
      if (verification.status === "auto_approved") {
        // Passed again: keep what the seller asked for, but a held listing goes live.
        patch.status = requested === "pending" || requested === "rejected" ? "active" : requested;
      } else if (["inactive", "sold", "draft"].includes(requested)) {
        patch.status = requested; // seller is taking it down anyway — keep that, flag stays on record
      } else {
        patch.status = "pending"; // held for an admin until they approve it again
      }
    }

    const updated = await directory.listingsRepo.update(req.params.id, patch);
    return res.json({ success: true, data: updated });
  } catch (err) {
    uploadFail(res, err, next);
  }
});

/* --------------------------------------- PUT /:id/sold (mark as sold) ------- */

router.put("/:id/sold", authGuard, async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    if (!isOwnerOrAdmin(req.user, listing)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const updated = await directory.listingsRepo.update(req.params.id, { status: "sold" });
    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* --------------------------------------------- DELETE /:id (delete) -------- */

router.delete("/:id", authGuard, async (req, res, next) => {
  try {
    const listing = await directory.listingsRepo.getById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: "Listing not found" });
    }
    if (!isOwnerOrAdmin(req.user, listing)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    await directory.listingsRepo.remove(req.params.id);
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
