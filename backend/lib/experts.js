/**
 * experts.js — read helpers for the "Consultations" product (a directory of EXPERTS).
 *
 * An EXPERT is a service-provider seller whose sellerProfile carries an `expert` block
 * (see scripts/seed-experts.js); a PACKAGE is that seller's fixed-price service listing
 * (type "service"). These helpers load users.json + listings.json ONCE and shape the
 * expert summaries / details the routes return, so routes/experts.js stays thin.
 *
 * All reads go through lib/store (the only module that touches the filesystem).
 */

const identity = require("../modules/identity");
const directory = require("../modules/directory");

/* ------------------------------------------------------------- taxonomy ---- *
 * professionKey → human label. The single source of truth for the profession filter;
 * seed data uses these exact keys.
 */
const PROFESSIONS = [
  { key: "accounting-tax", label: "Accounting & Tax" },
  { key: "legal", label: "Legal & Compliance" },
  { key: "company-secretary", label: "Company Secretary" },
  { key: "it-software", label: "IT & Software" },
  { key: "marketing", label: "Marketing & Design" },
  { key: "architecture", label: "Architecture & Interiors" },
  { key: "business", label: "Business Consulting" },
  { key: "home-services", label: "Home Services" },
  { key: "logistics", label: "Logistics & Movers" },
];

/* --------------------------------------------------------------- utils ----- */

/** True when a listing is an EXPERT PACKAGE that should count (active service). */
function isActivePackage(listing) {
  return !!listing && listing.type === "service" && listing.status === "active";
}

/**
 * Flatten a service listing into a package summary the Consultations UI renders.
 * price/unit come from the first rateCard row (the canonical price source).
 */
function packageFromListing(listing) {
  const svc = (listing && listing.service) || {};
  const rate = (svc.rateCard && svc.rateCard[0]) || {};
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    description: listing.description || "",
    price: typeof rate.price === "number" ? rate.price : null,
    unit: rate.unit || "",
    pricingModel: svc.pricingModel || null,
    timeline: svc.timeline || null,
    deliverables: Array.isArray(svc.deliverables) ? svc.deliverables : [],
    mode: svc.serviceMode || null,
  };
}

/**
 * The "from" price shown on an expert card: the minimum fixed package price. Quote-only
 * packages (price 0/absent) don't advertise a price, so they're excluded; null when none
 * of the expert's packages carry a real price.
 */
function priceFromPackages(packages) {
  const prices = packages
    .map((p) => p.price)
    .filter((p) => typeof p === "number" && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Build the flat expert summary from a user record + its active packages. */
function summarize(user, packages) {
  const sp = user.sellerProfile || {};
  const e = sp.expert || {};
  const loc = sp.location || {};
  return {
    id: user.id,
    slug: sp.slug || null,
    name: sp.companyName || user.name || null,
    profession: e.profession || null,
    professionKey: e.professionKey || null,
    headline: e.headline || "",
    city: loc.city || user.city || null,
    state: loc.state || user.state || null,
    logo: sp.logo || user.avatarUrl || null,
    coverImage: sp.coverImage || null,
    isVerified: !!sp.isVerified,
    credentialVerified: !!e.credentialVerified,
    rating: sp.rating ?? 0,
    reviewCount: sp.reviewCount ?? 0,
    responseRate: sp.responseRate ?? null,
    experienceYears: e.experienceYears ?? null,
    specializations: e.specializations || [],
    languages: e.languages || [],
    consultationModes: e.consultationModes || [],
    responseTime: e.responseTime || null,
    freeIntroCall: !!e.freeIntroCall,
    clientsServed: e.clientsServed ?? null,
    packageCount: packages.length,
    priceFrom: priceFromPackages(packages),
    packages: packages.slice(0, 3), // first three summaries for the card
  };
}

/* ----------------------------------------------------------- public API ---- */

/**
 * Every approved expert as a summary. Loads both collections once and groups active
 * service packages by seller in a single pass.
 */
async function listExperts() {
  const [users, listings] = await Promise.all([
    identity.allUsers(),
    directory.listingsRepo.all(),
  ]);

  // seller id -> [package summaries] (active service listings only).
  const packagesBySeller = new Map();
  for (const l of listings) {
    if (!isActivePackage(l)) continue;
    const arr = packagesBySeller.get(l.sellerId) || [];
    arr.push(packageFromListing(l));
    packagesBySeller.set(l.sellerId, arr);
  }

  return users
    .filter(
      (u) =>
        u.sellerProfile &&
        u.sellerProfile.expert &&
        u.sellerProfile.status === "approved"
    )
    .map((u) => summarize(u, packagesBySeller.get(u.id) || []));
}

/**
 * A single expert's full profile by slug, or null if no such APPROVED expert.
 * Extends the summary with about/registration/case-studies, ALL active packages,
 * and the seller's reviews.
 */
async function getExpertBySlug(slug) {
  const [users, listings, reviews] = await Promise.all([
    identity.allUsers(),
    directory.listingsRepo.all(),
    directory.reviewsRepo.findMany({}),
  ]);

  const user = users.find(
    (u) =>
      u.sellerProfile &&
      u.sellerProfile.expert &&
      u.sellerProfile.status === "approved" &&
      u.sellerProfile.slug === slug
  );
  if (!user) return null;

  const sp = user.sellerProfile;
  const e = sp.expert || {};
  const packages = listings
    .filter((l) => l.sellerId === user.id && isActivePackage(l))
    .map(packageFromListing);

  return {
    ...summarize(user, packages),
    about: sp.about || "",
    registrationBody: e.registrationBody || "",
    registrationNo: e.registrationNo || "",
    caseStudies: e.caseStudies || [],
    gstNumber: sp.gstNumber || null,
    yearEstablished: sp.yearEstablished || null,
    packages, // full list (overrides the 3-item summary from summarize())
    reviews: reviews.filter((r) => r.sellerId === user.id),
  };
}

/**
 * Profession filter metadata: the full taxonomy with a live count of experts per key.
 * Computed from an already-loaded expert list so callers control the (unfiltered) set.
 */
function professionsWithCounts(experts) {
  const counts = new Map();
  for (const x of experts) {
    if (!x.professionKey) continue;
    counts.set(x.professionKey, (counts.get(x.professionKey) || 0) + 1);
  }
  return PROFESSIONS.map((p) => ({ ...p, count: counts.get(p.key) || 0 }));
}

/** Distinct, sorted list of cities represented in an expert list (for a city filter). */
function citiesFrom(experts) {
  return [...new Set(experts.map((x) => x.city).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

module.exports = {
  PROFESSIONS,
  packageFromListing,
  listExperts,
  getExpertBySlug,
  professionsWithCounts,
  citiesFrom,
};
