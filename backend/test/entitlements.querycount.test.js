/**
 * entitlements.querycount.test.js — routes/entitlements.js off lib/store
 * (BACKEND-AUDIT.md Phase 7 sweep-8, 7-monetization).
 *
 * `compose()` did `store.all("features.json")` + `store.all("subscription-plans.json")`;
 * the admin PUT did `store.update` on both. Now `repoForCollection(...)` for each.
 * The `entitlements` golden guards GET /api/entitlements byte-for-byte.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("entitlements reads features + plans via repo, not lib/store (Phase 7 sweep-8)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../routes/entitlements.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(src),
    "routes/entitlements.js must not require lib/store"
  );

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  try {
    const r = await request(app).get("/api/entitlements");
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data.tiers) && Array.isArray(r.body.data.features));
    assert.ok(seen.some((s) => /FROM\s+"?features"?/i.test(s)), "reads features via SQL");
    assert.ok(seen.some((s) => /FROM\s+"?subscription_plans"?/i.test(s)), "reads subscription_plans via SQL");
  } finally {
    pool.query = orig;
  }
});
