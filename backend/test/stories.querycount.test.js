/**
 * stories.querycount.test.js — routes/stories.js off lib/store (BACKEND-AUDIT.md
 * Phase 7 sweep-6, 7-social).
 *
 * The route dropped `lib/store` entirely:
 *  - GET / sweep-on-read was `store.all` + filter + `store.writeJson(kept)` — now a
 *    single `storiesRepo.deleteWhere({ where: { isHighlight:{ne:true},
 *    _or:[{expiresAt:{lte:now}},{expiresAt:{isNull:true}}] } })` (new kernel method).
 *  - the seller lookup for grouping was `store.all("users.json")` — now
 *    `identity.hydrateUsersByIds`.
 *  - getById/update/insert/remove + the view counter → `storiesRepo` (+ atomic
 *    `incrementById`).
 *
 * This test proves the sweep prunes exactly the right rows: an expired non-highlight
 * is deleted, an expired highlight and a fresh non-highlight survive.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const request = require("supertest");

const app = require("../app");
const store = require("../lib/pg-store");
const { repoForCollection } = require("../modules/_shared");
const { pool } = require("../modules/_shared/pool");

const storiesRepo = repoForCollection("stories.json");

test("stories GET / sweep prunes only expired non-highlights (Phase 7 sweep-6)", async (t) => {
  const created = [];
  t.after(async () => {
    for (const id of created) await storiesRepo.deleteById(id).catch(() => {});
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../modules/directory/routes/stories.routes.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(src),
    "routes/stories.js must not require lib/store"
  );

  const seller = await store.getById("users.json", "usr_admin");
  assert.ok(seller, "seed user usr_admin missing — run `npm run test:setup`");

  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const base = { sellerId: seller.id, authorType: "seller", media: { type: "image", url: "u" }, views: 0 };

  const expiredPlain = await storiesRepo.insert(
    { ...base, caption: "sweep-me", createdAt: past, expiresAt: past, isHighlight: false }, "story"
  );
  const expiredHighlight = await storiesRepo.insert(
    { ...base, caption: "keep-pinned", createdAt: past, expiresAt: past, isHighlight: true }, "story"
  );
  const freshPlain = await storiesRepo.insert(
    { ...base, caption: "keep-fresh", createdAt: future, expiresAt: future, isHighlight: false }, "story"
  );
  created.push(expiredPlain.id, expiredHighlight.id, freshPlain.id);

  const orig = pool.query.bind(pool);
  const seen = [];
  pool.query = (...args) => {
    seen.push(typeof args[0] === "string" ? args[0] : (args[0] && args[0].text) || "");
    return orig(...args);
  };

  try {
    const r = await request(app).get("/api/stories");
    assert.equal(r.status, 200);
    assert.ok(!seen.some((s) => /SELECT \* FROM users\s+ORDER BY/i.test(s)), "must not full-scan users");

    assert.equal(await storiesRepo.findById(expiredPlain.id), null, "expired non-highlight is swept");
    assert.ok(await storiesRepo.findById(expiredHighlight.id), "expired highlight survives (pinned)");
    assert.ok(await storiesRepo.findById(freshPlain.id), "fresh non-highlight survives");

    const grp = (r.body.data || []).find((g) => g.sellerId === seller.id);
    assert.ok(grp, "seller's fresh story shows in the feed");
    const ids = grp.stories.map((s) => s.id);
    assert.ok(ids.includes(freshPlain.id), "fresh story present in feed");
    assert.ok(!ids.includes(expiredHighlight.id), "expired highlight excluded from the 24h feed");
  } finally {
    pool.query = orig;
  }
});
