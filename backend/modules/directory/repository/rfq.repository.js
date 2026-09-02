/**
 * rfq.repository.js — lean listing reads for the broad-RFQ lead fan-out
 * (routes/inquiries.js resolveTargets, BACKEND-AUDIT.md Phase 7 sweep-12).
 *
 * resolveTargets did `store.all("listings.json")` (the full composite hydrate —
 * media + product + service + spec EAV for EVERY listing) plus
 * `store.all("users.json")` just to (a) pick the owning seller of a specific
 * listing and (b) match up to 6 approved sellers' active listings by category /
 * keyword. These return only the columns that matcher touches, from one indexed
 * read each. `listings` does NOT graduate — this is a read (BACKEND-AUDIT.md
 * "reads may straddle").
 */

const { pool } = require("../../_shared/pool");

/**
 * Every ACTIVE listing as a LEAN row shaped like the subset resolveTargets's
 * `matches(l)` reads:  { id, sellerId, status:"active", categoryId,
 * legacyCategory, title, keywords[] }. Ordered by id ASC — the old
 * `store.all("listings.json")` order, which "first matching listing per seller,
 * up to MAX_FANOUT" depends on for which listingId/sellers get picked.
 */
async function rfqMatchListingsLean() {
  const { rows } = await pool.query(`
    SELECT id, seller_id, category_id, legacy_category, title, keywords
      FROM listings
     WHERE status = 'active'
     ORDER BY id ASC
  `);
  return rows.map((r) => ({
    id: r.id,
    sellerId: r.seller_id,
    status: "active",
    categoryId: r.category_id,
    legacyCategory: r.legacy_category,
    title: r.title,
    keywords: r.keywords || [],
  }));
}

/** { id, sellerId } for one listing id, or null — the specific-listing branch of
 *  resolveTargets only reads `listing.sellerId` and `listing.id`. */
async function listingOwner(id) {
  if (!id) return null;
  const { rows } = await pool.query(
    `SELECT id, seller_id FROM listings WHERE id = $1`,
    [id]
  );
  return rows[0] ? { id: rows[0].id, sellerId: rows[0].seller_id } : null;
}

module.exports = { rfqMatchListingsLean, listingOwner };
