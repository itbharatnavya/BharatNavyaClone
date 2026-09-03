/**
 * admin-inquiries.querycount.test.js — routes/adminInquiries.js off lib/store
 * (BACKEND-AUDIT.md Phase 7 sweep-8, 7-monetization).
 *
 * GET / did `store.all("inquiries.json")` + `store.readJsonl("leads-ledger.jsonl")`
 * + `store.all("users.json")` (full composite hydrate of every user, just for the
 * page's seller minis). Now: `repoForCollection("inquiries.json")`,
 * `leads.readLedger()`, and `identity.hydrateUsersByIds` scoped to the sellers on
 * the current page's leads. forward/dismiss getById/update → the repo; the
 * seller-existence check → `identity.filterSellerIds` (indexed `seller_profiles`).
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

test("adminInquiries GET / doesn't full-hydrate users (Phase 7 sweep-8)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../routes/adminInquiries.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(src),
    "routes/adminInquiries.js must not require lib/store"
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
  try {
    const r = await request(app).get("/api/admin/inquiries?limit=5").set(H);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.data.items));
    assert.ok(
      !seen.some((s) => /SELECT \* FROM users\s+ORDER BY/i.test(s)),
      "GET /api/admin/inquiries must not SELECT * FROM users ORDER BY"
    );
    assert.ok(seen.some((s) => /FROM\s+"?inquiries"?/i.test(s)), "reads inquiries via SQL");
  } finally {
    pool.query = orig;
  }
});
