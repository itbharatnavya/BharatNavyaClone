/**
 * seed-demo-stories.js — demo Stories (DESIGN §3.7) so the feature has something real
 * to show:
 *   • 1 "active" story per seller — shows in the Directory homepage StoryRail
 *     (components/StoryRail.tsx), kept permanently (SEEDED_STATUS_EXPIRES_AT).
 *   • 1 "highlight" (isHighlight:true) story per seller — pinned, shows on that
 *     seller's profile Highlights row (components/seller/HighlightsRow.tsx),
 *     never expires.
 *
 * 15 real category-representative sellers (usr_cat_*), each linked to one of their
 * own real listings so the "View listing" CTA in StoryViewer works, media pulled from
 * the local /demo/*.jpg set matching that seller's industry (CLAUDE.md §1: local
 * images only, no hot-linking).
 *
 *   • 1 active employer story for selected recruitment employers — shows in the
 *     Recruitment homepage StoryRail through the same Stories API.
 *
 * Additive/idempotent: fixed ids, upsertStory() updates in place on re-run.
 * Run:  node scripts/seed-demo-stories.js
 */

const store = require("../lib/pg-store");

const SELLERS = [
  {
    id: "usr_cat_agriculturefarming",
    listingId: "lst_cat00176",
    active: { img: "/demo/agriculture-1.jpg", caption: "Fresh harvest lot arriving this week — bulk pricing open." },
    highlight: { img: "/demo/agriculture-3.jpg", caption: "Our grading & packing line" },
  },
  {
    id: "usr_cat_apparelclothinggarme",
    listingId: "lst_cat00025",
    active: { img: "/demo/apparel-2.jpg", caption: "New season knitwear collection is live." },
    highlight: { img: "/demo/apparel-4.jpg", caption: "Factory floor tour" },
  },
  {
    id: "usr_cat_automotivepartsacces",
    listingId: "lst_cat00159",
    active: { img: "/demo/automotive-3.jpg", caption: "Genuine brake kits back in stock, dealer pricing." },
    highlight: { img: "/demo/automotive-1.jpg", caption: "Our parts warehouse" },
  },
  {
    id: "usr_cat_beautypersonalcarewe",
    listingId: "lst_cat00397",
    active: { img: "/demo/business-4.jpg", caption: "Wholesale skincare range restocked." },
    highlight: { img: "/demo/business-2.jpg", caption: "Meet our team" },
  },
  {
    id: "usr_cat_buildingconstruction",
    listingId: "lst_cat00137",
    active: { img: "/demo/construction-2.jpg", caption: "New batch of cement & aggregates ready to dispatch." },
    highlight: { img: "/demo/construction-4.jpg", caption: "Site delivery in action" },
  },
  {
    id: "usr_cat_chemicalsdyessolvent",
    listingId: "lst_cat00073",
    active: { img: "/demo/chemical-1.jpg", caption: "Bulk solvent order slots open for this month." },
    highlight: { img: "/demo/chemical-3.jpg", caption: "Our QC lab" },
  },
  {
    id: "usr_cat_electronicselectrica",
    listingId: "lst_cat00094",
    active: { img: "/demo/electronics-3.jpg", caption: "LED & switchgear combo offer this week." },
    highlight: { img: "/demo/electronics-5.jpg", caption: "Showroom walkthrough" },
  },
  {
    id: "usr_cat_food",
    listingId: "lst_cat00217",
    active: { img: "/demo/food-2.jpg", caption: "Fresh grain stock arrived — book your quota." },
    highlight: { img: "/demo/food-4.jpg", caption: "Our storage facility" },
  },
  {
    id: "usr_cat_giftscraftssports",
    listingId: "lst_cat00425",
    active: { img: "/demo/retail-1.jpg", caption: "Festive gifting range now live." },
    highlight: { img: "/demo/retail-3.jpg", caption: "Handpicked craft collection" },
  },
  {
    id: "usr_cat_homefurniturefurnish",
    listingId: "lst_cat00254",
    active: { img: "/demo/home-1.jpg", caption: "New furnishing catalogue out now." },
    highlight: { img: "/demo/home-3.jpg", caption: "Our showroom" },
  },
  {
    id: "usr_cat_industrialmachinerye",
    listingId: "lst_cat00048",
    active: { img: "/demo/machinery-2.jpg", caption: "Precision CNC units ready for demo." },
    highlight: { img: "/demo/machinery-4.jpg", caption: "Shop floor in action" },
  },
  {
    id: "usr_cat_logisticstransportwa",
    listingId: "lst_cat00552",
    active: { img: "/demo/logistics-1.jpg", caption: "PAN-India dispatch slots open this week." },
    highlight: { img: "/demo/logistics-2.jpg", caption: "Our fleet" },
  },
  {
    id: "usr_cat_medicalhealthcaresup",
    listingId: "lst_cat00197",
    active: { img: "/demo/medical-2.jpg", caption: "Fresh stock of surgical consumables in." },
    highlight: { img: "/demo/medical-4.jpg", caption: "Our sterile storage unit" },
  },
  {
    id: "usr_cat_metalssteelalloys",
    listingId: "lst_cat00324",
    active: { img: "/demo/steel-1.jpg", caption: "New TMT bar lot — factory rates this week." },
    highlight: { img: "/demo/steel-3.jpg", caption: "Our rolling mill" },
  },
  {
    id: "usr_cat_textilesfabricsyarn",
    listingId: "lst_cat00001",
    active: { img: "/demo/textile-3.jpg", caption: "New silk & cotton yarn stock arrived." },
    highlight: { img: "/demo/textile-5.jpg", caption: "Our weaving unit" },
  },
];

const EMPLOYERS = [
  { id: "usr_emp1", img: "/seed-media/company/company-2.jpg", caption: "Engineering and product roles are now open in Bengaluru." },
  { id: "usr_emp2", img: "/seed-media/company/company-1.jpg", caption: "Meet the team behind our growing western sales operation." },
  { id: "usr_emp3", img: "/seed-media/work/work-4.jpg", caption: "Operations hiring day announced for this week." },
  { id: "usr_emp5", img: "/seed-media/company/company-5.jpg", caption: "Site and project teams are expanding across two locations." },
  { id: "usr_emp7", img: "/seed-media/people/person-2.jpg", caption: "Recruiter Q&A for support and diagnostics applicants." },
  { id: "usr_emp4", img: "/seed-media/company/company-6.jpg", caption: "Weaving unit hiring supervisors and operators." },
  { id: "usr_emp6", img: "/seed-media/work/work-2.jpg", caption: "Embedded engineers wanted for a new product line." },
  { id: "usr_emp8", img: "/seed-media/work/work-1.jpg", caption: "Plant and quality roles open this month." },
  { id: "usr_emp9", img: "/seed-media/company/company-1.jpg", caption: "Store and category roles open across cities." },
  { id: "usr_emp10", img: "/seed-media/work/work-5.jpg", caption: "Production hiring drive at our steel unit." },
  { id: "usr_emp11", img: "/seed-media/people/person-1.jpg", caption: "Teaching and content roles are now open." },
  { id: "usr_emp12", img: "/seed-media/company/company-3.jpg", caption: "Analyst and advisory positions open." },
  { id: "usr_emp13", img: "/seed-media/work/work-6.jpg", caption: "Field and agronomy roles across three states." },
  { id: "usr_emp14", img: "/seed-media/company/company-4.jpg", caption: "Packaging line roles are open this week." },
  { id: "usr_emp15", img: "/seed-media/people/person-4.jpg", caption: "Lab and process roles open in the chemicals unit." },
];

// Current design-branch Directory fixtures. The older usr_cat_* rows above are
// kept for compatibility with the developer dataset; these IDs power the
// active frontend dataset used by the Counter visual direction.
const DIRECTORY_SELLERS = [
  { id: "usr_s001", img: "/seed-media/company/company-1.jpg", caption: "A new textile production run is ready for review." },
  { id: "usr_s002", img: "/seed-media/company/company-3.jpg", caption: "Food-safe packaging samples are available this week." },
  { id: "usr_s003", img: "/seed-media/work/work-3.jpg", caption: "Fresh component capacity opened for the next dispatch cycle." },
  { id: "usr_s005", img: "/seed-media/work/work-2.jpg", caption: "Electrical and electronics inventory has been refreshed." },
  { id: "usr_s010", img: "/seed-media/company/company-5.jpg", caption: "Construction supply slots are open for upcoming projects." },
  { id: "usr_svc2", img: "/seed-media/work/work-5.jpg", caption: "Founder compliance clinic scheduled for this week." },
  { id: "usr_svc3", img: "/seed-media/company/company-2.jpg", caption: "Product discovery and delivery consultations are now open." },
  { id: "usr_s004", img: "/seed-media/company/company-4.jpg", caption: "Solvent and dye stock refreshed, bulk slots open." },
  { id: "usr_s006", img: "/seed-media/work/work-1.jpg", caption: "New irrigation equipment batch ready for demo." },
  { id: "usr_s007", img: "/seed-media/company/company-6.jpg", caption: "Fresh medical consumables inventory just in." },
  { id: "usr_s008", img: "/seed-media/work/work-6.jpg", caption: "Synthetic fabric rolls ready for sampling." },
  { id: "usr_s009", img: "/seed-media/work/work-3.jpg", caption: "Industrial tooling range on display this week." },
  { id: "usr_s011", img: "/seed-media/company/company-2.jpg", caption: "Polymer grades available for next-day dispatch." },
  { id: "usr_s012", img: "/seed-media/people/person-3.jpg", caption: "Handloom festive collection is now live." },
  { id: "usr_s013", img: "/seed-media/work/work-2.jpg", caption: "Pump assembly line open for factory visits." },
  { id: "usr_svc1", img: "/seed-media/people/person-1.jpg", caption: "Free first consultation on tax filings this week." },
  { id: "usr_svc4", img: "/seed-media/work/work-5.jpg", caption: "Same-day home repair slots opened up." },
  { id: "usr_svc5", img: "/seed-media/company/company-5.jpg", caption: "Relocation bookings open for the coming month." },
  { id: "usr_svc6", img: "/seed-media/people/person-4.jpg", caption: "Company registration packages updated." },
  { id: "usr_svc7", img: "/seed-media/company/company-3.jpg", caption: "New architecture portfolio is up." },
  { id: "usr_svc8", img: "/seed-media/work/work-4.jpg", caption: "Brand and web design slots open this quarter." },
  { id: "usr_svc9", img: "/seed-media/company/company-1.jpg", caption: "Business advisory clinic scheduled this week." },
  { id: "usr_pv1", img: "/seed-media/company/company-4.jpg", caption: "Bulk SS and MS stock at factory rates." },
  { id: "usr_pv2", img: "/seed-media/work/work-1.jpg", caption: "Switchgear and lighting offer running now." },
  { id: "usr_pv3", img: "/seed-media/company/company-5.jpg", caption: "Cement and aggregate delivery slots open." },
  { id: "usr_pv4", img: "/seed-media/company/company-3.jpg", caption: "Food-safe packaging samples available." },
  { id: "usr_pv5", img: "/seed-media/work/work-3.jpg", caption: "Genuine auto parts back in stock." },
  { id: "usr_pv6", img: "/seed-media/work/work-6.jpg", caption: "Fresh produce lots arriving this week." },
];

const DAY_MS = 24 * 60 * 60 * 1000;
// ponytail: seeded active statuses are kept permanently (owner request) so the
// Directory/Recruitment status rails are never empty pre-launch. Drop this and
// re-seed to restore the 24h demo lifetime. Highlights keep 24h so they stay
// out of the live feed (they are pinned in storage regardless).
const SEEDED_STATUS_EXPIRES_AT = "2099-12-31T23:59:59.000Z";

// store.insert() is a plain INSERT (no ON CONFLICT) — a fixed id on a re-run throws
// 23505 duplicate-key and aborts the whole script, silently skipping every doc after
// it (this is how the EMPLOYERS loop below ended up with 0 rows despite the header
// comment's "upserts in place" claim). Upsert for real: update if the row exists.
async function upsertStory(doc) {
  const existing = await store.getById("stories.json", doc.id);
  if (existing) {
    return store.update("stories.json", doc.id, doc);
  }
  return store.insert("stories.json", doc);
}

function storyDoc({ id, sellerId, authorType = "seller", img, caption, listingId, isHighlight, createdAt }) {
  return {
    id,
    sellerId,
    authorType,
    media: { type: "image", url: img },
    caption,
    linkListingId: listingId || null,
    createdAt: createdAt.toISOString(),
    expiresAt: isHighlight ? new Date(createdAt.getTime() + DAY_MS).toISOString() : SEEDED_STATUS_EXPIRES_AT,
    views: Math.floor(20 + Math.random() * 300),
    isHighlight,
    status: "published",
  };
}

async function main() {
  const users = await store.all("users.json");
  const byId = new Map(users.map((u) => [u.id, u]));
  const now = new Date();

  let created = 0;
  for (const s of SELLERS) {
    if (!byId.has(s.id)) {
      console.log(`skip ${s.id} — seller not found`);
      continue;
    }

    await upsertStory(
      storyDoc({
        id: `story_demo_${s.id}_active`,
        sellerId: s.id,
        img: s.active.img,
        caption: s.active.caption,
        listingId: s.listingId,
        isHighlight: false,
        createdAt: now,
      })
    );
    created++;

    await upsertStory(
      storyDoc({
        id: `story_demo_${s.id}_highlight`,
        sellerId: s.id,
        img: s.highlight.img,
        caption: s.highlight.caption,
        listingId: null,
        isHighlight: true,
        createdAt: now,
      })
    );
    created++;

    console.log(`✓ ${s.id} — 1 active + 1 highlight story`);
  }

  for (const seller of DIRECTORY_SELLERS) {
    if (!byId.has(seller.id)) {
      console.log(`skip ${seller.id} — seller not found`);
      continue;
    }
    await upsertStory(
      storyDoc({
        id: `story_demo_${seller.id}_active`,
        sellerId: seller.id,
        img: seller.img,
        caption: seller.caption,
        listingId: null,
        isHighlight: false,
        createdAt: now,
      })
    );
    created++;
    console.log(`✓ ${seller.id} — 1 active seller story`);
  }

  for (const employer of EMPLOYERS) {
    if (!byId.has(employer.id)) {
      console.log(`skip ${employer.id} — employer not found`);
      continue;
    }
    await upsertStory(
      storyDoc({
        id: `story_demo_${employer.id}_active`,
        sellerId: employer.id,
        authorType: "employer",
        img: employer.img,
        caption: employer.caption,
        listingId: null,
        isHighlight: false,
        createdAt: now,
      })
    );
    created++;
    console.log(`✓ ${employer.id} — 1 active employer story`);
  }

  console.log(`\nDone. ${created} demo stories created across the available Directory and Recruitment fixtures.`);
}

main().catch((e) => {
  console.error("seed-demo-stories failed:", e);
  process.exit(1);
});
