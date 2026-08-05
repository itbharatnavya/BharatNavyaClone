/**
 * seed-demo.js — make the marketplace demo-ready:
 *  1. Category-relevant images on every listing (gallery), seller covers, and stories.
 *  2. A full SERVICES side — CA/accounting, legal/compliance, IT, home services,
 *     logistics providers (company profiles) with service listings — so the demo shows
 *     products AND services (the original vision: "hire a CA … source steel … sell flour").
 *  3. Re-pick homepage featured categories to include a service category.
 *
 * Images use loremflickr (category-keyword real photos, deterministic via ?lock=).
 * Run: node scripts/seed-demo.js
 */

const store = require("../lib/store");

// top-level slug -> image search keywords
const KW = {
  "textiles-fabrics-yarn": "textile,fabric",
  "apparel-clothing-garments": "clothing,apparel",
  "industrial-machinery-equipment": "machine,industrial",
  "chemicals-dyes-solvents": "chemical,laboratory",
  "electronics-electrical": "electronics,circuit",
  "packaging-printing": "packaging,cardboard",
  "building-construction": "construction,building",
  "automotive-parts-accessories": "car,automotive",
  "agriculture-farming": "agriculture,farm",
  "medical-healthcare-supplies": "medical,hospital",
  food: "food,grocery",
  "home-furniture-furnishings": "furniture,interior",
  tools: "tools,hardware",
  "metals-steel-alloys": "steel,metal",
  "plastics-polymers-rubber": "plastic,industry",
  "pharmaceuticals-lab-supplies": "pharmacy,medicine",
  "office-stationery-supplies": "office,stationery",
  "beauty-personal-care-wellness": "cosmetics,beauty",
  "gifts-crafts-sports": "gift,craft",
  "home-local-services": "home,repair",
  accounting: "accounting,finance",
  "professional-consulting-services": "business,office",
  "logistics-transport-warehousing": "logistics,warehouse",
  "education-training-events": "education,training",
};

let lock = 1;
function img(keywords) {
  return { type: "image", url: `https://loremflickr.com/640/480/${keywords}?lock=${lock++}` };
}
function coverImg(keywords) {
  return `https://loremflickr.com/1200/300/${keywords}?lock=${lock++}`;
}
function kwFor(cats, listing) {
  const top = (listing.categoryPath && listing.categoryPath[0]) || null;
  if (top && KW[top]) return KW[top];
  const legacy = (listing.legacyCategory || "").toLowerCase();
  const hit = Object.entries(KW).find(([slug]) => slug.includes(legacy) || legacy.includes(slug.split("-")[0]));
  return (hit && hit[1]) || "product,industry";
}

async function main() {
  const cats = await store.all("categories.json");
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));
  const now = new Date().toISOString();

  // ---------- 1. images on existing listings ----------
  const listings = await store.all("listings.json");
  for (const l of listings) {
    const kw = kwFor(cats, l);
    l.media = [img(kw), img(kw), img(kw)];
  }

  // ---------- service-provider sellers + service listings ----------
  const svc = (id, companyName, city, state, catSlug, about, certs) => ({
    id,
    name: companyName,
    mobile: "98" + Math.floor(10000000 + lock * 7).toString().slice(0, 8),
    email: companyName.toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
    passwordHash: null,
    avatarUrl: null,
    city,
    state,
    roles: ["user"],
    sellerProfile: {
      companyName,
      slug: companyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      about,
      logo: null,
      coverImage: coverImg(KW[catSlug] || "office,business"),
      gstNumber: "27AA" + id.toUpperCase().slice(-4) + "A1Z5",
      yearEstablished: 2008 + (lock % 12),
      employeeCount: "50-200",
      certifications: certs,
      website: null,
      contactMobile: "9800000000",
      contactEmail: companyName.toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
      location: { city, state, pincode: "" },
      legacyCategories: [],
      status: "approved",
      isVerified: true,
      trustSealVerified: true,
      verifiedBadgeExpiry: null,
      rating: 4.4 + (lock % 5) / 10,
      reviewCount: 30 + (lock % 60),
      responseRate: 90 + (lock % 9),
      performance: { onTimeDelivery: 95, avgResponseTimeHours: 1 + (lock % 2), repeatBuyers: 40, orderCompletion: 96, performanceScore: 88 },
      planId: null, planTier: lock % 2 ? "gold" : "silver", planStartDate: null, planEndDate: null, planStatus: "active",
      listingLimit: null, leadQuotaPerCycle: null, leadsConsumed: 0, leadQuotaResetDate: null,
      featuredCredits: 2, perLeadPrice: null, rankBoostScore: 0, priorityTier: "star",
      isFeaturedSeller: true, featuredStartDate: null, featuredEndDate: null,
      boostCategoryIds: [], boostKeywords: [], boostGeoLocations: [],
      analyticsEnabled: true, accountManagerId: null, adminNotes: null,
    },
    createdAt: now,
  });

  const providers = [
    svc("usr_svc1", "Sharma & Associates, Chartered Accountants", "Pune", "Maharashtra", "accounting",
      "GST registration & filing, ITR, statutory audit, bookkeeping and payroll for SMEs and startups across India.",
      ["ICAI Member", "GST Practitioner"]),
    svc("usr_svc2", "LexEdge Legal & Compliance", "Mumbai", "Maharashtra", "professional-consulting-services",
      "Company incorporation, trademark & IP filing, contracts, and ISO/compliance advisory.",
      ["Bar Council", "ISO 9001 Consultant"]),
    svc("usr_svc3", "TechNova IT Solutions", "Bengaluru", "Karnataka", "professional-consulting-services",
      "Web & mobile app development, cloud migration, ERP/CRM implementation and IT support.",
      ["ISO 27001", "AWS Partner"]),
    svc("usr_svc4", "QuickFix Home Services", "Delhi", "Delhi", "home-local-services",
      "AC repair, deep cleaning, pest control, plumbing and electrician services — verified professionals.",
      ["Background Verified"]),
    svc("usr_svc5", "SwiftMove Packers & Logistics", "Ahmedabad", "Gujarat", "logistics-transport-warehousing",
      "Packers & movers, freight forwarding, cold-chain and warehousing across 20,000+ pincodes.",
      ["IBA Approved"]),
  ];

  const svcListing = (id, sellerId, title, catSlug, desc, city, state, model, rate, exp, area) => {
    const cat = catBySlug[catSlug];
    const kw = KW[catSlug] || "business,office";
    return {
      id, sellerId, type: "service", title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: desc, categoryId: cat ? cat.id : null,
      legacyCategory: null, categoryPath: cat ? cat.path : [catSlug],
      keywords: title.toLowerCase().split(/\s+/), media: [img(kw), img(kw)],
      location: { city, state, pincode: "" }, status: "active", createdAt: now,
      rating: 4.5, reviewCount: 20 + (lock % 40), isVerifiedSeller: true,
      isFeatured: lock % 3 === 0, featuredStartDate: null, featuredEndDate: null,
      rankBoostScore: 0, isSponsored: false, boostToTopLastUsed: null, manualPinRank: null,
      product: null,
      service: {
        rateCard: [{ label: rate.label, price: rate.price, unit: rate.unit }],
        pricingModel: model, serviceArea: area, serviceMode: "on-site/remote",
        availabilitySchedule: "Mon–Sat, 9am–7pm", credentials: [], experienceYears: exp,
        teamSize: "Small firm", portfolio: [], sla: "Responds within 2 hours",
        warranty: "Service guarantee", bookingType: "enquiry",
      },
    };
  };

  const serviceListings = [
    svcListing("lst_s01", "usr_svc1", "GST Registration & Monthly Return Filing", "accounting", "End-to-end GST registration and monthly GSTR-1/3B filing for businesses.", "Pune", "Maharashtra", "fixed", { label: "Starting", price: 1499, unit: "/month" }, 12, ["Pune", "Mumbai", "Remote"]),
    svcListing("lst_s02", "usr_svc1", "Income Tax Return (ITR) Filing", "accounting", "ITR filing for individuals and businesses with expert review.", "Pune", "Maharashtra", "fixed", { label: "From", price: 999, unit: "/return" }, 12, ["Pan-India (Remote)"]),
    svcListing("lst_s03", "usr_svc1", "Bookkeeping & Payroll Management", "accounting", "Monthly bookkeeping, payroll processing and compliance.", "Pune", "Maharashtra", "quote", { label: "Custom", price: 0, unit: "quote" }, 12, ["Maharashtra"]),
    svcListing("lst_s04", "usr_svc2", "Private Limited Company Registration", "professional-consulting-services", "Company incorporation with MCA, DIN, DSC and PAN/TAN.", "Mumbai", "Maharashtra", "fixed", { label: "All-inclusive", price: 6999, unit: "" }, 15, ["Pan-India (Remote)"]),
    svcListing("lst_s05", "usr_svc2", "Trademark Registration & IP Filing", "professional-consulting-services", "Trademark search, filing and objection handling.", "Mumbai", "Maharashtra", "fixed", { label: "From", price: 4999, unit: "" }, 15, ["Pan-India (Remote)"]),
    svcListing("lst_s06", "usr_svc3", "Web & Mobile App Development", "professional-consulting-services", "Custom web and mobile apps — React, Node, Flutter.", "Bengaluru", "Karnataka", "hourly", { label: "Rate", price: 800, unit: "/hour" }, 9, ["Remote"]),
    svcListing("lst_s07", "usr_svc3", "ERP / CRM Implementation", "professional-consulting-services", "ERP and CRM setup, migration and integration.", "Bengaluru", "Karnataka", "quote", { label: "Project", price: 0, unit: "quote" }, 9, ["Remote"]),
    svcListing("lst_s08", "usr_svc4", "Split AC Repair & Service", "home-local-services", "Doorstep AC repair, gas refill and installation by verified technicians.", "Delhi", "Delhi", "fixed", { label: "Visit", price: 499, unit: "/visit" }, 8, ["Delhi NCR"]),
    svcListing("lst_s09", "usr_svc4", "Home Deep Cleaning", "home-local-services", "Full-home deep cleaning — kitchen, bathrooms, sofa & more.", "Delhi", "Delhi", "fixed", { label: "From", price: 2499, unit: "/home" }, 8, ["Delhi NCR"]),
    svcListing("lst_s10", "usr_svc4", "Pest Control (Cockroach & Termite)", "home-local-services", "Herbal and chemical pest control with warranty.", "Delhi", "Delhi", "fixed", { label: "From", price: 899, unit: "" }, 8, ["Delhi NCR"]),
    svcListing("lst_s11", "usr_svc5", "Packers & Movers (Home & Office)", "logistics-transport-warehousing", "Safe relocation with packing, loading, transit insurance.", "Ahmedabad", "Gujarat", "quote", { label: "Custom", price: 0, unit: "quote" }, 14, ["Pan-India"]),
    svcListing("lst_s12", "usr_svc5", "Freight Forwarding & Warehousing", "logistics-transport-warehousing", "Domestic freight, cold-chain and warehousing solutions.", "Ahmedabad", "Gujarat", "quote", { label: "Custom", price: 0, unit: "quote" }, 14, ["Pan-India"]),
  ];

  // ---------- merge users ----------
  const users = await store.all("users.json");
  const keptUsers = users.filter((u) => !u.id.startsWith("usr_svc"));
  for (const u of keptUsers) {
    if (u.sellerProfile) u.sellerProfile.coverImage = coverImg(KW[(u.sellerProfile.legacyCategories && u.sellerProfile.legacyCategories[0] || "").toLowerCase()] || "factory,industry");
  }
  await store.writeJson("users.json", [...keptUsers, ...providers]);

  // ---------- merge listings (drop prior svc listings, add fresh) ----------
  const keptListings = listings.filter((l) => !l.id.startsWith("lst_s"));
  await store.writeJson("listings.json", [...keptListings, ...serviceListings]);

  // ---------- images on stories ----------
  const stories = await store.all("stories.json");
  for (const s of stories) s.media = { type: "image", url: `https://loremflickr.com/400/700/product,shop?lock=${lock++}` };
  await store.writeJson("stories.json", stories);

  // ---------- re-pick featured categories (product + service, with listings) ----------
  const allListings = [...keptListings, ...serviceListings];
  const bySlug = {};
  for (const l of allListings.filter((x) => x.status === "active")) {
    const set = new Set();
    if (l.categoryId) { const c = cats.find((x) => x.id === l.categoryId); if (c) set.add(c.slug); }
    (l.categoryPath || []).forEach((s) => set.add(s));
    set.forEach((s) => (bySlug[s] = (bySlug[s] || 0) + 1));
  }
  const top = cats.filter((c) => !c.parentId).map((c) => ({ slug: c.slug, n: bySlug[c.slug] || 0 })).filter((c) => c.n > 0).sort((a, b) => b.n - a.n).slice(0, 8);
  const settings = await store.readJson("settings.json", {});
  settings.homepage.featuredCategorySlugs = top.map((c) => c.slug);
  await store.writeJson("settings.json", settings);

  console.log(`images: ${allListings.length} listings, ${keptUsers.filter((u) => u.sellerProfile).length + providers.length} seller covers, ${stories.length} stories`);
  console.log(`services: +${providers.length} provider companies, +${serviceListings.length} service listings`);
  console.log(`featured categories: ${top.map((c) => c.slug + ":" + c.n).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
