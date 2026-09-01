/**
 * listing-views.test.js — the fire-and-forget view counter on GET /api/listings/:id
 * is an ATOMIC single-column UPDATE (BACKEND-AUDIT.md Phase 5d — finding C2).
 *
 * Before 5d it was `store.update("listings.json", id, { views: read + 1 })` — a
 * read-modify-write (lost-update race under concurrency) that also re-upserted every
 * child table. Now `directory.bumpListingViews(id)` is `UPDATE listings SET views =
 * COALESCE(views,0)+1 WHERE id=$1`. This checks the increment lands and is atomic
 * (two overlapping bumps => +2, never +1).
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const directory = require("../modules/directory");
const { pool } = require("../modules/_shared/pool");

test("bumpListingViews is atomic (Phase 5d — C2)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const { rows } = await pool.query(
    `SELECT id, COALESCE(views, 0) AS views FROM listings WHERE status = 'active' ORDER BY id ASC LIMIT 1`
  );
  assert.ok(rows.length, "seed has at least one active listing");
  const id = rows[0].id;
  const base = Number(rows[0].views);

  // Two concurrent bumps — a lost-update race would land +1.
  await Promise.all([directory.bumpListingViews(id), directory.bumpListingViews(id)]);

  const after = await pool.query(`SELECT COALESCE(views, 0) AS views FROM listings WHERE id = $1`, [id]);
  assert.equal(Number(after.rows[0].views), base + 2, "two overlapping bumps must net +2");

  // Restore so the frozen DB stays put for repeat runs.
  await pool.query(`UPDATE listings SET views = $2 WHERE id = $1`, [id, base]);
});
