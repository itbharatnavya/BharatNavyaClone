/**
 * seed-steel-active-highlight-demo.js — 3 targeted demo Stories for Jamshedpur Steel
 * & Metal Works (usr_cat_metalssteelalloys / jamshedpursteelmetalworks@example.com) so
 * the seller public profile's new "Active" vs "Highlights" tab split
 * (app/seller/[slug]/page.tsx, components/seller/HighlightsRow.tsx) can be verified
 * against all three cases at once:
 *
 *   1. Expired + highlighted  → shows on Highlights tab ONLY (not Active, not the
 *      directory homepage rail — GET /api/stories excludes expired stories entirely).
 *   2. Active + highlighted   → shows on BOTH tabs (still live, and pinned).
 *   3. Active, not highlighted → shows on Active tab ONLY.
 *
 * Local /demo/*.jpg only (CLAUDE.md §1). Additive/idempotent: fixed ids,
 * store.insert() upserts in place on re-run.
 * Run:  node scripts/seed-steel-active-highlight-demo.js
 */

const store = require("../lib/store");

const SELLER_ID = "usr_cat_metalssteelalloys";
const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const seller = await store.getById("users.json", SELLER_ID);
  if (!seller) {
    console.error(`Seller ${SELLER_ID} not found — aborting.`);
    process.exit(1);
  }

  const now = new Date();

  // 1. Expired + highlighted — created 3 days ago, so its 24h window closed 2 days
  // ago, but isHighlight keeps it alive on the profile's Highlights tab.
  const expiredCreatedAt = new Date(now.getTime() - 3 * DAY_MS);
  await store.insert("stories.json", {
    id: "story_demo_tabsplit_expired_highlight",
    sellerId: SELLER_ID,
    media: { type: "image", url: "/demo/steel-2.jpg" },
    caption: "[Highlights only] Our 2025 export shipment — expired story, still pinned.",
    linkListingId: null,
    createdAt: expiredCreatedAt.toISOString(),
    expiresAt: new Date(expiredCreatedAt.getTime() + DAY_MS).toISOString(),
    views: 142,
    isHighlight: true,
    status: "published",
  });

  // 2. Active + highlighted — posted 2 hours ago, still well inside its 24h window.
  const activeHighlightCreatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  await store.insert("stories.json", {
    id: "story_demo_tabsplit_active_highlight",
    sellerId: SELLER_ID,
    media: { type: "image", url: "/demo/steel-3.jpg" },
    caption: "[Both tabs] Live now AND pinned — today's mill inspection.",
    linkListingId: "lst_cat00324",
    createdAt: activeHighlightCreatedAt.toISOString(),
    expiresAt: new Date(activeHighlightCreatedAt.getTime() + DAY_MS).toISOString(),
    views: 58,
    isHighlight: true,
    status: "published",
  });

  // 3. Active, not highlighted — posted 30 minutes ago.
  const activeCreatedAt = new Date(now.getTime() - 30 * 60 * 1000);
  await store.insert("stories.json", {
    id: "story_demo_tabsplit_active_only",
    sellerId: SELLER_ID,
    media: { type: "image", url: "/demo/steel-1.jpg" },
    caption: "[Active only] Fresh angle iron stock just unloaded.",
    linkListingId: "lst_cat00324",
    createdAt: activeCreatedAt.toISOString(),
    expiresAt: new Date(activeCreatedAt.getTime() + DAY_MS).toISOString(),
    views: 21,
    isHighlight: false,
    status: "published",
  });

  console.log("Done. 3 demo stories created for", SELLER_ID, "— 1 expired+highlighted, 1 active+highlighted, 1 active-only.");
}

main().catch((e) => {
  console.error("seed-steel-active-highlight-demo failed:", e);
  process.exit(1);
});
