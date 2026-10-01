/**
 * listings.querycount.test.js — standing "GET /api/listings doesn't hydrate every
 * user" assertion (BACKEND-AUDIT.md Phase 5c-1).
 *
 * Before 5c the browse handler did `store.all("users.json")` — a full composite
 * hydrate of every user (9 child tables) — just to read sellerProfile.status and
 * build a mini-card for the ~12 listings on the page. Now it's two targeted
 * queries (approved-seller ids + a JOIN over the page's seller ids).
 *
 * NOTE: `lib/search.js` still does `store.all("listings.json")` — the MiniSearch /
 * facets SQL rewrite is deferred (it can't be byte-identical; needs an owner call).
 * So this test only guards the USERS scan, not the listings one.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("GET /api/listings does not full-scan the users table (Phase 5c-1)", async (t) => {
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
    const res = await request(app).get("/api/listings?limit=12");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.listings), "response has a listings array");
    const scannedUsers = sqls.some((s) => /SELECT \* FROM users\b/i.test(s));
    assert.ok(!scannedUsers, "must not SELECT * FROM users (full composite hydrate)");
  } finally {
    pool.query = orig;
  }
});
