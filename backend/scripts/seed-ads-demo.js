/**
 * seed-ads-demo.js — demo ad campaigns for LOCAL testing of the ad carousels.
 *
 * Creates ACTIVE campaigns for existing approved sellers / employers on the placements that have a
 * slot in the UI, enough per placement (>5) to exercise the "n / total" counter:
 *   home_hero 8 (homepage), category_top 8 (/directory + category/listing/seller/brand pages),
 *   search_top 8 (search), recruitment_home 7, recruitment_search_top 6.
 * Images are the local /demo/*.jpg set; links go to the seller / employer profile.
 *
 * Idempotent (fixed ids adb_seed_*, ON CONFLICT DO NOTHING). Demo data only — do not run against
 * a real production database.
 *
 *   node scripts/seed-ads-demo.js            # add
 *   node scripts/seed-ads-demo.js --remove   # delete every adb_seed_* row again
 */
const fs = require("fs");
const path = require("path");
const { pool } = require("../modules/_shared");

const p = pool.pool || pool;
const DEMO_DIR = path.join(__dirname, "..", "..", "frontend", "public", "demo");

const PLAN = [
  { placement: "home_hero", count: 8, who: "seller" },
  { placement: "category_top", count: 8, who: "seller" },
  { placement: "search_top", count: 8, who: "seller" },
  { placement: "recruitment_home", count: 7, who: "employer" },
  { placement: "recruitment_search_top", count: 6, who: "employer" },
];
const TAGLINES = [
  "verified supplier, quotes within 24 hours",
  "bulk orders welcome, delivery across India",
  "factory-direct pricing for dealers",
  "trusted by buyers in 20+ cities",
  "ask for samples and a custom quote",
  "ready stock, fast dispatch",
  "GST invoice and doorstep delivery",
  "wholesale rates for regular buyers",
];
const HIRING = [
  "is hiring — apply directly, no recruiters",
  "is growing its team — open roles now",
  "has new openings this week",
  "is hiring across cities — see roles",
  "wants to hear from you — apply today",
  "has full-time and remote roles open",
  "is expanding — join the team",
];
const KEYWORD_IMAGES = [
  [/steel|metal|alloy|iron/i, "steel"], [/textile|silk|cotton|fabric|apparel|garment/i, "textile"],
  [/agri|farm|grain|food|spice|tea/i, "agriculture"], [/auto|tyre|engine|part/i, "automotive"],
  [/electr|led|switch|circuit/i, "electronics"], [/medic|health|hospital|pharma/i, "medical"],
  [/pack|box|carton/i, "packaging"], [/machin|cnc|industr|tool/i, "machinery"],
  [/construct|cement|build/i, "construction"], [/logist|transport|cargo/i, "logistics"],
  [/chem|paint|polymer/i, "chemical"], [/retail|store|mart/i, "retail"],
];

function images() {
  return fs.readdirSync(DEMO_DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
}
function pickImage(all, name, i) {
  const hit = KEYWORD_IMAGES.find(([re]) => re.test(name));
  const pool_ = hit ? all.filter((f) => f.startsWith(hit[1])) : [];
  const list = pool_.length ? pool_ : all;
  return "/demo/" + list[i % list.length];
}

async function main() {
  if (process.argv.includes("--remove")) {
    const r = await p.query("DELETE FROM ad_bookings WHERE id LIKE 'adb_seed_%' RETURNING id");
    console.log(`removed ${r.rowCount} seeded ad campaigns`);
    return;
  }
  const all = images();
  const sellers = (await p.query("SELECT user_id, company_name, slug FROM seller_profiles WHERE status = 'approved' AND slug IS NOT NULL AND company_name IS NOT NULL AND company_name !~* '(admin|test|demo|shape|acme)' ORDER BY company_name")).rows;
  const employers = (await p.query("SELECT user_id, company_name, slug FROM employer_profiles WHERE slug IS NOT NULL AND company_name IS NOT NULL AND company_name !~* '(admin|test|demo|shape|acme)' AND coalesce(status,'approved') IN ('approved','active') ORDER BY company_name")).rows;
  if (sellers.length < 8) throw new Error(`need >= 8 approved sellers, found ${sellers.length}`);
  if (employers.length < 4) console.log(`note: only ${employers.length} employers — recruitment ads will reuse them`);

  let added = 0;
  for (const { placement, count, who } of PLAN) {
    const src = who === "seller" ? sellers : employers;
    if (!src.length) continue;
    // a different slice of sellers per placement so the same company isn't everywhere
    const offset = PLAN.findIndex((x) => x.placement === placement) * 7;
    for (let i = 0; i < count; i++) {
      const row = src[(offset + i) % src.length];
      const text = who === "seller" ? TAGLINES[i % TAGLINES.length] : HIRING[i % HIRING.length];
      const headline = who === "seller" ? `${row.company_name} — ${text}` : `${row.company_name} ${text}`;
      const id = `adb_seed_${placement}_${String(i + 1).padStart(2, "0")}`;
      const r = await p.query(
        `INSERT INTO ad_bookings (id, ad_slot_id, seller_id, placement_type, creative_image_url, target_url, headline,
           category_ids, priority, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'{}',$8,'active', now())
         ON CONFLICT (id) DO NOTHING`,
        [id, placement, row.user_id, placement, pickImage(all, row.company_name + " " + headline, i),
         who === "seller" ? `/seller/${row.slug}` : `/employer/${row.slug}`, headline, 0]
      );
      added += r.rowCount;
    }
  }
  const totals = (await p.query("SELECT placement_type, count(*) FROM ad_bookings WHERE status IN ('active','scheduled') GROUP BY 1 ORDER BY 1")).rows;
  console.log(`added ${added} demo ad campaigns. Active per placement now:`);
  totals.forEach((t) => console.log(`  ${t.placement_type.padEnd(24)} ${t.count}`));
}

main().then(() => process.exit(0)).catch((e) => { console.error("seed-ads-demo failed:", e.message); process.exit(1); });
