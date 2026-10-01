/**
 * backfill-listing-category-path.js — one-off data fix.
 *
 * Listings created via POST /api/listings before the categoryPath-resolution fix
 * (routes/listings.js resolveCategoryFields) were saved with categoryId set but
 * categoryPath: [] — category browse pages filter by categoryPath (lib/search.js
 * matchesCategorySlug), so those listings were active + owned by an approved
 * seller yet never appeared on their own category page.
 *
 * This backfills categoryPath (and legacyCategory, if missing) for any listing
 * whose categoryId resolves to a real category, by looking it up in
 * categories.json. Idempotent — only touches listings with an empty categoryPath.
 *
 * Run:  node scripts/backfill-listing-category-path.js
 */

const store = require("../lib/pg-store");

async function main() {
  const [listings, categories] = await Promise.all([
    store.all("listings.json"),
    store.all("categories.json"),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c]));

  let fixed = 0;
  let skipped = 0;

  for (const l of listings) {
    const hasPath = Array.isArray(l.categoryPath) && l.categoryPath.length > 0;
    if (hasPath) continue;
    if (!l.categoryId) {
      skipped += 1;
      continue;
    }
    const cat = catById.get(l.categoryId);
    if (!cat) {
      skipped += 1;
      continue;
    }
    const categoryPath = Array.isArray(cat.path) && cat.path.length ? cat.path : [cat.slug];
    const patch = { categoryPath };
    if (!l.legacyCategory) patch.legacyCategory = cat.name || null;
    await store.update("listings.json", l.id, patch);
    fixed += 1;
    console.log(`fixed ${l.id} "${l.title}" -> categoryPath=${JSON.stringify(categoryPath)}`);
  }

  console.log(`\nDone. Fixed ${fixed} listing(s), skipped ${skipped} (no categoryId / unknown category).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
