/**
 * brands.querycount.test.js — the brand-discovery endpoints stop doing the full
 * composite scans (BACKEND-AUDIT.md Phase 5f).
 *
 * routes/brands.js aggregated free-text `product.brand` by `store.all("listings.json")`
 * (the full composite hydrate of every listing) plus, for GET /:slug,
 * `store.all("users.json")`. Now: one lean indexed JOIN (+ a media batch), and
 * `identity.getSellerBrowseCards` for the per-listing seller card.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("GET /api/brands + /api/brands/:slug don't full-scan listings or users (Phase 5f)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const scanned = (tbl) => seen.some((s) => new RegExp(`SELECT \\* FROM ${tbl}\\s+ORDER BY`, "i").test(s));

  try {
    seen.length = 0;
    const r1 = await request(app).get("/api/brands");
    assert.equal(r1.status, 200);
    assert.ok(Array.isArray(r1.body.data));
    assert.ok(!scanned("listings"), "GET /api/brands must not SELECT * FROM listings ORDER BY");

    seen.length = 0;
    const r2 = await request(app).get("/api/brands/bosch");
    assert.equal(r2.status, 200);
    assert.ok(Array.isArray(r2.body.data.listings));
    assert.ok(!scanned("listings"), "GET /api/brands/:slug must not full-scan listings");
    assert.ok(!scanned("users"), "GET /api/brands/:slug must not full-scan users");
  } finally {
    pool.query = orig;
  }
});
