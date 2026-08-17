/**
 * seed-demo2.js — demo hardening round 2:
 *  1. Password for EVERY user (email+password login) — demo creds printed at the end.
 *  2. Complete, realistic company details (GST / PAN / CIN / turnover / certs / website)
 *     on all seller profiles.
 *  3. Six well-branded product vendors + ~24 branded products (with specs) so category
 *     pages fill up realistically, and each vendor has multiple products ("more from seller").
 * Run: node scripts/seed-demo2.js
 */

const store = require("../lib/store");
const auth = require("../lib/auth");

const KWIMG = {
  "metals-steel-alloys": "steel,metal",
  "electronics-electrical": "electronics,circuit",
  "building-construction": "construction,cement",
  "packaging-printing": "packaging,cardboard",
  "automotive-parts-accessories": "car,tyre",
  "agriculture-farming": "grain,agriculture",
  food: "food,grain",
};
let lock = 500;
const img = (kw) => ({ type: "image", url: `https://loremflickr.com/640/480/${kw}?lock=${lock++}` });
const cover = (kw) => `https://loremflickr.com/1200/300/${kw}?lock=${lock++}`;

function gst(state) { return `${state}ABCDE${1000 + (lock % 8999)}F1Z5`; }
function pan() { return `ABCDE${1000 + (lock % 8999)}F`; }
function cin() { return `U${20000 + (lock % 9999)}MH${2005 + (lock % 15)}PTC${100000 + (lock % 899999)}`; }

function enrich(sp) {
  if (!sp) return sp;
  const state = (sp.location && sp.location.state) || "27";
  sp.gstNumber = sp.gstNumber && sp.gstNumber.length >= 15 ? sp.gstNumber : gst("27");
  sp.panNumber = sp.panNumber || pan();
  sp.cinNumber = sp.cinNumber || cin();
  sp.annualTurnover = sp.annualTurnover || ["₹1–5 Cr", "₹5–25 Cr", "₹25–100 Cr"][lock % 3];
  sp.natureOfBusiness = sp.natureOfBusiness || ["Manufacturer", "Wholesaler", "Distributor", "Service Provider"][lock % 4];
  sp.yearEstablished = sp.yearEstablished || 2000 + (lock % 20);
  sp.employeeCount = sp.employeeCount || ["11-50", "50-200", "200-500"][lock % 3];
  sp.website = sp.website || `https://www.${(sp.slug || "vendor").replace(/-/g, "")}.example.com`;
  if (!sp.certifications || !sp.certifications.length) sp.certifications = ["ISO 9001:2015", "MSME Registered"];
  if (!sp.about || sp.about.length < 40) sp.about = `${sp.companyName} is a trusted ${sp.natureOfBusiness.toLowerCase()} on BharatSource with a strong track record of quality and on-time delivery across India.`;
  lock++;
  return sp;
}

function vendor(id, companyName, city, state, stateCode, catSlug, nature, about, certs) {
  return {
    id, name: companyName, mobile: "97" + String(10000000 + lock * 3).slice(0, 8),
    email: companyName.toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
    passwordHash: null, avatarUrl: null, city, state, roles: ["user"],
    sellerProfile: enrich({
      companyName, slug: companyName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      about, logo: null, coverImage: cover(KWIMG[catSlug] || "factory,industry"),
      gstNumber: gst(stateCode), employeeCount: "50-200", certifications: certs,
      website: null, contactMobile: "9800000000", contactEmail: companyName.toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
      location: { city, state, pincode: "" }, legacyCategories: [], status: "approved",
      natureOfBusiness: nature, isVerified: true, trustSealVerified: true, verifiedBadgeExpiry: null,
      rating: 4.3 + (lock % 6) / 10, reviewCount: 40 + (lock % 80), responseRate: 88 + (lock % 11),
      performance: { onTimeDelivery: 96, avgResponseTimeHours: 1 + (lock % 2), repeatBuyers: 45, orderCompletion: 97, performanceScore: 90 },
      planId: null, planTier: lock % 2 ? "gold" : "silver", planStartDate: null, planEndDate: null, planStatus: "active",
      listingLimit: null, leadQuotaPerCycle: null, leadsConsumed: 0, leadQuotaResetDate: null,
      featuredCredits: 3, perLeadPrice: null, rankBoostScore: 0, priorityTier: "star",
      isFeaturedSeller: true, featuredStartDate: null, featuredEndDate: null,
      boostCategoryIds: [], boostKeywords: [], boostGeoLocations: [],
      analyticsEnabled: true, accountManagerId: null, adminNotes: null,
    }),
    createdAt: new Date().toISOString(),
  };
}

function product(id, sellerId, title, catSlug, brand, price, unit, moq, city, state, specs) {
  const kw = KWIMG[catSlug] || "product,industry";
  return {
    id, sellerId, type: "product", title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + id.slice(-3),
    description: `${title} — ${brand} brand, quality-assured, bulk supply with pan-India delivery.`,
    categoryId: null, legacyCategory: null, categoryPath: [catSlug],
    keywords: [brand.toLowerCase(), ...title.toLowerCase().split(/\s+/)],
    media: [img(kw), img(kw), img(kw)], location: { city, state, pincode: "" },
    status: "active", createdAt: new Date().toISOString(),
    rating: 4.2 + (lock % 7) / 10, reviewCount: 5 + (lock % 40), isVerifiedSeller: true,
    isFeatured: lock % 4 === 0, featuredStartDate: null, featuredEndDate: null,
    rankBoostScore: 0, isSponsored: false, boostToTopLastUsed: null, manualPinRank: null,
    product: {
      sku: "SKU-" + id.toUpperCase().slice(-5), price, currency: "INR", priceTiers: [],
      unitOfMeasure: unit, moq, stockQty: null, availability: "in_stock", leadTime: "3-7 days",
      brand, specifications: specs, certifications: ["ISI"], variants: [], sampleAvailable: true, condition: "new",
    },
    service: null,
  };
}

async function main() {
  const users = await store.all("users.json");
  const listings = await store.all("listings.json");
  const now = new Date().toISOString();

  // 1) passwords for everyone (demo123); admin keeps its own; enrich seller profiles
  const demoHash = await auth.hashPassword("demo123");
  for (const u of users) {
    if (u.id === "usr_admin") continue;
    u.passwordHash = demoHash;
    if (u.sellerProfile) enrich(u.sellerProfile);
  }

  // enrich existing product listings with a brand + specifications
  const BRANDS = ["Tata", "Havells", "UltraTech", "Jindal", "Polycab", "Supreme", "Kajaria", "MRF"];
  for (const l of listings) {
    if (l.type === "product" && l.product && !l.product.brand) {
      l.product.brand = BRANDS[lock % BRANDS.length];
      if (!l.product.specifications || !Object.keys(l.product.specifications).length) {
        l.product.specifications = { Material: "Grade A", Packaging: "Standard", Warranty: "As per brand" };
      }
      lock++;
    }
  }

  // 2) six branded product vendors + products
  const V = [
    vendor("usr_pv1", "Jindal Steel & Metals Depot", "Raipur", "Chhattisgarh", "22", "metals-steel-alloys", "Distributor", "Authorized distributor of SS sheets, MS sections, TMT bars and non-ferrous metals for construction and fabrication.", ["ISO 9001:2015", "BIS Certified"]),
    vendor("usr_pv2", "Bright Electricals & Electronics", "Delhi", "Delhi", "07", "electronics-electrical", "Wholesaler", "Wholesale supplier of LED lighting, switchgear, wires & cables and power backup solutions.", ["ISI", "ISO 9001:2015"]),
    vendor("usr_pv3", "BuildWell Construction Supplies", "Pune", "Maharashtra", "27", "building-construction", "Distributor", "Cement, tiles, sanitaryware, pipes and building materials for contractors and builders.", ["ISI", "GreenPro"]),
    vendor("usr_pv4", "PackRight Industries", "Ahmedabad", "Gujarat", "24", "packaging-printing", "Manufacturer", "Manufacturer of corrugated boxes, protective packaging, tapes and custom printed cartons.", ["FSC", "ISO 9001:2015"]),
    vendor("usr_pv5", "AutoZone Parts Hub", "Chennai", "Tamil Nadu", "33", "automotive-parts-accessories", "Distributor", "Genuine automotive spares — tyres, batteries, brake systems and lubricants for all makes.", ["ISO 9001:2015"]),
    vendor("usr_pv6", "AgriPure Traders", "Indore", "Madhya Pradesh", "23", "agriculture-farming", "Wholesaler", "Bulk supplier of wheat flour (atta), rice, pulses, spices and farm inputs.", ["FSSAI", "APEDA"]),
  ];

  const P = [
    product("usr_pv1a", "usr_pv1", "Stainless Steel Sheet SS 304", "metals-steel-alloys", "Jindal", 210, "kg", 100, "Raipur", "Chhattisgarh", { Grade: "SS 304", Thickness: "0.5–3 mm", Finish: "2B / Mirror" }),
    product("usr_pv1b", "usr_pv1", "MS Angle (Mild Steel)", "metals-steel-alloys", "Tata", 62, "kg", 500, "Raipur", "Chhattisgarh", { Grade: "IS 2062", Size: "25–75 mm", Length: "6 m" }),
    product("usr_pv1c", "usr_pv1", "TMT Reinforcement Bars Fe-500D", "metals-steel-alloys", "Tata", 58, "kg", 1000, "Raipur", "Chhattisgarh", { Grade: "Fe-500D", Diameter: "8–25 mm", Standard: "IS 1786" }),
    product("usr_pv1d", "usr_pv1", "Aluminium Sheet Plain", "metals-steel-alloys", "Jindal", 245, "kg", 50, "Raipur", "Chhattisgarh", { Alloy: "1100", Thickness: "0.8–2 mm" }),

    product("usr_pv2a", "usr_pv2", "LED Bulb 9W (Cool White)", "electronics-electrical", "Havells", 85, "piece", 100, "Delhi", "Delhi", { Wattage: "9W", "Base": "B22", Life: "25000 hrs" }),
    product("usr_pv2b", "usr_pv2", "Copper Flexible Wire 1.5 sqmm", "electronics-electrical", "Polycab", 1450, "coil", 10, "Delhi", "Delhi", { Size: "1.5 sqmm", Length: "90 m", Insulation: "FR PVC" }),
    product("usr_pv2c", "usr_pv2", "MCB 32A Single Pole", "electronics-electrical", "Havells", 165, "piece", 50, "Delhi", "Delhi", { Rating: "32A", "Breaking Capacity": "10kA" }),
    product("usr_pv2d", "usr_pv2", "Inverter Battery 150Ah", "electronics-electrical", "Havells", 12500, "piece", 5, "Delhi", "Delhi", { Capacity: "150Ah", Type: "Tall Tubular", Warranty: "48 months" }),

    product("usr_pv3a", "usr_pv3", "OPC 53 Grade Cement", "building-construction", "UltraTech", 385, "bag", 100, "Pune", "Maharashtra", { Grade: "OPC 53", Weight: "50 kg", Standard: "IS 12269" }),
    product("usr_pv3b", "usr_pv3", "Vitrified Floor Tiles 600x600", "building-construction", "Kajaria", 42, "sqft", 500, "Pune", "Maharashtra", { Size: "600x600 mm", Finish: "Glossy", Thickness: "9 mm" }),
    product("usr_pv3c", "usr_pv3", "CPVC Pipe 1 inch", "building-construction", "Supreme", 210, "piece", 50, "Pune", "Maharashtra", { Size: "1 inch", Length: "3 m", Pressure: "SDR 11" }),
    product("usr_pv3d", "usr_pv3", "Wall Putty (White Cement Based)", "building-construction", "UltraTech", 620, "bag", 40, "Pune", "Maharashtra", { Weight: "40 kg", Coverage: "18–20 sqft/kg" }),

    product("usr_pv4a", "usr_pv4", "Corrugated Box 3-Ply (12x9x6)", "packaging-printing", "PackRight", 18, "piece", 1000, "Ahmedabad", "Gujarat", { Ply: "3-Ply", Size: "12x9x6 in", "Bursting Strength": "6 kg/cm²" }),
    product("usr_pv4b", "usr_pv4", "Air Bubble Roll 1m x 100m", "packaging-printing", "PackRight", 950, "roll", 10, "Ahmedabad", "Gujarat", { Width: "1 m", Length: "100 m", "Bubble Size": "10 mm" }),
    product("usr_pv4c", "usr_pv4", "BOPP Packing Tape 2 inch", "packaging-printing", "PackRight", 38, "piece", 144, "Ahmedabad", "Gujarat", { Width: "2 inch", Length: "65 m", Micron: "40" }),

    product("usr_pv5a", "usr_pv5", "Tubeless Car Tyre 175/65 R14", "automotive-parts-accessories", "MRF", 4200, "piece", 4, "Chennai", "Tamil Nadu", { Size: "175/65 R14", Type: "Tubeless", Warranty: "5 years" }),
    product("usr_pv5b", "usr_pv5", "Car Battery 35Ah", "automotive-parts-accessories", "Exide", 3800, "piece", 5, "Chennai", "Tamil Nadu", { Capacity: "35Ah", Warranty: "36 months" }),
    product("usr_pv5c", "usr_pv5", "Brake Pad Set (Front)", "automotive-parts-accessories", "Bosch", 1250, "set", 10, "Chennai", "Tamil Nadu", { Position: "Front", Material: "Ceramic" }),

    product("usr_pv6a", "usr_pv6", "Whole Wheat Atta 50kg", "agriculture-farming", "AgriPure", 1650, "bag", 20, "Indore", "Madhya Pradesh", { Weight: "50 kg", Type: "Chakki Fresh", "Shelf Life": "6 months" }),
    product("usr_pv6b", "usr_pv6", "Basmati Rice 25kg", "agriculture-farming", "AgriPure", 2100, "bag", 20, "Indore", "Madhya Pradesh", { Weight: "25 kg", Grade: "1121 Steam" }),
    product("usr_pv6c", "usr_pv6", "Toor Dal 30kg", "agriculture-farming", "AgriPure", 3300, "bag", 10, "Indore", "Madhya Pradesh", { Weight: "30 kg", Type: "Unpolished" }),
    product("usr_pv6d", "usr_pv6", "NPK Fertilizer 50kg", "agriculture-farming", "IFFCO", 1350, "bag", 20, "Indore", "Madhya Pradesh", { Grade: "10:26:26", Weight: "50 kg" }),
  ];
  for (const p of P) { p.passwordHash = undefined; delete p.passwordHash; p.product.brand; }
  V.forEach((v) => (v.passwordHash = demoHash));

  const keptUsers = users.filter((u) => !u.id.startsWith("usr_pv"));
  const keptListings = listings.filter((l) => !l.id.startsWith("usr_pv"));
  await store.writeJson("users.json", [...keptUsers, ...V]);
  await store.writeJson("listings.json", [...keptListings, ...P]);

  // reconcile categoryId on new products + recompute featured categories
  const cats = await store.all("categories.json");
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));
  const allListings = await store.all("listings.json");
  for (const l of allListings) {
    if (!l.categoryId && l.categoryPath && l.categoryPath[0] && catBySlug[l.categoryPath[0]]) {
      l.categoryId = catBySlug[l.categoryPath[0]].id;
      l.categoryPath = catBySlug[l.categoryPath[0]].path;
    }
  }
  await store.writeJson("listings.json", allListings);

  console.log(`passwords: set demo123 for ${keptUsers.length - 1 + V.length} demo users`);
  console.log(`vendors: +${V.length} branded product vendors with full company details`);
  console.log(`products: +${P.length} branded products with specs`);
  console.log(`\nDEMO LOGINS (email / password):`);
  console.log(`  admin@bharatsource.in / <ADMIN_PASSWORD env, or the value migrate-users.js printed>   (admin)`);
  console.log(`  ⚠ demo123 accounts below are DEMO ONLY — wipe/rotate before go-live (see SECURITY.md)`);
  [...keptUsers.filter((u) => u.sellerProfile).slice(0, 3), ...V.slice(0, 3)].forEach((u) => console.log(`  ${u.email} / demo123   (${u.sellerProfile ? u.sellerProfile.companyName : u.name})`));
  console.log(`  any buyer: rohan.mehta@example.com / demo123`);
}

main().catch((e) => { console.error(e); process.exit(1); });
