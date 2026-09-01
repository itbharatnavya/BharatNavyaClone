/**
 * categories.querycount.test.js — the standing "GET /api/categories stays cheap"
 * assertion (BACKEND-AUDIT.md Phase 5a + "Verification / Query count").
 *
 * Before 5a the endpoint did `store.all("listings.json")` — a full scan + child-table
 * batches of the composite listings collection — on every request, just to compute
 * per-category counts in JS. Now it's one GROUP BY. Without this test a stray
 * store.all() silently brings the scan back with every other test still green.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("GET /api/categories does not full-scan the listings table (Phase 5a)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const orig = pool.query.bind(pool);
  const sqls = [];
  pool.query = (...args) => {
    sqls.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };

  try {
    const res = await request(app).get("/api/categories");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), "response has a categories array");
    assert.ok(sqls.length <= 3, `expected <= 3 queries for GET /api/categories, got ${sqls.length}`);
    const scannedListings = sqls.some((s) => /SELECT \* FROM listings\b/i.test(s));
    assert.ok(!scannedListings, "must not SELECT * FROM listings (composite scan)");
  } finally {
    pool.query = orig;
  }
});
