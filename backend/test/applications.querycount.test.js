/**
 * applications.querycount.test.js — the candidate lookups in routes/applications.js
 * stop full-hydrating the users table (BACKEND-AUDIT.md Phase 7 sweep).
 *
 * GET /api/applications (employer feed) did
 * `store.findMany("users.json", u => candidateIds.includes(u.id))` and GET
 * /api/applications/:id did `store.getById("users.json", …)`. Now:
 * identity.hydrateUsersByIds (WHERE id = ANY) and identity.getAuthUser (WHERE id).
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

test("GET /api/applications doesn't full-hydrate users (Phase 7)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const emp = await store.getById("users.json", "usr_emp4");
  assert.ok(emp, "seed user usr_emp4 missing — run `npm run test:setup`");
  const token = auth.signToken(emp);

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const fullHydrate = () => seen.some((s) => /SELECT \* FROM users\s+ORDER BY/i.test(s));

  try {
    seen.length = 0;
    const r = await request(app)
      .get("/api/applications")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data.applications));
    assert.ok(!fullHydrate(), "GET /api/applications must not SELECT * FROM users ORDER BY");
  } finally {
    pool.query = orig;
  }
});
