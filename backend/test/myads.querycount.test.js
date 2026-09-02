/**
 * myads.querycount.test.js — routes/myAds.js off lib/store (BACKEND-AUDIT.md
 * Phase 7 sweep-8, 7-monetization).
 *
 * Was: `store.insert/findMany/getById/update/remove("ad-bookings.json", …)` (the
 * `findMany` a JS predicate over `store.all`). Now `repoForCollection("ad-bookings.json")`
 * throughout — `GET /api/my-ads` is `findMany({ where: { sellerId } })`.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/store");
const { pool } = require("../modules/_shared/pool");

test("myAds reads via repo, not lib/store (Phase 7 sweep-8)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../routes/myAds.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(src),
    "routes/myAds.js must not require lib/store"
  );

  const seller = await store.getById("users.json", "usr_s001");
  assert.ok(seller, "seed user usr_s001 missing — run `npm run test:setup`");
  const H = { Authorization: `Bearer ${auth.signToken(seller)}` };

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  try {
    const r = await request(app).get("/api/my-ads").set(H);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data));
    assert.ok(
      seen.some((s) => /FROM\s+"?ad_bookings"?\s+WHERE/i.test(s)),
      "GET /api/my-ads filters ad_bookings by sellerId in SQL"
    );
  } finally {
    pool.query = orig;
  }
});
