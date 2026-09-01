/**
 * reviews-recent.querycount.test.js — the homepage review feeds stop full-scanning
 * users + listings (BACKEND-AUDIT.md Phase 5 loose end).
 *
 * GET /api/reviews/recent did `store.all("reviews.json")` + `store.all("users.json")`
 * (full composite hydrate of every user) + `store.all("listings.json")` (every
 * listing) just to attach the reviewed seller's business fields and one photo.
 * GET /api/reviews/recruitment-recent did the users scan too. Now: reviewsRepo
 * criteria read, `identity.getReviewFeedParties` (one WHERE id = ANY), and
 * `directory.firstListingImageBySeller` (one DISTINCT ON) — all id-scoped.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const { pool } = require("../modules/_shared/pool");

test("GET /api/reviews/recent + /recruitment-recent don't full-scan users or listings (Phase 5)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  // The composite all() full-hydrate signature is always `SELECT * FROM <tbl> ORDER BY`;
  // authGuard's by-id `SELECT * FROM users WHERE id = $1` has no ORDER BY, so it won't match.
  const scanned = (tbl) => seen.some((s) => new RegExp(`SELECT \\* FROM ${tbl}\\s+ORDER BY`, "i").test(s));

  try {
    seen.length = 0;
    const r1 = await request(app).get("/api/reviews/recent");
    assert.equal(r1.status, 200);
    assert.ok(Array.isArray(r1.body.data));
    assert.ok(!scanned("users"), "GET /api/reviews/recent must not SELECT * FROM users ORDER BY");
    assert.ok(!scanned("listings"), "GET /api/reviews/recent must not SELECT * FROM listings ORDER BY");

    seen.length = 0;
    const r2 = await request(app).get("/api/reviews/recruitment-recent");
    assert.equal(r2.status, 200);
    assert.ok(Array.isArray(r2.body.data));
    assert.ok(!scanned("users"), "GET /api/reviews/recruitment-recent must not full-scan users");
    assert.ok(!scanned("listings"), "GET /api/reviews/recruitment-recent must not full-scan listings");
  } finally {
    pool.query = orig;
  }
});
