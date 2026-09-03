/**
 * seed-full-catalog.js — full-taxonomy scratch/demo data.
 *
 * For every LEAF category in DB/categories.json (238 of them, spanning all depths —
 * including the deep-spike branches like Cleaning → Cleaning Equipment → Vacuum
 * Cleaners → Robotic Vacuum Cleaners), inserts 2-3 listings (products, services, or
 * both, matching the leaf's `type`). One demo seller company is created per TOP-LEVEL
 * category (24 total), each based in a different Indian city, and owns every listing
 * generated under that top-level's subtree — so category/sub-category browse pages,
 * seller profiles, and "more from this seller" all have real data to test against.
 *
 * Additive only: uses store.insert() per row (never store.writeJson, which replaces
 * whole collections). Safe to re-run — ids are deterministic, so re-running upserts
 * the same rows rather than duplicating them.
 *
 * Run:  node scripts/seed-full-catalog.js
 */

const store = require("../lib/pg-store");
const auth = require("../lib/auth");

/* ------------------------------------------------------------ small helpers ---- */

// Collapses runs of non-alphanumerics (incl. "&", "–") to a single "-", unlike
// lib/search's slugify which strips them and leaves double-dashes ("cosmetics--makeup").
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pick(arr, seed) {
  return arr[seed % arr.length];
}
function rangeVal(min, max, seed) {
  return min + (seed % Math.max(1, max - min));
}
const IMG_COUNT = {
  agriculture: 5, apparel: 4, automotive: 4, business: 5, chemical: 3, construction: 5,
  electronics: 5, food: 4, home: 4, industry: 4, logistics: 2, machinery: 4, medical: 4,
  metal: 2, packaging: 4, retail: 4, steel: 3, textile: 5,
};
function demoImg(theme, seed) {
  const n = IMG_COUNT[theme] || 4;
  return { type: "image", url: `/demo/${theme}-${(seed % n) + 1}.jpg` };
}

/* --------------------------------------------------------- per-category config -- */
// One entry per TOP-LEVEL category slug. Drives the seller company created for that
// subtree and the templated listings generated for every leaf beneath it.

const TOPCFG = {
  "textiles-fabrics-yarn": {
    city: "Surat", state: "Gujarat", stateCode: "24",
    companyName: "Surat Silk & Textile Mills", nature: "Manufacturer",
    about: "Manufacturer and wholesaler of cotton, silk and synthetic fabrics, yarn and technical textiles, supplying garment units and traders pan-India.",
    certs: ["ISO 9001:2015", "OEKO-TEX Standard 100"], imgTheme: "textile",
    kind: "product", unit: "meter", priceMin: 60, priceMax: 650,
    brands: ["Vardhman", "Suryavanshi Weaves", "Ganga Textiles", "Trident", "Raymond"],
    moqOptions: [50, 100, 200, 500],
  },
  "apparel-clothing-garments": {
    city: "Tiruppur", state: "Tamil Nadu", stateCode: "33",
    companyName: "Tiruppur Knits & Apparel Co.", nature: "Manufacturer",
    about: "Garment manufacturer and exporter of menswear, womenswear, kidswear and workwear with in-house cutting, stitching and printing units.",
    certs: ["ISO 9001:2015", "SEDEX Certified"], imgTheme: "apparel",
    kind: "product", unit: "piece", priceMin: 150, priceMax: 2500,
    brands: ["Cottonworld", "Tirupur Knits", "UrbanFit", "Classic Weave", "Southern Threads"],
    moqOptions: [50, 100, 250, 500],
  },
  "industrial-machinery-equipment": {
    city: "Coimbatore", state: "Tamil Nadu", stateCode: "33",
    companyName: "Coimbatore Precision Machinery Works", nature: "Manufacturer",
    about: "Manufacturer of CNC machines, packaging and material handling equipment for textile, engineering and process industries.",
    certs: ["ISO 9001:2015", "CE Certified"], imgTheme: "machinery",
    kind: "product", unit: "piece", priceMin: 25000, priceMax: 850000,
    brands: ["Precitech", "Coimbatore Engg Works", "IndTech Machines", "Bharat Machine Tools", "Servotech"],
    moqOptions: [1, 2, 5],
  },
  "chemicals-dyes-solvents": {
    city: "Vadodara", state: "Gujarat", stateCode: "24",
    companyName: "Vadodara Chemtech Industries", nature: "Manufacturer",
    about: "Manufacturer of industrial chemicals, dyes, pigments, solvents and specialty chemicals for textile, pharma and process industries.",
    certs: ["ISO 9001:2015", "Responsible Care Certified"], imgTheme: "chemical",
    kind: "product", unit: "kg", priceMin: 90, priceMax: 1400,
    brands: ["Chemtech", "Vadodara Dyechem", "PureChem", "Anand Solvents", "Gujarat Chemicals"],
    moqOptions: [25, 50, 100, 200],
  },
  "electronics-electrical": {
    city: "Bengaluru", state: "Karnataka", stateCode: "29",
    companyName: "Bengaluru Circuit & Electricals", nature: "Distributor",
    about: "Distributor of electronic components, sensors, connectors, LED lighting and switchgear for OEMs, contractors and retailers.",
    certs: ["ISO 9001:2015", "ISI Certified"], imgTheme: "electronics",
    kind: "product", unit: "piece", priceMin: 40, priceMax: 12000,
    brands: ["Havells", "Polycab", "Finolex", "CircuitPro", "Bengaluru Electricals"],
    moqOptions: [10, 25, 50, 100],
  },
  "packaging-printing": {
    city: "Faridabad", state: "Haryana", stateCode: "06",
    companyName: "Faridabad Pack & Print Solutions", nature: "Manufacturer",
    about: "Manufacturer of corrugated boxes, flexible packaging, labels and custom printed cartons for FMCG, e-commerce and industrial clients.",
    certs: ["FSC Certified", "ISO 9001:2015"], imgTheme: "packaging",
    kind: "product", unit: "piece", priceMin: 8, priceMax: 900,
    brands: ["PackRight", "Faridabad Packaging Co.", "EcoPack", "PrintCraft", "BoxIndia"],
    moqOptions: [100, 250, 500, 1000],
  },
  "building-construction": {
    city: "Nagpur", state: "Maharashtra", stateCode: "27",
    companyName: "Nagpur BuildCore Materials", nature: "Distributor",
    about: "Distributor of TMT bars, cement, tiles, sanitaryware, paints and construction aggregates serving contractors and builders across the region.",
    certs: ["ISI Certified", "GreenPro Certified"], imgTheme: "construction",
    kind: "product", unit: "bag", priceMin: 35, priceMax: 850,
    brands: ["UltraTech", "Kajaria", "BuildCore", "Nagpur Cement Traders", "Supreme"],
    moqOptions: [20, 50, 100, 200],
  },
  "automotive-parts-accessories": {
    city: "Ludhiana", state: "Punjab", stateCode: "03",
    companyName: "Ludhiana AutoParts Traders", nature: "Wholesaler",
    about: "Wholesale supplier of engine components, bearings, braking systems, tyres and auto electricals for two-wheelers and passenger vehicles.",
    certs: ["ISO 9001:2015", "IATF Certified Vendors"], imgTheme: "automotive",
    kind: "product", unit: "piece", priceMin: 120, priceMax: 6500,
    brands: ["MRF", "Bosch", "Exide", "Ludhiana Auto Spares", "GearPro"],
    moqOptions: [5, 10, 25, 50],
  },
  "agriculture-farming": {
    city: "Nashik", state: "Maharashtra", stateCode: "27",
    companyName: "Nashik AgroFarm Supplies", nature: "Distributor",
    about: "Distributor of tractor implements, irrigation equipment, seeds, fertilizers and farm tools for retailers and cooperatives.",
    certs: ["ISO 9001:2015", "MSME Registered"], imgTheme: "agriculture",
    kind: "product", unit: "piece", priceMin: 300, priceMax: 45000,
    brands: ["Mahindra Agri", "IFFCO", "Nashik AgroTools", "Kisan Pro", "GreenField"],
    moqOptions: [5, 10, 20, 50],
  },
  "medical-healthcare-supplies": {
    city: "Hyderabad", state: "Telangana", stateCode: "36",
    companyName: "Hyderabad MedSupply Corp", nature: "Distributor",
    about: "Distributor of surgical instruments, disposables, diagnostic equipment and hospital furniture to clinics, hospitals and pharmacies.",
    certs: ["ISO 13485:2016", "CDSCO Registered"], imgTheme: "medical",
    kind: "product", unit: "box", priceMin: 60, priceMax: 18000,
    brands: ["MedTech", "Hyderabad Surgicals", "CarePlus", "LifeLine Medical", "SafeGuard"],
    moqOptions: [10, 25, 50, 100],
  },
  food: {
    city: "Indore", state: "Madhya Pradesh", stateCode: "23",
    companyName: "Indore FoodGrain Traders", nature: "Wholesaler",
    about: "Bulk wholesaler of flour, grains, pulses, spices, edible oils and packaged food for retailers, caterers and institutional buyers.",
    certs: ["FSSAI Licensed", "AGMARK Certified"], imgTheme: "food",
    kind: "product", unit: "bag", priceMin: 40, priceMax: 3200,
    brands: ["AgriPure", "Indore Foods", "Malwa Traders", "GrainKing", "Sattva"],
    moqOptions: [10, 20, 50, 100],
  },
  "home-furniture-furnishings": {
    city: "Jodhpur", state: "Rajasthan", stateCode: "08",
    companyName: "Jodhpur Home & Furnishing House", nature: "Manufacturer",
    about: "Manufacturer and wholesaler of furniture, home decor, bedding, curtains and lighting for retailers and interior designers.",
    certs: ["ISO 9001:2015", "MSME Registered"], imgTheme: "home",
    kind: "product", unit: "piece", priceMin: 250, priceMax: 32000,
    brands: ["Jodhpur Craft House", "UrbanNest", "Rajasthan Furnishings", "HomeStyle", "Marwar Decor"],
    moqOptions: [1, 5, 10, 25],
  },
  tools: {
    city: "Meerut", state: "Uttar Pradesh", stateCode: "09",
    companyName: "Meerut Tools & Hardware Depot", nature: "Wholesaler",
    about: "Wholesale supplier of hand and power tools, hardware, fasteners, safety equipment and cleaning machines for retailers and contractors.",
    certs: ["ISI Certified", "MSME Registered"], imgTheme: "industry",
    kind: "product", unit: "piece", priceMin: 60, priceMax: 15000,
    brands: ["Bosch", "Stanley", "Meerut Hardware Co.", "ToolPro", "Sparkle Clean"],
    moqOptions: [5, 10, 25, 50],
  },
  "metals-steel-alloys": {
    city: "Jamshedpur", state: "Jharkhand", stateCode: "20",
    companyName: "Jamshedpur Steel & Metal Works", nature: "Distributor",
    about: "Distributor of steel, aluminium, copper, stainless steel sheets, pipes and alloys for fabrication and construction industries.",
    certs: ["ISO 9001:2015", "BIS Certified"], imgTheme: "steel",
    kind: "product", unit: "kg", priceMin: 45, priceMax: 320,
    brands: ["Tata Steel", "Jindal", "Jamshedpur Metals", "SteelCraft", "IronWorks"],
    moqOptions: [100, 250, 500, 1000],
  },
  "plastics-polymers-rubber": {
    city: "Vapi", state: "Gujarat", stateCode: "24",
    companyName: "Vapi Polymer & Plastics Industries", nature: "Manufacturer",
    about: "Manufacturer of plastic granules, sheets, films, moulded components and PVC pipes for packaging and industrial use.",
    certs: ["ISO 9001:2015", "MSME Registered"], imgTheme: "industry",
    kind: "product", unit: "kg", priceMin: 40, priceMax: 600,
    brands: ["Supreme", "Vapi Polymers", "FlexiPlast", "DuraPoly", "GreenPlast"],
    moqOptions: [25, 50, 100, 250],
  },
  "pharmaceuticals-lab-supplies": {
    city: "Baddi", state: "Himachal Pradesh", stateCode: "02",
    companyName: "Baddi Pharma & Lab Supplies", nature: "Manufacturer",
    about: "Manufacturer and distributor of formulations, ayurvedic products, lab equipment and reagents for pharmacies and diagnostic labs.",
    certs: ["WHO-GMP Certified", "ISO 13485:2016"], imgTheme: "medical",
    kind: "product", unit: "box", priceMin: 25, priceMax: 8500,
    brands: ["Baddi Pharma", "LabCore", "Himalayan Herbals", "PureLab", "MedFormula"],
    moqOptions: [10, 25, 50, 100],
  },
  "office-stationery-supplies": {
    city: "Noida", state: "Uttar Pradesh", stateCode: "09",
    companyName: "Noida Office & Stationery Mart", nature: "Wholesaler",
    about: "Wholesale supplier of paper, writing instruments, office furniture, printers and pantry supplies for corporate and institutional buyers.",
    certs: ["ISO 9001:2015", "MSME Registered"], imgTheme: "business",
    kind: "product", unit: "piece", priceMin: 15, priceMax: 12000,
    brands: ["Classmate", "Noida Office Supplies", "PaperTrail", "WorkEasy", "DeskPro"],
    moqOptions: [10, 25, 50, 100],
  },
  "beauty-personal-care-wellness": {
    city: "Mumbai", state: "Maharashtra", stateCode: "27",
    companyName: "Mumbai Beauty & Wellness Traders", nature: "Distributor",
    about: "Distributor of skincare, haircare, cosmetics and salon equipment, and an aggregator of spa & wellness service providers across the city.",
    certs: ["ISO 9001:2015", "FSSAI Licensed (cosmetics)"], imgTheme: "retail",
    kind: "both",
    unit: "piece", priceMin: 99, priceMax: 4500,
    brands: ["Lakme", "Biotique", "Mumbai Beauty Co.", "GlowUp", "PureSkin"],
    moqOptions: [10, 25, 50],
    pricingModel: "fixed", rateMin: 499, rateMax: 4999, serviceMode: "on-site/at-salon",
    teamSize: "2-6 staff", experienceYears: [3, 12],
  },
  "gifts-crafts-sports": {
    city: "Jaipur", state: "Rajasthan", stateCode: "08",
    companyName: "Jaipur Gifts & Crafts Emporium", nature: "Manufacturer",
    about: "Manufacturer and wholesaler of handicrafts, corporate gifts, sports goods, toys and festival decor for retailers and event planners.",
    certs: ["MSME Registered", "Handicrafts Export Certified"], imgTheme: "retail",
    kind: "product", unit: "piece", priceMin: 50, priceMax: 6500,
    brands: ["Jaipur Handicrafts", "Rajasthan Arts", "PlayZone", "GiftCraft", "FestiveWorks"],
    moqOptions: [10, 25, 50, 100],
  },
  "home-local-services": {
    city: "Gurugram", state: "Haryana", stateCode: "06",
    companyName: "Gurugram HomeCare Services", nature: "Service Provider",
    about: "On-demand home services provider covering appliance repair, cleaning, plumbing, electrical, pest control and carpentry across the city.",
    certs: ["MSME Registered", "Background-Verified Technicians"], imgTheme: "home",
    kind: "service", pricingModel: "fixed", rateMin: 299, rateMax: 3499,
    serviceMode: "on-site", teamSize: "2-5 technicians", experienceYears: [2, 12],
  },
  accounting: {
    city: "Pune", state: "Maharashtra", stateCode: "27",
    companyName: "Pune TaxPro Accounting Services", nature: "Service Provider",
    about: "CA-led firm offering GST, income tax, bookkeeping, payroll and company registration services for MSMEs and startups.",
    certs: ["ICAI Registered", "MSME Registered"], imgTheme: "business",
    kind: "service", pricingModel: "quote", rateMin: 999, rateMax: 25000,
    serviceMode: "remote/on-site", teamSize: "Small firm (10-20)", experienceYears: [5, 20],
  },
  "professional-consulting-services": {
    city: "Chennai", state: "Tamil Nadu", stateCode: "33",
    companyName: "Chennai Business Consulting Group", nature: "Service Provider",
    about: "Consulting firm covering legal, IT, digital marketing, HR, business strategy and market research for growing businesses.",
    certs: ["ISO 9001:2015", "MSME Registered"], imgTheme: "business",
    kind: "service", pricingModel: "quote", rateMin: 2000, rateMax: 75000,
    serviceMode: "remote/on-site", teamSize: "Boutique firm (15-40)", experienceYears: [4, 18],
  },
  "logistics-transport-warehousing": {
    city: "Delhi", state: "Delhi", stateCode: "07",
    companyName: "Delhi Swift Logistics & Cargo", nature: "Service Provider",
    about: "Pan-India logistics provider offering freight, courier, warehousing, cold chain and last-mile delivery for businesses of every size.",
    certs: ["ISO 9001:2015", "GST Registered Transporter"], imgTheme: "logistics",
    kind: "service", pricingModel: "quote", rateMin: 500, rateMax: 45000,
    serviceMode: "on-site/remote", teamSize: "50+ fleet staff", experienceYears: [6, 22],
  },
  "education-training-events": {
    city: "Kota", state: "Rajasthan", stateCode: "08",
    companyName: "Kota Learning & Training Academy", nature: "Service Provider",
    about: "Training academy and event management partner offering coaching, corporate training, certification programs and event execution.",
    certs: ["ISO 9001:2015", "MSME Registered"], imgTheme: "business",
    kind: "service", pricingModel: "fixed", rateMin: 499, rateMax: 22000,
    serviceMode: "on-site/remote", teamSize: "10-30 trainers", experienceYears: [3, 20],
  },
};

const GRADES = ["Standard", "Premium", "Industrial Grade", "Export Quality", "Grade A"];
const PACKS = ["Standard Pack", "Bulk Pack", "Retail Pack", "Export Pack", "Carton Pack"];
const WARRANTIES = ["6 months", "1 year", "2 years", "As per brand policy", "Replacement warranty"];
const PRODUCT_SUFFIXES = ["", " – Premium", " – Industrial Grade", " (Bulk Pack)"];
const SERVICE_SUFFIXES = ["", " – Annual Plan", " – Express Service"];

function specsFor(seed) {
  return {
    Grade: pick(GRADES, seed),
    Packaging: pick(PACKS, seed + 3),
    Warranty: pick(WARRANTIES, seed + 7),
  };
}

function buildProduct(leaf, cfg, seller, idx, seed, seqId) {
  const brand = pick(cfg.brands, seed + idx);
  const title = `${brand} ${leaf.name}${PRODUCT_SUFFIXES[idx % PRODUCT_SUFFIXES.length]}`;
  const price = rangeVal(cfg.priceMin, cfg.priceMax, seed + idx * 41);
  const moq = pick(cfg.moqOptions, seed + idx * 13);
  return {
    id: `lst_cat${String(seqId).padStart(5, "0")}`,
    sellerId: seller.id, type: "product", title,
    slug: `${slugify(title)}-${seqId}`,
    description: `${title} sourced from ${seller.sellerProfile.companyName}, ${cfg.city}. Quality-assured with pan-India bulk supply.`,
    categoryId: leaf.id, legacyCategory: null, categoryPath: leaf.path.slice(),
    keywords: title.toLowerCase().split(/\W+/).filter((w) => w.length > 2),
    media: [demoImg(cfg.imgTheme, seed + idx), demoImg(cfg.imgTheme, seed + idx + 1)],
    location: { city: cfg.city, state: cfg.state, pincode: "" },
    status: "active", createdAt: new Date().toISOString(),
    rating: Number((4.0 + ((seed + idx) % 10) / 10).toFixed(1)), reviewCount: 3 + ((seed + idx) % 60),
    isVerifiedSeller: true, isFeatured: (seed + idx) % 9 === 0,
    featuredStartDate: null, featuredEndDate: null,
    rankBoostScore: 0, isSponsored: false, boostToTopLastUsed: null, manualPinRank: null,
    productKey: slugify(`${brand} ${leaf.name}`),
    product: {
      sku: `SKU-${leaf.slug.slice(0, 6).toUpperCase()}-${seed}${idx}`, price, currency: "INR",
      priceTiers: [], unitOfMeasure: cfg.unit, moq, stockQty: null, availability: "in_stock",
      leadTime: "3-7 days", sampleAvailable: (seed + idx) % 2 === 0, brand, condition: "new",
      certifications: ["ISI"], variants: [], specifications: specsFor(seed + idx),
    },
    service: null,
  };
}

function buildService(leaf, cfg, seller, idx, seed, seqId) {
  const title = `${leaf.name}${SERVICE_SUFFIXES[idx % SERVICE_SUFFIXES.length]}`;
  const rate = rangeVal(cfg.rateMin, cfg.rateMax, seed + idx * 47);
  const exp = rangeVal(cfg.experienceYears[0], cfg.experienceYears[1], seed + idx * 17);
  return {
    id: `lst_cat${String(seqId).padStart(5, "0")}`,
    sellerId: seller.id, type: "service", title,
    slug: `${slugify(title)}-${seqId}`,
    description: `${title} by ${seller.sellerProfile.companyName}, serving ${cfg.city} and surrounding areas.`,
    categoryId: leaf.id, legacyCategory: null, categoryPath: leaf.path.slice(),
    keywords: title.toLowerCase().split(/\W+/).filter((w) => w.length > 2),
    media: [demoImg(cfg.imgTheme, seed + idx), demoImg(cfg.imgTheme, seed + idx + 1)],
    location: { city: cfg.city, state: cfg.state, pincode: "" },
    status: "active", createdAt: new Date().toISOString(),
    rating: Number((4.0 + ((seed + idx) % 10) / 10).toFixed(1)), reviewCount: 3 + ((seed + idx) % 60),
    isVerifiedSeller: true, isFeatured: (seed + idx) % 9 === 0,
    featuredStartDate: null, featuredEndDate: null,
    rankBoostScore: 0, isSponsored: false, boostToTopLastUsed: null, manualPinRank: null,
    product: null,
    service: {
      rateCard: [{ label: "Starting", price: rate, unit: cfg.pricingModel === "hourly" ? "/hour" : cfg.pricingModel === "quote" ? "onwards" : "onwards" }],
      pricingModel: cfg.pricingModel, serviceArea: [cfg.city, "Remote"], serviceMode: cfg.serviceMode,
      availabilitySchedule: "Mon–Sat, 9am–7pm", credentials: [], experienceYears: exp,
      teamSize: cfg.teamSize, portfolio: [], sla: "Responds within 2-4 hours",
      warranty: "Service guarantee", bookingType: "enquiry", timeline: "1-5 working days",
      deliverables: [`Professional ${leaf.name.toLowerCase()} completion`, "Dedicated service executive", "Post-service support"],
    },
  };
}

function buildSeller(topSlug, cfg) {
  const id = `usr_cat_${slugify(topSlug).replace(/-/g, "").slice(0, 20)}`;
  const emailLocal = cfg.companyName.toLowerCase().replace(/[^a-z]/g, "");
  const s = hash(topSlug);
  return {
    id, name: cfg.companyName, mobile: "98" + String(10000000 + (s % 89999999)).padStart(8, "0").slice(0, 8),
    email: `${emailLocal}@example.com`, avatarUrl: null, city: cfg.city, state: cfg.state, roles: ["user"],
    createdAt: new Date().toISOString(),
    sellerProfile: {
      companyName: cfg.companyName, slug: slugify(cfg.companyName),
      about: cfg.about, logo: null, coverImage: demoImg(cfg.imgTheme, s).url,
      gstNumber: `${cfg.stateCode}ABCDE${1000 + (s % 8999)}F1Z5`, panNumber: `ABCDE${1000 + (s % 8999)}F`,
      cinNumber: `U${20000 + (s % 9999)}${cfg.stateCode}${2005 + (s % 15)}PTC${100000 + (s % 899999)}`,
      annualTurnover: pick(["₹1–5 Cr", "₹5–25 Cr", "₹25–100 Cr"], s), natureOfBusiness: cfg.nature,
      yearEstablished: 2000 + (s % 20), employeeCount: pick(["11-50", "50-200", "200-500"], s),
      website: `https://www.${slugify(cfg.companyName)}.example.com`, certifications: cfg.certs,
      contactMobile: "9800000000", contactEmail: `${emailLocal}@example.com`,
      location: { city: cfg.city, state: cfg.state, pincode: "" }, legacyCategories: [],
      status: "approved", isVerified: true, trustSealVerified: true, verifiedBadgeExpiry: null,
      rating: Number((4.3 + (s % 6) / 10).toFixed(1)), reviewCount: 40 + (s % 80), responseRate: 88 + (s % 11),
      performance: { onTimeDelivery: 94 + (s % 6), avgResponseTimeHours: 1 + (s % 3), repeatBuyers: 40 + (s % 30), orderCompletion: 95 + (s % 5), performanceScore: 88 + (s % 10) },
      planId: null, planTier: s % 2 ? "gold" : "silver", planStartDate: null, planEndDate: null, planStatus: "active",
      listingLimit: null, leadQuotaPerCycle: null, leadsConsumed: 0, leadQuotaResetDate: null,
      featuredCredits: 3, perLeadPrice: null, rankBoostScore: 0, priorityTier: "star",
      isFeaturedSeller: true, featuredStartDate: null, featuredEndDate: null,
      boostCategoryIds: [], boostKeywords: [], boostGeoLocations: [],
      analyticsEnabled: true, accountManagerId: null, adminNotes: null,
    },
  };
}

/* ------------------------------------------------------------------------ main -- */

async function main() {
  const categories = await store.all("categories.json");
  const byId = new Map(categories.map((c) => [c.id, c]));
  const hasChild = new Set(categories.filter((c) => c.parentId).map((c) => c.parentId));
  const leaves = categories.filter((c) => !hasChild.has(c.id));

  const missing = Object.keys(TOPCFG).filter((slug) => !categories.some((c) => c.slug === slug && !c.parentId));
  if (missing.length) throw new Error(`TOPCFG references unknown top-level slugs: ${missing.join(", ")}`);

  const demoHash = await auth.hashPassword("demo123");

  let sellersCreated = 0, productsCreated = 0, servicesCreated = 0, seqId = 1;

  for (const [topSlug, cfg] of Object.entries(TOPCFG)) {
    const seller = buildSeller(topSlug, cfg);
    seller.passwordHash = demoHash;
    await store.insert("users.json", seller, undefined);
    sellersCreated++;

    const topCat = categories.find((c) => c.slug === topSlug && !c.parentId);
    const subtreeLeaves = leaves.filter((l) => l.path[0] === topCat.slug);

    for (const leaf of subtreeLeaves) {
      const seed = hash(leaf.slug) % 9000 + 1;
      const count = 2 + (seed % 2); // 2 or 3

      if (leaf.type === "product" || (leaf.type === "both" && cfg.kind !== "service")) {
        const productCount = leaf.type === "both" ? Math.max(1, count - 1) : count;
        for (let i = 0; i < productCount; i++) {
          const doc = buildProduct(leaf, cfg, seller, i, seed, seqId++);
          await store.insert("listings.json", doc, undefined);
          productsCreated++;
        }
        if (leaf.type === "both") {
          const doc = buildService(leaf, cfg, seller, productCount, seed, seqId++);
          await store.insert("listings.json", doc, undefined);
          servicesCreated++;
        }
      } else if (leaf.type === "service") {
        for (let i = 0; i < count; i++) {
          const doc = buildService(leaf, cfg, seller, i, seed, seqId++);
          await store.insert("listings.json", doc, undefined);
          servicesCreated++;
        }
      }
    }
    console.log(`✓ ${cfg.companyName} (${cfg.city}) — ${subtreeLeaves.length} leaf categories seeded`);
  }

  console.log(`\n=== seed-full-catalog done ===`);
  console.log(`sellers created : ${sellersCreated}`);
  console.log(`products created: ${productsCreated}`);
  console.log(`services created: ${servicesCreated}`);
  console.log(`total listings  : ${productsCreated + servicesCreated}`);
  console.log(`\nAll new sellers use password: demo123`);
}

main().catch((e) => {
  console.error("seed-full-catalog failed:", e);
  process.exit(1);
});
