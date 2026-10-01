/**
 * boosts.querycount.test.js — routes/boosts.js stops full-scanning listings + users
 * (BACKEND-AUDIT.md Phase 7 sweep-9, 7-monetization).
 *
 * GET / did `store.all("boost-requests.json")` + `store.all("listings.json")`;
 * GET /admin added `store.all("users.json")`. Now `repoForCollection("boost-requests.json")`
 * criteria reads + `directory.listingTitlesByIds` (WHERE id = ANY) +
 * `identity.getSellerCompanyNames`. The composite listings read/write in the approve
 * path stays on `store` by design.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

test("boosts lists don't full-scan listings or users (Phase 7 sweep-9)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed user usr_admin missing — run `npm run test:setup`");
  const H = { Authorization: `Bearer ${auth.signToken(admin)}` };

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const scans = (tbl) => seen.some((s) => new RegExp(`SELECT \\* FROM ${tbl}\\s+ORDER BY`, "i").test(s));

  try {
    for (const p of ["/api/boosts", "/api/admin/boosts/admin"]) {
      seen.length = 0;
      const r = await request(app).get(p).set(H);
      assert.equal(r.status, 200, p);
      assert.ok(Array.isArray(r.body.data));
      assert.ok(!scans("listings"), `${p} must not SELECT * FROM listings ORDER BY`);
      assert.ok(!scans("users"), `${p} must not SELECT * FROM users ORDER BY`);
    }

    seen.length = 0;
    const r = await request(app).get("/api/boosts").set(H);
    assert.equal(r.status, 200);
    assert.ok(
      seen.some((s) => /FROM\s+"?boost_requests"?\s+WHERE/i.test(s)),
      "GET /api/boosts filters boost_requests by sellerId in SQL"
    );
  } finally {
    pool.query = orig;
  }
});
