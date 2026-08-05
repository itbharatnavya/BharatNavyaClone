/**
 * seed-experts.js — data layer for the "Consultations" product (a directory of EXPERTS).
 *
 * An EXPERT is a service-provider seller carrying a `sellerProfile.expert` block; a
 * PACKAGE is that seller's fixed-price service listing (type "service"). This script:
 *   1. Enriches existing usr_svc1..5 with the `expert` block.
 *   2. Adds `timeline` + `deliverables` to every existing service listing's `service`.
 *   3. Adds 4 new experts usr_svc6..9 (full seller shape cloned from usr_svc1).
 *   4. Adds their service PACKAGES (lst_s13..lst_s24).
 *
 * Idempotent: re-running upserts (update-if-present, insert-if-absent), so it's safe to
 * run repeatedly without duplicating users or listings. All writes go through lib/store.
 */

const store = require("../lib/store");

/* ------------------------------------------------------------- Part A/1 ---- *
 * The `expert` block for each EXISTING service seller. experienceYears mirrors the
 * seller's service-listing experienceYears; responseTime is derived from their
 * performance.avgResponseTimeHours; clientsServed/caseStudies are plausible demo data.
 */
const EXPERT_BLOCKS = {
  usr_svc1: {
    profession: "Chartered Accountant",
    professionKey: "accounting-tax",
    headline: "GST, tax & audit expertise for SMEs and startups",
    registrationBody: "ICAI",
    registrationNo: "ICAI M. No. 123456",
    credentialVerified: true,
    specializations: ["GST", "Income Tax", "Statutory Audit", "Startup Compliance", "Bookkeeping"],
    languages: ["English", "Hindi", "Marathi"],
    experienceYears: 12,
    consultationModes: ["video", "phone", "in-person"],
    responseTime: "Within 2 hours",
    freeIntroCall: true,
    clientsServed: 480,
    caseStudies: [
      { title: "GST turnaround for a D2C brand", result: "Cleared an 8-month GST backlog and saved ₹3.2L in penalties" },
      { title: "Series-A statutory audit", result: "Audit-ready books delivered in 3 weeks for a funding round" },
    ],
  },
  usr_svc2: {
    profession: "Corporate Lawyer",
    professionKey: "legal",
    headline: "Company law, IP & contracts for growing businesses",
    registrationBody: "Bar Council of Maharashtra & Goa",
    registrationNo: "Enrl. No. MAH/1234/2010",
    credentialVerified: true,
    specializations: ["Company Law", "Trademark & IP", "Contracts", "Compliance"],
    languages: ["English", "Hindi"],
    experienceYears: 15,
    consultationModes: ["video", "phone", "in-person"],
    responseTime: "Within 1 hour",
    freeIntroCall: true,
    clientsServed: 320,
    caseStudies: [
      { title: "Trademark opposition defence", result: "Secured a registered TM and resolved an opposition in 6 months" },
    ],
  },
  usr_svc3: {
    profession: "IT & Software Consultant",
    professionKey: "it-software",
    headline: "Custom software, ERP/CRM and cloud on AWS",
    registrationBody: "",
    registrationNo: "",
    credentialVerified: false,
    specializations: ["Web & Mobile Apps", "ERP/CRM", "Cloud (AWS)", "Custom Software"],
    languages: ["English", "Hindi", "Kannada"],
    experienceYears: 9,
    consultationModes: ["video", "phone"],
    responseTime: "Within 2 hours",
    freeIntroCall: true,
    clientsServed: 140,
    caseStudies: [
      { title: "Logistics ERP rollout", result: "Cut order-processing time by 45% for a 3PL client" },
    ],
  },
  usr_svc4: {
    profession: "Home Services Professional",
    professionKey: "home-services",
    headline: "Reliable AC repair, cleaning & pest control at home",
    registrationBody: "",
    registrationNo: "Background Verified",
    credentialVerified: true,
    specializations: ["AC Repair", "Deep Cleaning", "Pest Control"],
    languages: ["English", "Hindi"],
    experienceYears: 8,
    consultationModes: ["in-person"],
    responseTime: "Within 1 hour",
    freeIntroCall: false,
    clientsServed: 1200,
    caseStudies: [
      { title: "Housing-society AMC", result: "Serviced 120+ AC units across a residential society on a maintenance contract" },
    ],
  },
  usr_svc5: {
    profession: "Packers & Movers",
    professionKey: "logistics",
    headline: "Safe home & office relocation, freight and warehousing",
    registrationBody: "IBA",
    registrationNo: "IBA Approved — Reg. No. IBA/PM/2015",
    credentialVerified: true,
    specializations: ["Home Shifting", "Office Relocation", "Freight", "Warehousing"],
    languages: ["English", "Hindi", "Gujarati"],
    experienceYears: 14,
    consultationModes: ["phone", "in-person"],
    responseTime: "Within 2 hours",
    freeIntroCall: false,
    clientsServed: 900,
    caseStudies: [
      { title: "Multi-city office move", result: "Relocated a 90-seat office across cities with zero business downtime" },
    ],
  },
};

/* ------------------------------------------------------------- Part A/2 ---- *
 * timeline + deliverables to layer onto each EXISTING service listing's `service`.
 * rateCard (the price source) is left untouched.
 */
const LISTING_ENRICH = {
  lst_s01: { timeline: "3–5 working days", deliverables: ["GSTIN registration certificate", "Monthly GSTR-1 & GSTR-3B filing", "Input tax credit reconciliation"] },
  lst_s02: { timeline: "2–3 working days", deliverables: ["Income computation sheet", "Filed ITR-V acknowledgement", "Tax-saving advisory note"] },
  lst_s03: { timeline: "Ongoing / monthly", deliverables: ["Monthly books of accounts", "Payroll processing & payslips", "GST & TDS working"] },
  lst_s04: { timeline: "10–15 working days", deliverables: ["Certificate of Incorporation", "PAN & TAN", "DIN & DSC for directors", "MoA & AoA"] },
  lst_s05: { timeline: "2–4 working days (filing)", deliverables: ["Trademark search report", "TM application filing", "Application number & ™ usage rights"] },
  lst_s06: { timeline: "4–8 weeks", deliverables: ["Source code & repository access", "Deployed web/mobile application", "Documentation & handover"] },
  lst_s07: { timeline: "6–12 weeks", deliverables: ["Configured ERP/CRM instance", "Data migration", "Team training & post-go-live support"] },
  lst_s08: { timeline: "Same-day visit", deliverables: ["On-site diagnosis & repair", "Gas top-up (if required)", "30-day service warranty"] },
  lst_s09: { timeline: "1 working day", deliverables: ["Full-home deep clean", "Kitchen & bathroom sanitisation", "Floor scrubbing & dusting"] },
  lst_s10: { timeline: "1–2 hours per visit", deliverables: ["Cockroach & termite treatment", "One follow-up visit", "Service warranty"] },
  lst_s11: { timeline: "1–3 working days", deliverables: ["Professional packing & material", "Loading, transport & unloading", "Transit insurance option"] },
  lst_s12: { timeline: "Ongoing / as scheduled", deliverables: ["Freight booking & documentation", "Warehousing & inventory management", "Last-mile delivery"] },
};

/* ------------------------------------------------------------- Part B/3 ---- *
 * 4 NEW experts. Only the fields that differ from the usr_svc1 template are listed;
 * monetization/admin fields are cloned from the template so every seller record is
 * structurally complete.
 */
const NEW_EXPERTS = [
  {
    id: "usr_svc6",
    name: "Mehta & Co. Company Secretaries",
    mobile: "9800000106",
    email: "mehta-cs@example.com",
    profile: {
      companyName: "Mehta & Co. Company Secretaries",
      slug: "mehta-co-company-secretaries",
      about: "Company incorporation, ROC compliance, FEMA/FDI advisory and secretarial audit for startups and SMEs.",
      coverImage: "/demo/business-4.jpg",
      city: "Mumbai", state: "Maharashtra",
      gstNumber: "27MEHTA1234C1Z9", yearEstablished: 2009,
      certifications: ["ICSI Member", "Secretarial Auditor"],
      rating: 4.7, reviewCount: 39, responseRate: 96,
      performance: { onTimeDelivery: 96, avgResponseTimeHours: 2, repeatBuyers: 42, orderCompletion: 97, performanceScore: 89 },
    },
    expert: {
      profession: "Company Secretary", professionKey: "company-secretary",
      headline: "Company secretarial, ROC & FEMA compliance done right",
      registrationBody: "ICSI", registrationNo: "ICSI M. No. F7890", credentialVerified: true,
      specializations: ["Company Incorporation", "ROC Compliance", "FEMA/FDI", "Secretarial Audit"],
      languages: ["English", "Hindi", "Marathi"], experienceYears: 16,
      consultationModes: ["video", "phone", "in-person"], responseTime: "Within 2 hours",
      freeIntroCall: true, clientsServed: 260,
      caseStudies: [{ title: "FDI structuring for a funded startup", result: "Set up an FEMA-compliant structure and completed FC-GPR filings on time" }],
    },
  },
  {
    id: "usr_svc7",
    name: "Studio Aangan Architects",
    mobile: "9800000107",
    email: "studio-aangan@example.com",
    profile: {
      companyName: "Studio Aangan Architects",
      slug: "studio-aangan-architects",
      about: "Residential architecture and interior design with 3D visualisation and Vaastu-aligned planning.",
      coverImage: "/demo/business-1.jpg",
      city: "Bengaluru", state: "Karnataka",
      gstNumber: "29AANGN5678D1Z2", yearEstablished: 2015,
      certifications: ["Council of Architecture Registered"],
      rating: 4.8, reviewCount: 33, responseRate: 94,
      performance: { onTimeDelivery: 93, avgResponseTimeHours: 3, repeatBuyers: 35, orderCompletion: 95, performanceScore: 87 },
    },
    expert: {
      profession: "Architect & Interior Designer", professionKey: "architecture",
      headline: "Thoughtful residential & interior design with 3D visualisation",
      registrationBody: "Council of Architecture (COA)", registrationNo: "COA Reg. No. CA/2016/45678", credentialVerified: true,
      specializations: ["Residential Design", "Interior Design", "3D Visualisation", "Vaastu"],
      languages: ["English", "Hindi", "Kannada"], experienceYears: 11,
      consultationModes: ["video", "in-person"], responseTime: "Within 3 hours",
      freeIntroCall: true, clientsServed: 140,
      caseStudies: [{ title: "3BHK full interior", result: "Delivered a complete 3BHK interior in 10 weeks within budget" }],
    },
  },
  {
    id: "usr_svc8",
    name: "PixelForge Digital",
    mobile: "9800000108",
    email: "pixelforge@example.com",
    profile: {
      companyName: "PixelForge Digital",
      slug: "pixelforge-digital",
      about: "SEO, social media, performance advertising and brand identity for growing D2C and B2B brands.",
      coverImage: "/demo/business-5.jpg",
      city: "Pune", state: "Maharashtra",
      gstNumber: "27PIXFG9012E1Z4", yearEstablished: 2018,
      certifications: ["Google Ads Certified", "Meta Blueprint"],
      rating: 4.6, reviewCount: 41, responseRate: 95,
      performance: { onTimeDelivery: 94, avgResponseTimeHours: 2, repeatBuyers: 48, orderCompletion: 96, performanceScore: 88 },
    },
    expert: {
      profession: "Digital Marketing Consultant", professionKey: "marketing",
      headline: "SEO, social & performance marketing that drives growth",
      registrationBody: "", registrationNo: "", credentialVerified: false,
      specializations: ["SEO", "Social Media", "Performance Ads", "Brand Identity"],
      languages: ["English", "Hindi"], experienceYears: 8,
      consultationModes: ["video", "phone"], responseTime: "Within 2 hours",
      freeIntroCall: true, clientsServed: 210,
      caseStudies: [{ title: "Organic growth for a D2C brand", result: "3x organic traffic and 2.1x ROAS within 6 months" }],
    },
  },
  {
    id: "usr_svc9",
    name: "Vriddhi Business Advisors",
    mobile: "9800000109",
    email: "vriddhi-advisors@example.com",
    profile: {
      companyName: "Vriddhi Business Advisors",
      slug: "vriddhi-business-advisors",
      about: "Business planning, fundraising, go-to-market strategy and financial modelling for founders.",
      coverImage: "/demo/business-2.jpg",
      city: "Delhi", state: "Delhi",
      gstNumber: "07VRDDH3456F1Z6", yearEstablished: 2014,
      certifications: ["MBA — Strategy", "Registered Startup Advisor"],
      rating: 4.9, reviewCount: 28, responseRate: 93,
      performance: { onTimeDelivery: 92, avgResponseTimeHours: 4, repeatBuyers: 38, orderCompletion: 94, performanceScore: 86 },
    },
    expert: {
      profession: "Business & Management Consultant", professionKey: "business",
      headline: "Business planning, fundraising & GTM strategy for founders",
      registrationBody: "", registrationNo: "", credentialVerified: false,
      specializations: ["Business Planning", "Fundraising", "GTM Strategy", "Financial Modelling"],
      languages: ["English", "Hindi"], experienceYears: 13,
      consultationModes: ["video", "phone", "in-person"], responseTime: "Within 4 hours",
      freeIntroCall: true, clientsServed: 95,
      caseStudies: [{ title: "Seed fundraise for a SaaS startup", result: "Built the model & deck and helped close a ₹4 Cr seed round" }],
    },
  },
];

/* ------------------------------------------------------------- Part B/4 ---- *
 * Service PACKAGES for the new experts (lst_s13..lst_s24). All type "service",
 * categoryId reuses the existing "Professional & Consulting Services" bucket — the
 * experts API groups by seller, not category.
 */
const PKG_CATEGORY = { id: "cat_professional-consulting-services", path: ["professional-consulting-services"] };

const NEW_PACKAGES = [
  // usr_svc6 Mehta & Co. (Company Secretary)
  { id: "lst_s13", sellerId: "usr_svc6", title: "Private Limited Company Incorporation", price: 6999, unit: "", pricingModel: "fixed", timeline: "7–10 working days", deliverables: ["Certificate of Incorporation", "PAN, TAN & DIN", "MoA & AoA", "Company PAN-based bank-opening kit"], img: ["/demo/business-4.jpg", "/demo/business-1.jpg"], desc: "End-to-end private limited company registration with all statutory documents." },
  { id: "lst_s14", sellerId: "usr_svc6", title: "Annual ROC Compliance Package", price: 9999, unit: "/year", pricingModel: "fixed", timeline: "Ongoing / annual", deliverables: ["AOC-4 & MGT-7 filing", "Board & AGM minutes", "Statutory registers upkeep"], img: ["/demo/business-1.jpg", "/demo/business-4.jpg"], desc: "Full-year ROC and secretarial compliance so your company stays in good standing." },
  { id: "lst_s15", sellerId: "usr_svc6", title: "FEMA & FDI Advisory", price: 14999, unit: "", pricingModel: "fixed", timeline: "2–3 weeks", deliverables: ["FDI structuring advisory", "FC-GPR / FLA filings", "RBI compliance checklist"], img: ["/demo/business-4.jpg", "/demo/business-2.jpg"], desc: "Advisory and filings for foreign investment and FEMA compliance." },

  // usr_svc7 Studio Aangan (Architecture & Interiors)
  { id: "lst_s16", sellerId: "usr_svc7", title: "Residential Design Consultation", price: 4999, unit: "", pricingModel: "fixed", timeline: "3–5 working days", deliverables: ["Site & requirement study", "Concept mood board", "Preliminary layout options"], img: ["/demo/business-1.jpg", "/demo/business-5.jpg"], desc: "A structured design consultation for your home with concept direction." },
  { id: "lst_s17", sellerId: "usr_svc7", title: "Full Interior Design (3D + drawings)", price: 49999, unit: "", pricingModel: "fixed", timeline: "6–10 weeks", deliverables: ["Detailed 3D visualisations", "Working & furniture drawings", "BOQ & material specifications", "Site coordination"], img: ["/demo/business-5.jpg", "/demo/business-1.jpg"], desc: "Complete interior design with photorealistic 3D and execution drawings." },
  { id: "lst_s18", sellerId: "usr_svc7", title: "Vaastu + Floor Plan", price: 9999, unit: "", pricingModel: "fixed", timeline: "1–2 weeks", deliverables: ["Vaastu evaluation report", "Optimised floor plan", "Correction recommendations"], img: ["/demo/business-1.jpg", "/demo/business-4.jpg"], desc: "Vaastu-aligned floor planning with a detailed evaluation report." },

  // usr_svc8 PixelForge (Marketing & Design)
  { id: "lst_s19", sellerId: "usr_svc8", title: "SEO Audit & Roadmap", price: 7499, unit: "", pricingModel: "fixed", timeline: "5–7 working days", deliverables: ["Technical SEO audit", "Keyword & competitor analysis", "90-day action roadmap"], img: ["/demo/business-5.jpg", "/demo/business-2.jpg"], desc: "A full SEO audit with a prioritised roadmap to grow organic traffic." },
  { id: "lst_s20", sellerId: "usr_svc8", title: "Social Media Management", price: 18000, unit: "/month", pricingModel: "monthly", timeline: "Ongoing / monthly", deliverables: ["Monthly content calendar", "12–16 posts + creatives", "Community management & report"], img: ["/demo/business-2.jpg", "/demo/business-5.jpg"], desc: "Done-for-you social media management across your key channels." },
  { id: "lst_s21", sellerId: "usr_svc8", title: "Brand Identity Kit", price: 24999, unit: "", pricingModel: "fixed", timeline: "2–3 weeks", deliverables: ["Logo & variations", "Colour & typography system", "Brand guidelines document", "Social & stationery templates"], img: ["/demo/business-5.jpg", "/demo/business-1.jpg"], desc: "A complete brand identity kit with logo, system and guidelines." },

  // usr_svc9 Vriddhi (Business Consulting)
  { id: "lst_s22", sellerId: "usr_svc9", title: "Business Plan & Pitch Deck", price: 29999, unit: "", pricingModel: "fixed", timeline: "2–3 weeks", deliverables: ["Investor-ready business plan", "Pitch deck (12–15 slides)", "Financial model summary"], img: ["/demo/business-2.jpg", "/demo/business-3.jpg"], desc: "An investor-ready business plan and pitch deck built with you." },
  { id: "lst_s23", sellerId: "usr_svc9", title: "Fundraising Advisory (retainer)", price: 49999, unit: "/month", pricingModel: "monthly", timeline: "Ongoing / monthly retainer", deliverables: ["Investor outreach strategy", "Data room & deck refinement", "Term-sheet & negotiation support"], img: ["/demo/business-3.jpg", "/demo/business-2.jpg"], desc: "Hands-on fundraising advisory on a monthly retainer through your raise." },
  { id: "lst_s24", sellerId: "usr_svc9", title: "Go-To-Market Strategy", price: 39999, unit: "", pricingModel: "fixed", timeline: "3–4 weeks", deliverables: ["Market & ICP analysis", "Positioning & pricing plan", "Channel & launch playbook"], img: ["/demo/business-2.jpg", "/demo/business-5.jpg"], desc: "A complete go-to-market strategy from positioning to launch playbook." },
];

/* ------------------------------------------------------------- helpers ----- */

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build a full user record for a new expert by cloning the template seller's shape. */
function buildExpertUser(template, nx) {
  // Deep-clone the template sellerProfile so monetization/admin fields are all present.
  const sp = JSON.parse(JSON.stringify(template.sellerProfile));
  const p = nx.profile;
  Object.assign(sp, {
    companyName: p.companyName,
    slug: p.slug,
    about: p.about,
    logo: null,
    coverImage: p.coverImage,
    gstNumber: p.gstNumber,
    yearEstablished: p.yearEstablished,
    certifications: p.certifications,
    website: `https://www.${p.slug.replace(/-/g, "")}.example.com`,
    contactMobile: nx.mobile,
    contactEmail: nx.email,
    location: { city: p.city, state: p.state, pincode: "" },
    status: "approved",
    isVerified: true,
    trustSealVerified: true,
    rating: p.rating,
    reviewCount: p.reviewCount,
    responseRate: p.responseRate,
    performance: p.performance,
    expert: nx.expert,
  });
  return {
    id: nx.id,
    name: nx.name,
    mobile: nx.mobile,
    email: nx.email,
    passwordHash: template.passwordHash, // copied so the record is valid; these never log in
    avatarUrl: null,
    city: p.city,
    state: p.state,
    roles: ["user"],
    sellerProfile: sp,
    createdAt: new Date().toISOString(),
  };
}

/** Build a full service-listing record for a package. */
function buildPackageListing(pkg, seller) {
  const sp = (seller && seller.sellerProfile) || {};
  const loc = sp.location || {};
  return {
    id: pkg.id,
    sellerId: pkg.sellerId,
    type: "service",
    title: pkg.title,
    slug: slugify(pkg.title),
    description: pkg.desc,
    categoryId: PKG_CATEGORY.id,
    legacyCategory: null,
    categoryPath: PKG_CATEGORY.path,
    keywords: pkg.title.toLowerCase().split(/\W+/).filter((w) => w.length > 2),
    media: pkg.img.map((url) => ({ type: "image", url })),
    location: { city: loc.city || null, state: loc.state || null, pincode: "" },
    status: "active",
    createdAt: new Date().toISOString(),
    rating: pkg.price >= 20000 ? 4.8 : 4.6,
    reviewCount: 8 + (pkg.price % 17),
    isVerifiedSeller: !!sp.isVerified,
    isFeatured: false,
    featuredStartDate: null,
    featuredEndDate: null,
    rankBoostScore: 0,
    isSponsored: false,
    boostToTopLastUsed: null,
    manualPinRank: null,
    product: null,
    service: {
      rateCard: [{ label: pkg.pricingModel === "monthly" ? "Per month" : "Fixed", price: pkg.price, unit: pkg.unit }],
      pricingModel: pkg.pricingModel,
      serviceArea: [loc.city || "Remote", "Remote"],
      serviceMode: (seller.sellerProfile.expert.consultationModes || []).includes("in-person")
        ? "on-site/remote"
        : "remote",
      availabilitySchedule: "Mon–Sat, 10am–7pm",
      credentials: sp.certifications || [],
      experienceYears: (seller.sellerProfile.expert && seller.sellerProfile.expert.experienceYears) || 5,
      teamSize: "Small firm",
      portfolio: [],
      sla: `Responds ${(seller.sellerProfile.expert.responseTime || "within a day").toLowerCase()}`,
      warranty: "Service guarantee",
      bookingType: "consultation",
      timeline: pkg.timeline,
      deliverables: pkg.deliverables,
    },
  };
}

/* --------------------------------------------------------------- run ------- */

(async () => {
  const users = await store.all("users.json");
  const listings = await store.all("listings.json");
  const byId = new Map(users.map((u) => [u.id, u]));
  const listById = new Map(listings.map((l) => [l.id, l]));

  let expertsEnriched = 0;
  let listingsEnriched = 0;
  let expertsAdded = 0;
  let packagesAdded = 0;

  // 1) Enrich existing experts (usr_svc1..5) with the `expert` block.
  for (const [uid, expert] of Object.entries(EXPERT_BLOCKS)) {
    const u = byId.get(uid);
    if (!u) {
      console.warn(`  ! missing expert seller ${uid} — skipped`);
      continue;
    }
    await store.update("users.json", uid, {
      sellerProfile: { ...u.sellerProfile, expert },
    });
    expertsEnriched++;
  }

  // 2) Enrich existing service listings with timeline + deliverables.
  for (const [lid, patch] of Object.entries(LISTING_ENRICH)) {
    const l = listById.get(lid);
    if (!l || !l.service) {
      console.warn(`  ! missing service listing ${lid} — skipped`);
      continue;
    }
    await store.update("listings.json", lid, {
      service: { ...l.service, ...patch },
    });
    listingsEnriched++;
  }

  // 3) Add (upsert) the 4 new experts, cloning usr_svc1's full shape.
  const template = byId.get("usr_svc1");
  for (const nx of NEW_EXPERTS) {
    const record = buildExpertUser(template, nx);
    if (byId.get(nx.id)) {
      // Idempotent re-run: refresh the record in place (id preserved by store.update).
      const { id, ...patch } = record;
      await store.update("users.json", nx.id, patch);
    } else {
      await store.insert("users.json", record);
      byId.set(nx.id, record); // so buildPackageListing below can resolve the seller
      expertsAdded++;
    }
  }

  // 4) Add (upsert) the packages for the new experts.
  for (const pkg of NEW_PACKAGES) {
    const seller = byId.get(pkg.sellerId);
    if (!seller) {
      console.warn(`  ! missing seller ${pkg.sellerId} for package ${pkg.id} — skipped`);
      continue;
    }
    const listing = buildPackageListing(pkg, seller);
    if (listById.get(pkg.id)) {
      const { id, ...patch } = listing;
      await store.update("listings.json", pkg.id, patch);
    } else {
      await store.insert("listings.json", listing);
      packagesAdded++;
    }
  }

  // Totals for the summary line.
  const usersNow = await store.all("users.json");
  const listingsNow = await store.all("listings.json");
  const totalExperts = usersNow.filter(
    (u) => u.sellerProfile && u.sellerProfile.expert && u.sellerProfile.status === "approved"
  ).length;
  const totalPackages = listingsNow.filter(
    (l) => l.type === "service" && l.status === "active"
  ).length;

  console.log("\n=== seed-experts summary ===");
  console.log(`  experts enriched (existing usr_svc1..5): ${expertsEnriched}`);
  console.log(`  service listings enriched (timeline+deliverables): ${listingsEnriched}`);
  console.log(`  new experts added (usr_svc6..9):          ${expertsAdded}`);
  console.log(`  new packages added (lst_s13..):           ${packagesAdded}`);
  console.log(`  TOTAL approved experts now:               ${totalExperts}`);
  console.log(`  TOTAL active service packages now:        ${totalPackages}`);
  console.log("Done.");
})().catch((err) => {
  console.error("seed-experts failed:", err);
  process.exit(1);
});
