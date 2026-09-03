/**
 * migrate-sellers-listings.js — Phase 1 seed migration.
 *
 * Legacy model had separate `suppliers` (vendors) and `products` (their catalog).
 * The new model is OLX-style: ONE `User` per person/business; a user that sells has a
 * `sellerProfile`; every product/service is a `Listing` owned by a user.
 *
 * This script:
 *   1. Converts each legacy supplier -> a User with a populated sellerProfile.
 *   2. Converts each legacy product  -> a Listing (type: "product") owned by that user.
 * It is idempotent: it strips any previously-migrated sellers (usr_s*) / listings and
 * rebuilds them, preserving the admin + buyer users already in DB/users.json.
 *
 * Category ids are reconciled in Phase 2 (nested taxonomy); we keep `legacyCategory`
 * on each listing/seller in the meantime.
 *
 * Run:  node scripts/migrate-sellers-listings.js
 */

const path = require("path");
const store = require("../lib/pg-store");

const PLAN_TIER = { premium: "gold", free: "free" };

function supIdToUserId(supId) {
  // sup_001 -> usr_s001
  return supId.replace(/^sup_/, "usr_s");
}

function sellerUserFromSupplier(s) {
  return {
    id: supIdToUserId(s.id),
    name: s.companyName, // sellers display as their business name
    mobile: s.contactMobile,
    email: s.contactEmail || null,
    passwordHash: null, // OTP login
    avatarUrl: s.logo || null,
    city: s.location?.city || "",
    state: s.location?.state || "",
    roles: ["user"],
    sellerProfile: {
      companyName: s.companyName,
      slug: s.slug,
      about: s.about || "",
      logo: s.logo || null,
      coverImage: s.coverImage || null,
      gstNumber: s.gstNumber || null,
      yearEstablished: s.yearEstablished || null,
      employeeCount: s.employeeCount || "",
      certifications: s.certifications || [],
      website: s.website || null,
      contactMobile: s.contactMobile,
      contactEmail: s.contactEmail || null,
      location: s.location || { city: "", state: "", pincode: "" },
      legacyCategories: s.categories || [], // reconciled to categoryIds in Phase 2

      // approval + trust
      status: s.status || "pending", // approved | pending | rejected | suspended
      isVerified: !!s.isVerified,
      trustSealVerified: !!s.isVerified,
      verifiedBadgeExpiry: null,
      rating: s.rating || 0,
      reviewCount: s.reviewCount || 0,
      responseRate: s.responseRate || 0,
      performance: s.performance || null,

      // monetization defaults (fully managed in Phase 3)
      planId: null,
      planTier: PLAN_TIER[s.plan] || "free",
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
      analyticsEnabled: s.plan === "premium",
      accountManagerId: null,
      adminNotes: null,
    },
    createdAt: s.createdAt || new Date().toISOString(),
  };
}

function listingFromProduct(p, seller) {
  return {
    id: p.id.replace(/^prod_/, "lst_p"),
    sellerId: supIdToUserId(p.supplierId),
    type: "product",
    title: p.name,
    slug: p.slug,
    description: p.description || "",
    categoryId: null, // set in Phase 2
    legacyCategory: p.category || null,
    categoryPath: [],
    keywords: p.keywords || [],
    media: p.images || [],
    location: seller ? seller.sellerProfile.location : { city: "", state: "", pincode: "" },
    status: p.status === "active" ? "active" : "inactive",
    createdAt: p.createdAt || new Date().toISOString(),

    // trust / discovery
    rating: 0,
    reviewCount: 0,
    isVerifiedSeller: seller ? seller.sellerProfile.isVerified : false,

    // monetization (defaults; managed in Phase 3)
    isFeatured: !!p.featured,
    featuredStartDate: null,
    featuredEndDate: null,
    rankBoostScore: 0,
    isSponsored: false,
    boostToTopLastUsed: null,
    manualPinRank: null,

    // product detail block
    product: {
      sku: null,
      price: typeof p.price === "number" ? p.price : null,
      currency: p.currency || "INR",
      priceTiers: [],
      unitOfMeasure: p.moqUnit || "unit",
      moq: p.moq || 1,
      stockQty: null,
      availability: p.status === "active" ? "in_stock" : "out_of_stock",
      leadTime: null,
      specifications: {},
      certifications: seller ? seller.sellerProfile.certifications : [],
      variants: [],
      sampleAvailable: false,
    },
    service: null,
  };
}

async function main() {
  const suppliers = require(path.join(__dirname, "..", "data", "suppliers.json"));
  const products = require(path.join(__dirname, "..", "data", "products.json"));

  // --- users: keep admin + buyers, replace any prior seller migration ---
  const existing = await store.readJson("users.json", []);
  const kept = existing.filter((u) => !u.id.startsWith("usr_s"));
  const sellers = suppliers.map(sellerUserFromSupplier);
  const sellerById = new Map(sellers.map((u) => [u.id, u]));
  await store.writeJson("users.json", [...kept, ...sellers]);

  // --- listings: rebuild from products ---
  const listings = products.map((p) =>
    listingFromProduct(p, sellerById.get(supIdToUserId(p.supplierId)))
  );
  await store.writeJson("listings.json", listings);

  const statusCounts = sellers.reduce((acc, u) => {
    const st = u.sellerProfile.status;
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  console.log(
    `sellers: ${sellers.length} users-with-sellerProfile (${JSON.stringify(statusCounts)})`
  );
  console.log(`users total: ${kept.length + sellers.length} (kept ${kept.length} admin+buyers)`);
  console.log(`listings: ${listings.length} product listings -> DB/listings.json`);
}

main().catch((e) => {
  console.error("migration failed:", e);
  process.exit(1);
});
