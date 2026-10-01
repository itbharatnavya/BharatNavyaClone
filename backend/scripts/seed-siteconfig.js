/**
 * seed-siteconfig.js — expand settings.json into a rich, admin-editable SITE CONFIG so
 * most of the app is configured from the admin panel with no code changes:
 * branding, homepage hero, feature on/off flags, contact, footer, and ranking.
 *
 * Merges into the existing settings.json (keeps ranking values already seeded).
 * Run: node scripts/seed-siteconfig.js
 */

const store = require("../lib/pg-store");

async function main() {
  const s = await store.readJson("settings.json", {});

  const merged = {
    // --- ranking (kept from monetization seed; defaults if absent) ---
    wOrganic: s.wOrganic ?? 0.7,
    wPaid: s.wPaid ?? 0.3,
    tierBaseline: s.tierBaseline ?? { none: 0, premium: 10, star: 25, leader: 40 },
    maxSponsoredPerPage: s.maxSponsoredPerPage ?? 3,
    relevanceFloorThreshold: s.relevanceFloorThreshold ?? 0.1,
    sponsoredRowEnabled: s.sponsoredRowEnabled ?? true,

    // --- branding (admin-editable) ---
    branding: {
      siteName: "BharatSource",
      tagline: "India's marketplace for everything — products, services & trusted vendors.",
      logoText: "BharatSource",
      accentBlue: "#2563EB",
      accentOrange: "#F97316",
      ...(s.branding || {}),
    },

    // --- homepage (admin-editable, drives the landing page) ---
    homepage: {
      heroTitle: "Find any vendor. Sell anything.",
      heroSubtitle:
        "From a CA for GST filing to a supplier of steel or flour — describe what you need and let AI find the right vendor.",
      heroExamples: [
        "CA in Pune for GST filing",
        "stainless steel sheet suppliers",
        "robotic vacuum cleaner distributor",
        "wheat flour (atta) wholesaler",
      ],
      featuredCategorySlugs: [
        "industrial-machinery-equipment",
        "chemicals-dyes-solvents",
        "metals-steel-alloys",
        "food",
        "accounting",
        "professional-consulting-services",
        "home-local-services",
        "logistics-transport-warehousing",
      ],
      showStories: true,
      showTrending: true,
      showFeaturedSellers: true,
      showCategoryGrid: true,
      ...(s.homepage || {}),
    },

    // --- feature flags: turn any capability on/off from admin, no deploy ---
    featureFlags: {
      chat: true,
      ai: true,
      voiceSearch: true,
      aiAutofill: true,
      stories: true,
      storyHighlights: true,
      blogs: true,
      referral: true,
      follow: true,
      notifications: true,
      reviews: true,
      reports: true,
      nearMe: true,
      mapView: true,
      multiLanguage: true,
      ads: true,
      featuredListings: true,
      ...(s.featureFlags || {}),
    },

    // --- contact / footer (admin-editable) ---
    contact: {
      email: "hello@bharatsource.in",
      phone: "+91 00000 00000",
      address: "India",
      ...(s.contact || {}),
    },
    footer: {
      about: "BharatSource connects buyers, sellers and service providers across India. A mediator platform — we do not process payments or hold inventory.",
      ...(s.footer || {}),
    },
  };

  await store.writeJson("settings.json", merged);
  console.log("site config merged -> DB/settings.json");
  console.log("featureFlags:", Object.keys(merged.featureFlags).length, "| featured categories:", merged.homepage.featuredCategorySlugs.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
