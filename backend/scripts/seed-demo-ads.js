/**
 * seed-demo-ads.js — demo ad-bookings so the advertising feature has something
 * real to show:
 *   • 3 "home_hero" ads — rotate in the Directory main page's ad slot
 *     (components/home/PromoBanner.tsx), which used to hardcode a "Post a
 *     requirement" RFQ banner in that spot instead of real sponsored content.
 *   • 2 more "category_top" ads — rotate in AdSlider on specific category
 *     pages (components/discovery/CategoryLanding.tsx already wires this up),
 *     plus 2 untargeted ones so the Directory home's slot rotates 5 ads.
 *   • 4 "search_top" ads — the search/brand pages' sponsored rail (desktop
 *     sidebar, up to 3 stacked) + in-feed native slots (mobile/tablet list &
 *     grid, DiscoveryResults.tsx / brand page). 4 so the rail's 3-card cap is
 *     actually exercised, not just a single-ad case.
 *
 * All inserted pre-approved (status: "active") since this is demo/seed data,
 * not a real seller submission awaiting admin review — mirrors the existing
 * "adb_demo1" booking already in ad-bookings.json.
 *
 * Additive/idempotent: fixed ids, store.insert() upserts in place on re-run.
 * Run:  node scripts/seed-demo-ads.js
 */

const store = require("../lib/pg-store");

const HOME_HERO_ADS = [
  {
    id: "adb_demo_hh1",
    sellerId: "usr_pv1",
    headline: "Jindal Steel & Metals — bulk SS/MS/TMT at factory rates",
    creativeImageUrl: "/demo/steel-1.jpg",
    targetUrl: "/seller/jindal-steel-metals-depot",
    priority: 10,
    amount: 8000,
  },
  {
    id: "adb_demo_hh2",
    sellerId: "usr_cat_textilesfabricsyarn",
    headline: "Surat Silk & Textile Mills — wholesale cotton & silk, bulk MOQ",
    creativeImageUrl: "/demo/textile-2.jpg",
    targetUrl: "/seller/surat-silk-textile-mills",
    priority: 9,
    amount: 6000,
  },
  {
    id: "adb_demo_hh3",
    sellerId: "usr_cat_electronicselectrica",
    headline: "Bengaluru Circuit & Electricals — authorized LED & switchgear pricing",
    creativeImageUrl: "/demo/electronics-2.jpg",
    targetUrl: "/seller/bengaluru-circuit-electricals",
    priority: 8,
    amount: 5000,
  },
];

const CATEGORY_TOP_ADS = [
  {
    id: "adb_demo_ct1",
    sellerId: "usr_cat_agriculturefarming",
    headline: "Nashik AgroFarm — bulk atta, rice & pulses at wholesale rates",
    creativeImageUrl: "/demo/agriculture-2.jpg",
    targetUrl: "/seller/nashik-agrofarm-supplies",
    categoryIds: ["agriculture-farming"],
    priority: 10,
    amount: 4000,
  },
  {
    id: "adb_demo_ct2",
    sellerId: "usr_cat_automotivepartsacces",
    headline: "Ludhiana AutoParts — genuine tyres, batteries & brakes, dealer pricing",
    creativeImageUrl: "/demo/automotive-2.jpg",
    targetUrl: "/seller/ludhiana-autoparts-traders",
    categoryIds: ["automotive-parts-accessories"],
    priority: 10,
    amount: 4000,
  },
  // Untargeted (no categoryIds) so they also rotate in the Directory home's
  // promotion slot, which asks for category_top without a category.
  {
    id: "adb_demo_ct3",
    sellerId: "usr_s005",
    headline: "Delhi Electronics Hub — LEDs, cables & switchgear, authorized distributor pricing",
    creativeImageUrl: "/demo/electronics-3.jpg",
    targetUrl: "/seller/delhi-electronics-hub",
    priority: 6,
    amount: 3000,
  },
  {
    id: "adb_demo_ct4",
    sellerId: "usr_s009",
    headline: "Hyderabad Industrial Machines — CNC and packaging lines with PAN-India delivery",
    creativeImageUrl: "/demo/machinery-2.jpg",
    targetUrl: "/seller/hyderabad-industrial-machines",
    priority: 5,
    amount: 3000,
  },
];

const SEARCH_TOP_ADS = [
  {
    id: "adb_demo_st1",
    sellerId: "usr_s005",
    headline: "Delhi Electronics Hub — authorized distributor pricing on LEDs & switchgear",
    creativeImageUrl: "/demo/electronics-3.jpg",
    targetUrl: "/seller/delhi-electronics-hub",
    priority: 10,
    amount: 4500,
  },
  {
    id: "adb_demo_st2",
    sellerId: "usr_s009",
    headline: "Hyderabad Industrial Machines — CNC & packaging line equipment, PAN-India delivery",
    creativeImageUrl: "/demo/machinery-2.jpg",
    targetUrl: "/seller/hyderabad-industrial-machines",
    priority: 9,
    amount: 4200,
  },
  {
    id: "adb_demo_st3",
    sellerId: "usr_pv6",
    headline: "AgriPure Traders — bulk grains, pulses & spices at farm-gate rates",
    creativeImageUrl: "/demo/agriculture-3.jpg",
    targetUrl: "/seller/agripure-traders",
    priority: 8,
    amount: 4000,
  },
  {
    id: "adb_demo_st4",
    sellerId: "usr_s010",
    headline: "Kolkata Construction Materials — cement, steel & aggregates, dealer rates",
    creativeImageUrl: "/demo/construction-3.jpg",
    targetUrl: "/seller/kolkata-construction-materials",
    priority: 7,
    amount: 3800,
  },
  {
    id: "adb_demo_st5",
    sellerId: "usr_s003",
    headline: "Pune Auto Components — OEM-grade parts, bulk export pricing",
    creativeImageUrl: "/demo/automotive-3.jpg",
    targetUrl: "/seller/pune-auto-components",
    priority: 6,
    amount: 3500,
  },
  {
    id: "adb_demo_st6",
    sellerId: "usr_s007",
    headline: "Chennai MedTech Supplies — hospital & diagnostic equipment, GEM-listed",
    creativeImageUrl: "/demo/medical-2.jpg",
    targetUrl: "/seller/chennai-medtech-supplies",
    priority: 5,
    amount: 3200,
  },
];

function bookingDoc(placementType, a) {
  return {
    id: a.id,
    adSlotId: placementType,
    slotId: null,
    sellerId: a.sellerId,
    listingId: null,
    placementType,
    categoryIds: a.categoryIds || [],
    creativeImageUrl: a.creativeImageUrl,
    headline: a.headline,
    targetUrl: a.targetUrl,
    startDate: null,
    endDate: null,
    priority: a.priority,
    status: "active",
    amount: a.amount,
    impressionsServed: Math.floor(200 + Math.random() * 800),
    clicks: Math.floor(5 + Math.random() * 40),
    paymentRecordId: null,
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  const users = await store.all("users.json");
  const byId = new Map(users.map((u) => [u.id, u]));

  let created = 0;
  for (const a of [
    ...HOME_HERO_ADS.map((x) => ["home_hero", x]),
    ...CATEGORY_TOP_ADS.map((x) => ["category_top", x]),
    ...SEARCH_TOP_ADS.map((x) => ["search_top", x]),
  ]) {
    const [placement, ad] = a;
    if (!byId.has(ad.sellerId)) {
      console.log(`skip ${ad.id} — seller ${ad.sellerId} not found`);
      continue;
    }
    try {
      await store.insert("ad-bookings.json", bookingDoc(placement, ad), undefined);
      created++;
      console.log(`✓ ${placement.padEnd(12)} ${ad.headline}`);
    } catch (err) {
      // Fixed ids make this additive/idempotent on the file-DB (insert()
      // upserts there), but Postgres has a real unique constraint on id and
      // does a plain INSERT — already-seeded rows hit a duplicate-key error
      // instead of upserting. Skip those so re-running only adds what's new.
      if (err && err.code === "23505") {
        console.log(`= ${placement.padEnd(12)} ${ad.headline} (already seeded)`);
      } else {
        throw err;
      }
    }
  }

  console.log(`\nDone. ${created} demo ad bookings active.`);
}

main().catch((e) => {
  console.error("seed-demo-ads failed:", e);
  process.exit(1);
});
