/**
 * social.querycount.test.js — routes/follow.js and routes/shortlist.js stop
 * full-scanning users / listings (BACKEND-AUDIT.md Phase 7 sweep-4, 7-social).
 *
 * follow.js did `store.findOne/findMany("follows.json", pred)` + `store.all("users.json")`
 * (x2) + `store.getById("users.json", …)`; shortlist.js did
 * `store.findOne/findMany("shortlist.json", pred)` + `store.all("listings.json")` +
 * `store.all("users.json")`. Now: `repoForCollection("follows.json"|"shortlist.json")`
 * criteria reads, `identity.hydrateUsersByIds` / `identity.getSellerBrowseCards`
 * (WHERE id = ANY), and per-id `store.getById("listings.json", …)` for the composite
 * doc (which stays on store by design). follow.js no longer imports lib/store at all.
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

test("follow / shortlist reads don't full-scan users or listings (Phase 7 sweep-4)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const followSrc = fs.readFileSync(path.join(__dirname, "../routes/follow.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(followSrc),
    "routes/follow.js must not require lib/store"
  );

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
    for (const p of ["/api/follow/me", "/api/shortlist"]) {
      seen.length = 0;
      const r = await request(app).get(p).set(H);
      assert.equal(r.status, 200, p);
      assert.ok(!scans("users"), `${p} must not SELECT * FROM users ORDER BY`);
      assert.ok(!scans("listings"), `${p} must not SELECT * FROM listings ORDER BY`);
    }

    seen.length = 0;
    const r = await request(app).get("/api/follow/usr_admin/followers");
    assert.equal(r.status, 200);
    assert.ok(!scans("users"), "GET /api/follow/:id/followers must not SELECT * FROM users ORDER BY");
  } finally {
    pool.query = orig;
  }
});
