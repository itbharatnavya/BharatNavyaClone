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
 * sellerListingIds(sellerId) -> Promise<string[]>  (id-ASC, ANY status)
 *
 * Every listing id owned by one seller regardless of status — the id-ascending
 * order the old `store.all("listings.json").filter(l => l.sellerId === id)`
 * yielded (it filtered `store.all`'s id-ASC output). routes/users.js's
 * `GET /api/me/listings` hydrates each id with `store.getById` (the composite
 * document read stays on `store` by design), then re-sorts by createdAt DESC —
 * the JS sort is stable so equal/absent-createdAt ties keep this id-ASC order.
 */
async function sellerListingIds(sellerId) {
  const { rows } = await pool.query(
    `SELECT id FROM listings WHERE seller_id = $1 ORDER BY id ASC`,
    [sellerId]
  );
  return rows.map((r) => r.id);
}

/**
 * sellerListingStats(sellerId) -> Promise<[{ id, title, views, status, isFeatured }]>
 *
 * The LEAN per-listing fields routes/users.js's `GET /api/me/analytics` reads off
 * every one of a seller's listings (totalViews / activeListings / featuredListings
 * / the top-10-by-views perListing breakdown). Was `store.all("listings.json")`
 * (full composite hydrate of EVERY listing) + a JS `sellerId` filter. id-ASC so
 * the route's later stable `sort((a,b) => b.views - a.views)` breaks ties the same.
 */
async function sellerListingStats(sellerId) {
  const { rows } = await pool.query(
    `SELECT id, title, views, status, is_featured
       FROM listings WHERE seller_id = $1 ORDER BY id ASC`,
    [sellerId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    views: r.views,
    status: r.status,
    isFeatured: r.is_featured,
  }));
}

/**
 * activeListingCountsByType() -> Promise<{ product, service }>
 *
 * One GROUP BY for the "how many products / services are live" answer in
 * routes/assistant.js's `buildStatsReply` — was `store.all("listings.json")`
 * (full composite hydrate of every listing) + two JS `.filter().length` passes.
 * Any `type` outside product/service is ignored (matches the old filters).
 */
async function activeListingCountsByType() {
  const { rows } = await pool.query(
    `SELECT type, count(*)::int AS n FROM listings WHERE status = 'active' GROUP BY type`
  );
  const out = { product: 0, service: 0 };
  for (const r of rows) if (r.type === "product" || r.type === "service") out[r.type] = r.n;
  return out;
}

/**
 * listingsForAiFallback() -> Promise<[lean active listing]>
 *
 * The lean rows routes/ai.js's `fallbackScan` reads (`status/type/location.city/
 * title/description/keywords/legacyCategory/isFeatured`) when `lib/search` is
 * unavailable — was `store.all("listings.json")` (full composite hydrate of every
 * listing) for a defensive in-memory scan. id-ASC, active only (the scan skips
 * non-active anyway).
 */
async function listingsForAiFallback() {
  const { rows } = await pool.query(
    `SELECT id, seller_id, type, title, description, keywords, legacy_category,
            is_featured, location_city
       FROM listings WHERE status = 'active' ORDER BY id ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    sellerId: r.seller_id,
    status: "active",
    type: r.type,
    title: r.title,
    description: r.description,
    keywords: r.keywords || [],
    legacyCategory: r.legacy_category,
    isFeatured: r.is_featured,
    location: { city: r.location_city || null },
  }));
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

/**
 * sellerCardExtras(sellerIds) -> Promise<Map<sellerId, { category, categorySlug, offers }>>
 *
 * For the Directory landing's "Top companies" section: each seller's main top-level
 * category (the root category most of their active listings sit under) and the titles
 * of up to three active listings, newest first. One query over the given sellers only.
 */
async function sellerCardExtras(sellerIds = []) {
  const uniq = [...new Set(sellerIds)].filter(Boolean);
  if (!uniq.length) return new Map();
  const { rows } = await pool.query(
    `SELECT l.seller_id, l.title, c.name AS root_name, c.slug AS root_slug
       FROM listings l
       LEFT JOIN categories c ON c.slug = l.category_path[1]
      WHERE l.status = 'active' AND l.seller_id = ANY($1)
      ORDER BY l.seller_id, l.created_at DESC, l.id DESC`,
    [uniq]
  );
  const out = new Map();
  for (const r of rows) {
    const entry = out.get(r.seller_id) || { tally: new Map(), offers: [] };
    if (entry.offers.length < 3) entry.offers.push(r.title);
    if (r.root_slug) {
      const t = entry.tally.get(r.root_slug) || { name: r.root_name, n: 0 };
      t.n += 1;
      entry.tally.set(r.root_slug, t);
    }
    out.set(r.seller_id, entry);
  }
  for (const [id, entry] of out) {
    let best = null;
    for (const [slug, t] of entry.tally) if (!best || t.n > best.n) best = { slug, name: t.name, n: t.n };
    out.set(id, { category: best ? best.name : null, categorySlug: best ? best.slug : null, offers: entry.offers });
  }
  return out;
}

module.exports = {
  sellerCardExtras,
  listingCountsByCategory,
  firstListingImageBySeller,
  activeListingCountsBySeller,
  activeListingIdsForSeller,
  sellerListingIds,
  sellerListingStats,
  activeListingCountsByType,
  listingsForAiFallback,
  listingTitlesByIds,
};
