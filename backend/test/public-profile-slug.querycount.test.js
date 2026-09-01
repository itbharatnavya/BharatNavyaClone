/**
 * public-profile-slug.querycount.test.js — GET /api/sellers/:slug and
 * GET /api/employers/:slug stop full-hydrating the users table (BACKEND-AUDIT.md
 * Phase 6b).
 *
 * Both did `store.findOne("users.json", u => u.<profile>.slug === slug)` — the
 * composite mapper's `SELECT * FROM users ORDER BY id ASC` + 9 child-table `= ANY`
 * batches over EVERY user, then `.find` in JS. Now: one indexed
 * `<profile>_profiles.slug` probe + a `WHERE id = ANY($1)` single-id hydrate.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("GET /api/sellers/:slug + /api/employers/:slug don't full-hydrate users (Phase 6b)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const fullHydrate = () => seen.some((s) => /SELECT \* FROM users\s+ORDER BY/i.test(s));

  try {
    seen.length = 0;
    const r1 = await request(app).get("/api/sellers/agripure-traders");
    assert.equal(r1.status, 200);
    assert.equal(r1.body.data.seller.slug, "agripure-traders");
    assert.ok(!fullHydrate(), "GET /api/sellers/:slug must not SELECT * FROM users ORDER BY");

    seen.length = 0;
    const r2 = await request(app).get("/api/employers/acme-testing-pvt-ltd");
    assert.equal(r2.status, 200);
    assert.equal(r2.body.data.employer.slug, "acme-testing-pvt-ltd");
    assert.ok(!fullHydrate(), "GET /api/employers/:slug must not full-hydrate users");

    // 404 path still works and stays cheap.
    seen.length = 0;
    const r3 = await request(app).get("/api/sellers/no-such-seller-xyz");
    assert.equal(r3.status, 404);
    assert.ok(!fullHydrate(), "404 must not full-hydrate users either");
  } finally {
    pool.query = orig;
  }
});
