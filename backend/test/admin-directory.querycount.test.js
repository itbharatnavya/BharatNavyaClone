/**
 * admin-directory.querycount.test.js — the admin listing + moderation queues stop
 * hydrating every user (BACKEND-AUDIT.md Phase 5e).
 *
 * `routes/adminListings.js` `sellerLookup()` and `routes/moderation.js`
 * `authorLookup()` each did `store.all("users.json")` — a full composite hydrate of
 * every user (9 child tables) — for one or two string fields per row. Both now use
 * targeted `identity.getSellerCompanyNames` / `getAccountCards` (`WHERE id = ANY($1)`).
 * These endpoints have no golden fixtures, so this + the shape are the regression net.
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

test("admin listing + moderation queues don't full-scan users (Phase 5e)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed admin usr_admin missing — run npm run test:setup");
  const bearer = `Bearer ${auth.signToken(admin)}`;

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  // The full composite hydrate (lib/db/users.js `all()`) is `SELECT * FROM users
  // ORDER BY id ASC` — that is the scan we removed. `authGuard`'s single-row
  // `SELECT * FROM users WHERE id = $1` is expected and fine.
  const scannedUsers = () => seen.some((s) => /SELECT \* FROM users\s+ORDER BY/i.test(s));

  try {
    seen.length = 0;
    const r1 = await request(app).get("/api/admin/listings?limit=10").set("Authorization", bearer);
    assert.equal(r1.status, 200);
    assert.ok(Array.isArray(r1.body.data.items));
    assert.ok(!scannedUsers(), "GET /api/admin/listings must not SELECT * FROM users");

    seen.length = 0;
    const r2 = await request(app).get("/api/admin/moderation/content?type=blog").set("Authorization", bearer);
    assert.equal(r2.status, 200);
    assert.ok(Array.isArray(r2.body.data));
    assert.ok(!scannedUsers(), "GET /api/admin/moderation/content must not SELECT * FROM users");

    seen.length = 0;
    const r3 = await request(app).get("/api/admin/moderation/verifications").set("Authorization", bearer);
    assert.equal(r3.status, 200);
    assert.ok(!scannedUsers(), "GET /api/admin/moderation/verifications must not SELECT * FROM users");
  } finally {
    pool.query = orig;
  }
});
