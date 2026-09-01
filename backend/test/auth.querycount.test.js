/**
 * auth.querycount.test.js — the auth-path user lookups stop full-hydrating the
 * users table (BACKEND-AUDIT.md Phase 6c).
 *
 * register / verify-otp / login did `store.findOne("users.json", u => u.mobile|
 * email === x)` — `SELECT * FROM users ORDER BY id ASC` + 9 child `= ANY` batches
 * over EVERY user, then `.find`. Now: one indexed `WHERE mobile|email = $1` probe
 * + a single-row `WHERE id = $1` composite hydrate.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const store = require("../lib/store");
const { pool } = require("../modules/_shared/pool");

test("register / login don't full-hydrate users (Phase 6c)", async (t) => {
  const createdUsers = [];
  t.after(async () => {
    for (const id of createdUsers) await store.remove("users.json", id).catch(() => {});
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
    const mobile = "9" + String(Date.now()).slice(-8) + "0";

    seen.length = 0;
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: "QC", mobile, email: `qc-${Date.now()}@example.com`, password: "secret123" });
    assert.equal(reg.status, 200, reg.text);
    createdUsers.push(reg.body.data.user.id);
    assert.ok(!fullHydrate(), "register must not SELECT * FROM users ORDER BY");

    seen.length = 0;
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: `qc-${Date.now()}@example.com`, password: "nope" });
    assert.equal(login.status, 401);
    assert.ok(!fullHydrate(), "login must not full-hydrate users on the unknown-email path");
  } finally {
    pool.query = orig;
  }
});
