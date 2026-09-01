/**
 * admin-users.querycount.test.js — GET /api/admin/users stops hydrating every user
 * (BACKEND-AUDIT.md Phase 6a).
 *
 * The route did `store.all("users.json")` — the composite mapper's
 * `SELECT * FROM users ORDER BY id ASC` + 9 child-table `= ANY` batches over EVERY
 * user — then filtered / counted / sorted / paged in JS. Now: two indexed SQL
 * statements in identity.adminUserPage, then a composite hydrate of only the
 * <=`limit` page ids. So the full-table `SELECT * FROM users ORDER BY` must be gone;
 * a `WHERE id = ANY($1)` hydrate of the page slice is expected.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/store");
const { pool } = require("../modules/_shared/pool");

test("GET /api/admin/users does not full-hydrate the users table (Phase 6a)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed user usr_admin missing — run `npm run test:setup`");
  const token = auth.signToken(admin);

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };

  try {
    seen.length = 0;
    const r = await request(app)
      .get("/api/admin/users?limit=10")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data.items));
    assert.ok(r.body.data.items.length <= 10);
    // The composite all() full-hydrate signature — must not appear.
    assert.ok(
      !seen.some((s) => /SELECT \* FROM users\s+ORDER BY/i.test(s)),
      "GET /api/admin/users must not SELECT * FROM users ORDER BY (full hydrate)"
    );
    // The page-slice hydrate is by id set.
    assert.ok(
      seen.some((s) => /SELECT \* FROM users WHERE id = ANY/i.test(s)),
      "expected a WHERE id = ANY($1) hydrate of just the page ids"
    );
  } finally {
    pool.query = orig;
  }
});
