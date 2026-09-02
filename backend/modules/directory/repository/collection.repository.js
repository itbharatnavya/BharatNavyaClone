/**
 * collection.repository.js — lean listing reads for routes/collections.js's
 * `resolveItems()` / `toCard()` (BACKEND-AUDIT.md Phase 7 sweep-7).
 *
 * `buildContext()` used to load `store.all("listings.json")` — the full composite
 * hydrate (media + product + service + spec EAV) of EVERY listing — plus
 * `store.all("users.json")`, then `resolveItems()` walked every listing in JS to
 * match a collection's `categorySlugs` / free-text `brandSlugs`. This returns only
 * the fields that walk actually reads, from one indexed query + a batched media
 * fetch. `listings` does NOT graduate — a read may straddle (BACKEND-AUDIT.md
 * "Collection-level atomic graduation"). The `GET /:slug` endpoint still hydrates
 * its (bounded) resolved set with per-id `store.getById("listings.json", …)`.
 */

const { pool } = require("../../_shared/pool");

/**
 * activeListingsForCollectionResolve() -> Promise<Array<{
 *   id, status:"active", categoryId, categoryPath: string[],
 *   product: { brand: string|null }, media: Array<{ type, url }>
 * }>>
 *
 * Every ACTIVE listing, id ASC — the same order `store.all("listings.json")`
 * yielded, which the auto-include pass and the `collections` golden depend on.
 * `product.brand` is `btrim`ed and null for non-product listings (LEFT JOIN).
 */
async function activeListingsForCollectionResolve() {
  const { rows } = await pool.query(`
    SELECT l.id, l.category_id, l.category_path, btrim(p.brand) AS brand
      FROM listings l
      LEFT JOIN listing_products p ON p.listing_id = l.id
     WHERE l.status = 'active'
     ORDER BY l.id ASC
  `);
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const media = await pool.query(
    `SELECT listing_id, type, url FROM listing_media WHERE listing_id = ANY($1) ORDER BY listing_id, position ASC`,
    [ids]
  );
  const mediaByListing = new Map();
  for (const m of media.rows) {
    if (!mediaByListing.has(m.listing_id)) mediaByListing.set(m.listing_id, []);
    mediaByListing.get(m.listing_id).push({ type: m.type, url: m.url });
  }

  return rows.map((r) => ({
    id: r.id,
    status: "active",
    categoryId: r.category_id,
    categoryPath: r.category_path || [],
    product: { brand: r.brand || null },
    media: mediaByListing.get(r.id) || [],
  }));
}

module.exports = { activeListingsForCollectionResolve };
