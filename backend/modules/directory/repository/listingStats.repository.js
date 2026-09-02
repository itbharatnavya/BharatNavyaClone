/**
 * listingStats.repository.js — aggregate reads over the `listings` table for the
 * Directory taxonomy pages (BACKEND-AUDIT.md Phase 5a).
 *
 * `listings` is the composite collection (lib/db/listings.js) and does NOT graduate
 * here — these are READS, and reads may straddle (BACKEND-AUDIT.md "Collection-level
 * atomic graduation"). `listingCountsByCategory` replaces routes/categories.js's
 * `store.all("listings.json")` + JS computeListingCounts() — a full composite-table
 * scan plus a JS pass on every request to /api/categories (a homepage-hot endpoint)
 * — with one GROUP BY. `firstListingImageBySeller` replaces routes/reviews.js's
 * `store.all("listings.json")` (whole composite hydrate of every listing) done just
 * to pick one representative photo per seller for the homepage "Recent Activity" feed.
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

/**
 * firstListingImageBySeller(sellerIds) -> Promise<Map<sellerId, url|null>>
 *
 * The representative photo for a seller: the FIRST media url (lowest `position`) of
 * that seller's LOWEST-id listing that has any media — regardless of listing status,
 * matching the old JS `listings.find(l => l.sellerId === id && l.media && l.media[0])`
 * over the id-ASC `store.all("listings.json")`. Sellers with no media-bearing listing
 * are simply absent from the map (caller falls back to coverImage/logo).
 */
async function firstListingImageBySeller(sellerIds = []) {
  const uniq = [...new Set(sellerIds)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (l.seller_id) l.seller_id, m.url
       FROM listings l
       JOIN listing_media m ON m.listing_id = l.id
      WHERE l.seller_id = ANY($1)
      ORDER BY l.seller_id, l.id ASC, m.position ASC`,
    [uniq]
  );
  return new Map(rows.map((r) => [r.seller_id, r.url || null]));
}

/**
 * activeListingCountsBySeller() -> Promise<Map<sellerId, count>>
 *
 * One GROUP BY, replacing routes/users.js's getActiveListingCounts() which walked
 * `store.all("listings.json")` (the full composite hydrate of every listing) just
 * to tally active listings per seller for the /sellers and /sellers/featured cards.
 */
async function activeListingCountsBySeller() {
  const { rows } = await pool.query(
    `SELECT seller_id, count(*)::int AS n
       FROM listings
      WHERE status = 'active' AND seller_id IS NOT NULL
      GROUP BY seller_id`
  );
  return new Map(rows.map((r) => [r.seller_id, r.n]));
}

/**
 * activeListingIdsForSeller(sellerId) -> Promise<string[]>  (id-ASC)
 *
 * The ids of one seller's ACTIVE listings, in the same id-ascending order the old
 * `store.findMany("listings.json", l => l.sellerId === id && l.status === "active")`
 * yielded (it filtered `store.all`'s id-ASC output). The caller hydrates each id
 * with store.getById — the composite document read stays on `store` by design
 * (BACKEND-AUDIT.md), this only removes the every-listing scan.
 */
async function activeListingIdsForSeller(sellerId) {
  const { rows } = await pool.query(
    `SELECT id FROM listings WHERE seller_id = $1 AND status = 'active' ORDER BY id ASC`,
    [sellerId]
  );
  return rows.map((r) => r.id);
}

/**
 * listingTitlesByIds(ids) -> Promise<Map<listingId, title>>
 *
 * One `WHERE id = ANY($1)` for a lookup that used to walk `store.all("listings.json")`
 * (the full composite hydrate of every listing) just to read one `title` per row —
 * routes/boosts.js's `titleById` map. Missing ids are simply absent (caller `|| null`).
 */
async function listingTitlesByIds(ids = []) {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(`SELECT id, title FROM listings WHERE id = ANY($1)`, [uniq]);
  return new Map(rows.map((r) => [r.id, r.title]));
}

module.exports = {
  listingCountsByCategory,
  firstListingImageBySeller,
  activeListingCountsBySeller,
  activeListingIdsForSeller,
  listingTitlesByIds,
};
