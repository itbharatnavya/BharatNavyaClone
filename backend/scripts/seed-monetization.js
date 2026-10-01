/**
 * seed-monetization.js — Phase 3 seed of the admin-configurable money layer.
 *
 * Writes the five monetization data files that the admin panel + ranking read:
 *   - subscription-plans.json : Free / Silver / Gold plan definitions (DESIGN §3.6, B.3)
 *   - ad-slots.json           : the 4 sellable placements
 *   - ad-bookings.json        : [] (admin books ads here)
 *   - payment-records.json    : [] (the entitlements backbone; admin marks paid/waived)
 *   - settings.json           : ranking weights, tier baselines, feature flags
 *
 * All values are admin-editable afterwards through /api/admin/*. This script is
 * idempotent — it overwrites the five files with the canonical seed.
 *
 * Run:  node scripts/seed-monetization.js
 */

const store = require("../lib/pg-store");

/* ------------------------------------------------------- subscription plans -- */
// Free / Silver / Gold. Every limit field the ranking + entitlement code expects
// is present so a seller's plan alone fully describes its baseline capabilities.
const PLANS = [
  {
    id: "plan_free",
    name: "Free",
    tier: "free",
    billingCycle: "monthly",
    listingLimit: 10, // max active listings
    leadQuotaPerCycle: 5, // free RFQ leads per billing cycle
    featuredCreditsPerCycle: 0,
    rankBoostBaseline: 0, // additive organic boost baseline
    verifiedBadgeIncluded: false,
    analyticsEnabled: false,
    perLeadPrice: 0, // charge for leads beyond quota (₹)
    priceInfo: { monthly: 0, currency: "INR", label: "Free" },
    tierRank: 0, // ordering / precedence among plans
  },
  {
    id: "plan_silver",
    name: "Silver",
    tier: "silver",
    billingCycle: "monthly",
    listingLimit: 50,
    leadQuotaPerCycle: 50,
    featuredCreditsPerCycle: 5,
    rankBoostBaseline: 10,
    verifiedBadgeIncluded: true,
    analyticsEnabled: true,
    perLeadPrice: 20,
    priceInfo: { monthly: 2999, currency: "INR", label: "₹2,999 / mo" },
    tierRank: 1,
  },
  {
    id: "plan_gold",
    name: "Gold",
    tier: "gold",
    billingCycle: "monthly",
    listingLimit: null, // unlimited
    leadQuotaPerCycle: 200,
    featuredCreditsPerCycle: 20,
    rankBoostBaseline: 25,
    verifiedBadgeIncluded: true,
    analyticsEnabled: true,
    perLeadPrice: 10,
    priceInfo: { monthly: 7999, currency: "INR", label: "₹7,999 / mo" },
    tierRank: 2,
  },
];

/* ---------------------------------------------------------------- ad slots -- */
const AD_SLOTS = [
  {
    id: "homepage_banner",
    name: "Homepage Banner",
    placementType: "banner",
    defaultSize: "1200x300",
    isActive: true,
  },
  {
    id: "category_top",
    name: "Category Top Banner",
    placementType: "banner",
    defaultSize: "1200x150",
    isActive: true,
  },
  {
    id: "search_sponsored_row",
    name: "Search Sponsored Row",
    placementType: "sponsored_row",
    defaultSize: "responsive",
    isActive: true,
  },
  {
    id: "listing_sidebar",
    name: "Listing Sidebar",
    placementType: "sidebar",
    defaultSize: "300x250",
    isActive: true,
  },
];

/* ---------------------------------------------------------------- settings -- */
const SETTINGS = {
  wOrganic: 0.7, // weight of organic relevance in the ranking blend
  wPaid: 0.3, // weight of paid boost in the ranking blend
  tierBaseline: { none: 0, premium: 10, star: 25, leader: 40 }, // priorityTier -> boost
  maxSponsoredPerPage: 3,
  relevanceFloorThreshold: 0.1, // sponsored results below this relevance are dropped
  sponsoredRowEnabled: true,
  featureFlags: { chat: true, ai: true, stories: true, blogs: true },
};

async function main() {
  await store.writeJson("subscription-plans.json", PLANS);
  await store.writeJson("ad-slots.json", AD_SLOTS);
  await store.writeJson("ad-bookings.json", []);
  await store.writeJson("payment-records.json", []);
  await store.writeJson("settings.json", SETTINGS);

  console.log("seed-monetization: wrote monetization files ->");
  console.log(`  subscription-plans.json : ${PLANS.length} plans (${PLANS.map((p) => p.name).join(", ")})`);
  console.log(`  ad-slots.json           : ${AD_SLOTS.length} slots (${AD_SLOTS.map((s) => s.id).join(", ")})`);
  console.log(`  ad-bookings.json        : [] (empty)`);
  console.log(`  payment-records.json    : [] (empty)`);
  console.log(`  settings.json           : wOrganic=${SETTINGS.wOrganic} wPaid=${SETTINGS.wPaid}, flags=${JSON.stringify(SETTINGS.featureFlags)}`);
}

main().catch((e) => {
  console.error("seed-monetization failed:", e);
  process.exit(1);
});
