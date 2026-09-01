/**
 * listingStats.repository.js — aggregate reads over the `listings` table for the
 * Directory taxonomy pages (BACKEND-AUDIT.md Phase 5a).
 *
 * `listings` is the composite collection (lib/db/listings.js) and does NOT graduate
 * here — this is a READ, and reads may straddle (BACKEND-AUDIT.md "Collection-level
 * atomic graduation"). It replaces routes/categories.js's `store.all("listings.json")`
 * + JS computeListingCounts() — a full composite-table scan plus a JS pass on every
 * request to /api/categories (a homepage-hot endpoint) — with one GROUP BY.
 */

const { pool } = require("../../_shared/pool");

/**
 * listingCountsByCategory() -> Promise<Map<categoryId, count>>
 *
 * For each ACTIVE listing the set of categories it counts toward is
 *   { category_id, if set }  ∪  { c.id : c.slug ∈ category_path }
 * and it contributes exactly 1 to each. The UNION (not UNION ALL) inside the
 * lateral dedupes per listing — matching the old JS `new Set()` per listing, so a
 * leaf listing whose category_id and one of its category_path slugs resolve to the
 * same category is not tallied twice.
 */
async function listingCountsByCategory() {
  const { rows } = await pool.query(`
    SELECT cat_id, count(*)::int AS n
    FROM (
      SELECT l.id, x.cat_id
      FROM listings l
      CROSS JOIN LATERAL (
        SELECT l.category_id AS cat_id WHERE l.category_id IS NOT NULL
        UNION
        SELECT c.id FROM categories c WHERE c.slug = ANY(l.category_path)
      ) x
      WHERE l.status = 'active'
    ) t
    GROUP BY cat_id
  `);
  return new Map(rows.map((r) => [r.cat_id, r.n]));
}

module.exports = { listingCountsByCategory };
