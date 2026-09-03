/**
 * collections.querycount.test.js — routes/collections.js stops full-scanning
 * listings + users (BACKEND-AUDIT.md Phase 7 sweep-7, 7-social).
 *
 * `buildContext()` did `store.all("listings.json")` (full composite hydrate of
 * EVERY listing) + `store.all("categories.json")` + `store.all("users.json")`, and
 * `resolveItems()` walked every listing in JS. Now: one lean indexed query
 * (`directory.activeListingsForCollectionResolve`), `repoForCollection("categories.json")`,
 * and — for GET /:slug only — per-id `store.getById("listings.json", …)` over the
 * bounded resolved set + `identity.hydrateUsersByIds` for the seller minis.
 * The `collections` golden guards GET /api/collections byte-for-byte.
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
const store = require("../lib/pg-store");
const { pool } = require("../modules/_shared/pool");

test("collections reads don't full-scan listings or users (Phase 7 sweep-7)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../routes/collections.js"), "utf8");
  assert.ok(!/store\.all\(/.test(src), "routes/collections.js must not call store.all");

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
    for (const p of ["/api/collections", "/api/admin/collections"]) {
      seen.length = 0;
      const r = await request(app).get(p).set(H);
      assert.equal(r.status, 200, p);
      assert.ok(Array.isArray(r.body.data), `${p} returns an array`);
      assert.ok(!scans("users"), `${p} must not SELECT * FROM users ORDER BY`);
      assert.ok(!scans("listings"), `${p} must not SELECT * FROM listings ORDER BY`);
    }

    // A published :slug — full docs come per-id, not from a scan.
    const first = (await request(app).get("/api/collections").set(H)).body.data[0];
    if (first && first.slug) {
      seen.length = 0;
      const r = await request(app).get("/api/collections/" + first.slug);
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.body.data.listings));
      assert.ok(!scans("listings"), "GET /api/collections/:slug must not SELECT * FROM listings ORDER BY");
      assert.ok(!scans("users"), "GET /api/collections/:slug must not SELECT * FROM users ORDER BY");
    }
  } finally {
    pool.query = orig;
  }
});
