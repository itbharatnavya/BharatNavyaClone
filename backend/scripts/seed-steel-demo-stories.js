/**
 * seed-steel-demo-stories.js — bulk demo Stories for a single seller (Jamshedpur
 * Steel & Metal Works, usr_cat_metalssteelalloys / jamshedpursteelmetalworks@example.com)
 * so the dashboard Stories tab's sectioning/search/pagination (StoriesTab.tsx) can be
 * tested at realistic scale: 20 active + 10 highlighted, on top of whatever the seller
 * already has.
 *
 * Local /demo/*.jpg only (CLAUDE.md §1: no hot-linking), cycling the seller's 3 real
 * steel demo images. Half the active stories link to the seller's real listing
 * (lst_cat00324) so the "View listing" CTA in StoryViewer has something to hit.
 *
 * Additive/idempotent: fixed ids, store.insert() upserts in place on re-run.
 * Run:  node scripts/seed-steel-demo-stories.js
 */

const store = require("../lib/pg-store");

const SELLER_ID = "usr_cat_metalssteelalloys";
const LISTING_ID = "lst_cat00324";
const IMAGES = ["/demo/steel-1.jpg", "/demo/steel-2.jpg", "/demo/steel-3.jpg"];
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const ACTIVE_CAPTIONS = [
  "Fresh TMT rebar stock — Fe500D grade, ready to ship.",
  "MS angle & channel combo offer, this week only.",
  "Hot-rolled coil restocked — bulk order slots open.",
  "GI pipe dispatch slots filling fast for this month.",
  "New batch of MS flats arrived from the mill.",
  "Stainless steel sheet — 304 grade, factory rate.",
  "Wire rod coils ready for immediate pickup.",
  "Structural steel beams — ISMB & ISMC in stock.",
  "Chequered plate stock refreshed, dealer pricing open.",
  "MS square pipes — multiple sizes, bulk discount live.",
  "Galvanized sheet coils just landed at our yard.",
  "Round bar stock topped up — 8mm to 32mm available.",
  "Scrap steel buyback rates updated for this week.",
  "Alloy steel billets — export-grade quality, limited lot.",
  "Cold-rolled sheets back in stock after restock delay.",
  "MS pipe fittings — full range now available.",
  "Bulk order? Ask about our festive season rates.",
  "Fresh consignment of steel wire mesh arrived.",
  "Flat bar & square bar combo pack this week.",
  "Weekend dispatch slots open for PAN-India delivery.",
];

const HIGHLIGHT_CAPTIONS = [
  "Our rolling mill — where every batch starts.",
  "Quality control lab: every lot tested before dispatch.",
  "25+ years serving India's construction & fabrication trade.",
  "Meet our production team.",
  "Bulk MS pipes — loading for dispatch.",
  "ISO-certified processes, consistent grade every time.",
  "Our warehouse — PAN-India stock ready to move.",
  "Customer site delivery — on time, every time.",
  "Behind the scenes: TMT bar production line.",
  "Trusted by 500+ fabricators and contractors.",
];

function storyDoc({ id, img, caption, linkListingId, isHighlight, createdAt }) {
  return {
    id,
    sellerId: SELLER_ID,
    media: { type: "image", url: img },
    caption,
    linkListingId: linkListingId || null,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + DAY_MS).toISOString(),
    views: Math.floor(15 + Math.random() * 260),
    isHighlight,
    status: "published",
  };
}

async function main() {
  const seller = await store.getById("users.json", SELLER_ID);
  if (!seller) {
    console.error(`Seller ${SELLER_ID} not found — aborting.`);
    process.exit(1);
  }

  const now = new Date();
  let created = 0;

  // 20 active stories, staggered over the last ~19 hours so createdAt/timeAgo and
  // expiry vary realistically instead of all posting at the same instant.
  for (let i = 0; i < ACTIVE_CAPTIONS.length; i++) {
    const createdAt = new Date(now.getTime() - i * HOUR_MS);
    await store.insert(
      "stories.json",
      storyDoc({
        id: `story_steeltest_active_${String(i + 1).padStart(2, "0")}`,
        img: IMAGES[i % IMAGES.length],
        caption: ACTIVE_CAPTIONS[i],
        linkListingId: i % 2 === 0 ? LISTING_ID : null,
        isHighlight: false,
        createdAt,
      })
    );
    created++;
  }

  // 10 highlighted stories, staggered over the last ~10 days (pinned, so age doesn't
  // matter for expiry, but gives the "time ago" text some spread).
  for (let i = 0; i < HIGHLIGHT_CAPTIONS.length; i++) {
    const createdAt = new Date(now.getTime() - i * DAY_MS);
    await store.insert(
      "stories.json",
      storyDoc({
        id: `story_steeltest_highlight_${String(i + 1).padStart(2, "0")}`,
        img: IMAGES[i % IMAGES.length],
        caption: HIGHLIGHT_CAPTIONS[i],
        linkListingId: null,
        isHighlight: true,
        createdAt,
      })
    );
    created++;
  }

  console.log(`Done. ${created} stories created for ${SELLER_ID} (20 active + 10 highlighted).`);
}

main().catch((e) => {
  console.error("seed-steel-demo-stories failed:", e);
  process.exit(1);
});
