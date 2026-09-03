/**
 * social-content.querycount.test.js — routes/blogs.js and routes/categorySuggestions.js
 * stop full-scanning users and read their own collections through a flat repo
 * (BACKEND-AUDIT.md Phase 7 sweep-5, 7-social).
 *
 * blogs.js did `store.all("blogs.json")` + `store.all("users.json")` (attachAuthors);
 * categorySuggestions.js did `store.all("category-suggestions.json")` +
 * `store.all("categories.json")`. Now: `repoForCollection(...)` criteria reads,
 * `identity.hydrateUsersByIds` (WHERE id = ANY), an atomic `incrementById` for the
 * blog view counter. Neither route imports lib/store any more.
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

test("blogs / category-suggestions don't full-scan users (Phase 7 sweep-5)", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  for (const f of ["blogs.routes.js", "categorySuggestions.routes.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "../modules/directory/routes", f), "utf8");
    assert.ok(
      !/require\(["']\.\.\/lib\/store["']\)/.test(src),
      `modules/directory/routes/${f} must not require lib/store`
    );
  }

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed user usr_admin missing — run `npm run test:setup`");
  const H = { Authorization: `Bearer ${auth.signToken(admin)}` };

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };
  const has = (re) => seen.some((s) => re.test(s));

  try {
    seen.length = 0;
    const b = await request(app).get("/api/blogs");
    assert.equal(b.status, 200);
    assert.ok(Array.isArray(b.body.data));
    assert.ok(!has(/SELECT \* FROM users\s+ORDER BY/i), "GET /api/blogs must not SELECT * FROM users ORDER BY");
    assert.ok(has(/FROM\s+"?blogs"?\s+WHERE/i), "GET /api/blogs filters blogs in SQL");

    seen.length = 0;
    const s = await request(app).get("/api/category-suggestions").set(H);
    assert.equal(s.status, 200);
    assert.ok(Array.isArray(s.body.data));
    assert.ok(has(/FROM\s+"?category_suggestions"?/i), "GET /api/category-suggestions reads via SQL");
  } finally {
    pool.query = orig;
  }
});
