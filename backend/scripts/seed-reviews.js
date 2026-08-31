/**
 * seed-reviews.js — approved demo reviews for the Directory homepage's
 * "Recent Activity" feed (GET /api/reviews/recent).
 *
 * reviews.json ships with exactly one entry and it's status:"pending" (the
 * public review endpoints only ever return "approved" ones), so Recent
 * Activity would render empty on a fresh checkout. This script inserts a
 * batch of realistic, already-approved reviews across the existing demo
 * sellers (usr_s001..usr_s013) from existing demo buyers (usr_b001..usr_b005).
 *
 * Idempotent: every review below has a fixed id (rev_seed_NN); re-running
 * upserts in place rather than duplicating. All writes go through lib/store.
 */

const store = require("../lib/store");

const REVIEWS = [
  { id: "rev_seed_01", sellerId: "usr_s001", buyerId: "usr_b001", rating: 5, reviewText: "Good product and service is fast", daysAgo: 1 },
  { id: "rev_seed_02", sellerId: "usr_s002", buyerId: "usr_b002", rating: 5, reviewText: "Reliable packaging supplier, on-time delivery every time.", daysAgo: 2 },
  { id: "rev_seed_03", sellerId: "usr_s003", buyerId: "usr_b003", rating: 4, reviewText: "Good quality auto components, slightly slow on WhatsApp replies.", daysAgo: 2 },
  { id: "rev_seed_04", sellerId: "usr_s004", buyerId: "usr_b004", rating: 5, reviewText: "Excellent experience! The team was knowledgeable and guided us through their range.", daysAgo: 3 },
  { id: "rev_seed_05", sellerId: "usr_s005", buyerId: "usr_b005", rating: 4, reviewText: "Solid electronics vendor, prices are competitive for bulk orders.", daysAgo: 4 },
  { id: "rev_seed_06", sellerId: "usr_s006", buyerId: "usr_b001", rating: 5, reviewText: "Very responsive and the equipment matched exactly what was listed.", daysAgo: 5 },
  { id: "rev_seed_07", sellerId: "usr_s007", buyerId: "usr_b002", rating: 5, reviewText: "Professional and quick — got our order confirmed within the hour.", daysAgo: 6 },
  { id: "rev_seed_08", sellerId: "usr_s008", buyerId: "usr_b003", rating: 4, reviewText: "Good fabric quality, packaging could be better for long-distance shipping.", daysAgo: 7 },
  { id: "rev_seed_09", sellerId: "usr_s009", buyerId: "usr_b004", rating: 5, reviewText: "Great machinery supplier, after-sales support has been excellent so far.", daysAgo: 9 },
  { id: "rev_seed_10", sellerId: "usr_s010", buyerId: "usr_b005", rating: 4, reviewText: "Construction materials arrived on schedule, fair pricing.", daysAgo: 11 },
  { id: "rev_seed_11", sellerId: "usr_s011", buyerId: "usr_b001", rating: 5, reviewText: "Consistent quality across every order we've placed this year.", daysAgo: 13 },
  { id: "rev_seed_12", sellerId: "usr_s012", buyerId: "usr_b002", rating: 5, reviewText: "Beautiful handloom work, exactly as shown in their listing photos.", daysAgo: 15 },
  { id: "rev_seed_13", sellerId: "usr_s013", buyerId: "usr_b003", rating: 4, reviewText: "Pump parts fit perfectly, would order again.", daysAgo: 18 },
];

function daysAgoIso(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

(async () => {
  const users = await store.all("users.json");
  const byId = new Map(users.map((u) => [u.id, u]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of REVIEWS) {
    const seller = byId.get(r.sellerId);
    const buyer = byId.get(r.buyerId);
    if (!seller || !seller.sellerProfile || !buyer) {
      console.warn(`  ! missing seller/buyer for ${r.id} (seller=${r.sellerId}, buyer=${r.buyerId}) — skipped`);
      skipped++;
      continue;
    }

    const doc = {
      id: r.id,
      targetUserId: r.sellerId,
      sellerId: r.sellerId,
      direction: "buyer_to_seller",
      buyerId: r.buyerId,
      buyerName: buyer.name,
      rating: r.rating,
      reviewText: r.reviewText,
      status: "approved",
      createdAt: daysAgoIso(r.daysAgo),
    };

    const existing = await store.getById("reviews.json", r.id);
    if (existing) {
      const { id, ...patch } = doc;
      await store.update("reviews.json", r.id, patch);
      updated++;
    } else {
      await store.insert("reviews.json", doc);
      inserted++;
    }
  }

  console.log("\n=== seed-reviews summary ===");
  console.log(`  inserted: ${inserted}`);
  console.log(`  updated:  ${updated}`);
  console.log(`  skipped:  ${skipped}`);
  console.log("Done.");
})().catch((err) => {
  console.error("seed-reviews failed:", err);
  process.exit(1);
});
