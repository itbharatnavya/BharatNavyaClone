/**
 * brand.repository.js — lean reads for the brand-discovery endpoints
 * (routes/brands.js, BACKEND-AUDIT.md Phase 5f).
 *
 * Brands aren't a stored collection — each product listing carries a free-text
 * `product.brand`. routes/brands.js aggregated them by loading `store.all(
 * "listings.json")` (the full composite hydrate — media + product + service + spec
 * EAV for every listing) plus `store.all("users.json")`. This returns just the
 * fields the aggregation actually reads, from one indexed JOIN. `listings` does NOT
 * graduate — this is a read (BACKEND-AUDIT.md "reads may straddle").
 */

const { pool } = require("../../_shared/pool");

/**
 * Every ACTIVE listing carrying a non-empty product.brand, as a LEAN row shaped
 * like the subset routes/brands.js's computeBrandsList / computeBrandDetail touch:
 *   { id, sellerId, createdAt, status:"active", categoryId, legacyCategory,
 *     categoryPath[], product:{ brand }, media:[{ type, url }] }
 * Ordered by id ASC — the old `store.all()` order, which the "first listing with an
 * image wins" sampleImage pick (and the `brands` golden) depend on.
 */
async function activeBrandedListingsLean() {
  const { rows } = await pool.query(`
    SELECT l.id, l.seller_id, l.created_at, l.category_id, l.legacy_category, l.category_path,
           btrim(p.brand) AS brand
      FROM listings l
      JOIN listing_products p ON p.listing_id = l.id
     WHERE l.status = 'active' AND p.brand IS NOT NULL AND btrim(p.brand) <> ''
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
    sellerId: r.seller_id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    status: "active",
    categoryId: r.category_id,
    legacyCategory: r.legacy_category,
    categoryPath: r.category_path || [],
    product: { brand: r.brand },
    media: mediaByListing.get(r.id) || [],
  }));
}

module.exports = { activeBrandedListingsLean };
