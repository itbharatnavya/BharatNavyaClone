/**
 * me-dashboard.querycount.test.js — routes/users.js GET /api/me/listings +
 * GET /api/me/analytics off the every-row store scans (BACKEND-AUDIT.md Phase 7
 * sweep-13, the last Phase 6 deferral).
 *
 * /me/listings was `store.all("listings.json")` (composite hydrate of EVERY
 * listing) + a JS sellerId filter. Now `directory.sellerListingIds(me)` (indexed
 * id list) + a per-id `store.getById` composite hydrate (stays on store by design).
 *
 * /me/analytics was `store.all("listings.json")` + `store.all("inquiries.json")`
 * + `store.all("reviews.json")` + the leads-ledger. Now
 * `directory.sellerListingStats(me)` (lean, indexed) + `directory.reviewsRepo`
 * criteria query + `repoForCollection("inquiries.json")` + `leads.readLedger()`.
 * Response shapes unchanged (no golden — proven byte-identical old-vs-new for 8
 * sellers by a scratch equivalence run).
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

test("me-dashboard: /me/listings + /me/analytics read via indexed module ports (Phase 7 sweep-13)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const users = await store.all("users.json");
  const seller = users.find((u) => u.sellerProfile);
  assert.ok(seller, "seed has at least one seller");
  const H = { Authorization: `Bearer ${auth.signToken(seller)}` };

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const hit = (re) => seen.some((s) => re.test(s));

  try {
    // --- GET /api/me/listings -------------------------------------------------
    seen.length = 0;
    const rl = await request(app).get("/api/me/listings").set(H);
    assert.equal(rl.status, 200);
    assert.ok(rl.body.data && Array.isArray(rl.body.data.listings), "envelope shape");
    assert.equal(rl.body.data.total, rl.body.data.listings.length);

    assert.ok(hit(/SELECT id FROM listings WHERE seller_id = \$1/i), "/me/listings uses the indexed seller id list");
    assert.ok(!hit(/SELECT \* FROM listings ORDER BY id ASC/i), "/me/listings must NOT scan every listing");
    assert.ok(
      !hit(/FROM listing_media WHERE listing_id = ANY/i),
      "/me/listings must NOT batch-hydrate every listing's children"
    );

    // --- GET /api/me/analytics ---------------------------------------------------
    seen.length = 0;
    const ra = await request(app).get("/api/me/analytics").set(H);
    assert.equal(ra.status, 200);
    assert.ok(ra.body.data && typeof ra.body.data.totalListings === "number", "envelope shape");

    assert.ok(hit(/FROM listings WHERE seller_id = \$1/i), "/me/analytics reads listing stats by seller_id");
    assert.ok(!hit(/SELECT \* FROM listings ORDER BY id ASC/i), "/me/analytics must NOT scan every listing");
    assert.ok(hit(/FROM\s+"?reviews"?\s+WHERE/i), "/me/analytics filters reviews in SQL");
    assert.ok(!hit(/SELECT \* FROM reviews ORDER BY/i), "/me/analytics must NOT scan every review");
  } finally {
    pool.query = orig;
  }
});
