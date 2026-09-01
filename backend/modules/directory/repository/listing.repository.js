/**
 * listing.repository.js — surgical writes to the `listings` table for the Directory
 * domain (BACKEND-AUDIT.md Phase 5d).
 *
 * `listings` is the composite collection (lib/db/listings.js). Full-document reads
 * and writes still go through `store` — that composite hydrate / multi-child-table
 * upsert "stays as-is" (BACKEND-AUDIT.md "What explicitly stays as-is"). This file
 * only owns single-column, index-friendly statements that never touch the child
 * tables — currently the fire-and-forget view counter, which as a `store.update()`
 * read-modify-write was a lost-update race (finding C2) and re-upserted every child
 * table for a display metric.
 */

const { pool } = require("../../_shared/pool");

/** Atomic `views` bump — the C2 fix for Directory (mirrors jobsRepo.incrementById). */
async function bumpListingViews(id) {
  await pool.query(`UPDATE listings SET views = COALESCE(views, 0) + 1 WHERE id = $1`, [id]);
}

module.exports = { bumpListingViews };
