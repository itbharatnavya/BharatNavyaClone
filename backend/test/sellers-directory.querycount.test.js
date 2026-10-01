/**
 * sellers-directory.querycount.test.js — the public seller/employer directory reads
 * stop full-scanning users + listings (BACKEND-AUDIT.md Phase 6b).
 *
 * GET /api/sellers and GET /api/sellers/featured did
 * `store.all("users.json")` + `store.all("listings.json")` — full composite
 * hydrates of every user AND every listing — to build the approved-seller cards.
 * Now: identity.getApprovedSellerIds + hydrateUsersByIds (approved sellers only)
 * and directory.activeListingCountsBySeller (one GROUP BY). GET /api/sellers/:slug
 * gets its listings via directory.activeListingIdsForSeller + per-id hydrate;
 * GET /api/employers/:slug gets its jobs through recruitment.jobsRepo.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("public seller/employer directory reads don't full-scan users or listings (Phase 6b)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const fullScan = (tbl) => seen.some((s) => new RegExp(`SELECT \\* FROM ${tbl}\\s+ORDER BY`, "i").test(s));

  try {
    seen.length = 0;
    const r1 = await request(app).get("/api/sellers?limit=12");
    assert.equal(r1.status, 200);
    assert.ok(Array.isArray(r1.body.data.sellers));
    assert.ok(!fullScan("users"), "GET /api/sellers must not SELECT * FROM users ORDER BY");
    assert.ok(!fullScan("listings"), "GET /api/sellers must not SELECT * FROM listings ORDER BY");

    seen.length = 0;
    const r2 = await request(app).get("/api/sellers/featured");
    assert.equal(r2.status, 200);
    assert.ok(!fullScan("users"), "GET /api/sellers/featured must not full-scan users");
    assert.ok(!fullScan("listings"), "GET /api/sellers/featured must not full-scan listings");

    seen.length = 0;
    const r3 = await request(app).get("/api/sellers/agripure-traders");
    assert.equal(r3.status, 200);
    assert.ok(Array.isArray(r3.body.data.listings));
    assert.ok(!fullScan("users"), "GET /api/sellers/:slug must not full-scan users");
    assert.ok(!fullScan("listings"), "GET /api/sellers/:slug must not full-scan listings");

    seen.length = 0;
    const r4 = await request(app).get("/api/employers/acme-testing-pvt-ltd");
    assert.equal(r4.status, 200);
    assert.ok(Array.isArray(r4.body.data.jobs));
    assert.ok(!fullScan("users"), "GET /api/employers/:slug must not full-scan users");
    assert.ok(!fullScan("jobs"), "GET /api/employers/:slug must not full-scan jobs");
  } finally {
    pool.query = orig;
  }
});
