/**
 * pagination.test.js — the edge cases where the Phase 4/5 rewrite of `.slice()` into
 * SQL `LIMIT`/`OFFSET` tends to break (BACKEND-AUDIT.md Phase 0 + "Where this
 * typically goes wrong"). Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 *
 * For every paginated list endpoint:
 *   - page 0 / negative        -> clamped to page 1, not an empty result or a crash
 *   - page past the last       -> empty item list, envelope still well-formed
 *   - limit 0                  -> clamped to a sane default, not a 500 / everything
 *   - limit 9999               -> capped (jobs 50, admin 100, listings 1000 — C9 fixed
 *                                 in the 1f wiring pass)
 *   - DISJOINTNESS: page 1 and page 2 share no ids  <- the assertion that actually
 *     catches a nondeterministic ORDER BY after the SQL migration
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");
const auth = require("../lib/auth");
const store = require("../lib/pg-store");

const ENDPOINTS = [
  { name: "GET /api/jobs", base: "/api/jobs", itemsKey: "jobs", limitCap: 50, auth: null },
  { name: "GET /api/listings", base: "/api/listings", itemsKey: "listings", limitCap: 1000, auth: null },
  { name: "GET /api/admin/users", base: "/api/admin/users", itemsKey: "items", limitCap: 100, auth: "usr_admin" },
];

const ids = (arr) => arr.map((x) => x && x.id).filter(Boolean);
const q = (base, params) => base + (base.includes("?") ? "&" : "?") + params;

test("pagination edge cases", async (t) => {
  for (const ep of ENDPOINTS) {
    let bearer = null;
    if (ep.auth) {
      const u = await store.getById("users.json", ep.auth);
      assert.ok(u, `seed user ${ep.auth} missing — run \`npm run test:setup\``);
      bearer = `Bearer ${auth.signToken(u)}`;
    }
    const get = (url) => {
      const r = request(app).get(url);
      return bearer ? r.set("Authorization", bearer) : r;
    };

    await t.test(ep.name, async () => {
      // Baseline: small page size so there are at least 2 pages.
      const p1 = await get(q(ep.base, "page=1&limit=5"));
      assert.equal(p1.status, 200, p1.text);
      const d1 = p1.body.data;
      assert.ok(Array.isArray(d1[ep.itemsKey]), `data.${ep.itemsKey} is an array`);
      assert.equal(typeof d1.total, "number");
      assert.equal(typeof d1.totalPages, "number");
      assert.equal(d1.page, 1);

      // --- page 0 -> clamped to 1 ---
      const p0 = (await get(q(ep.base, "page=0&limit=5"))).body.data;
      assert.equal(p0.page, 1, "page=0 clamps to 1");
      assert.deepEqual(ids(p0[ep.itemsKey]), ids(d1[ep.itemsKey]), "page=0 returns the first page");

      // --- negative page -> clamped to 1 ---
      const pNeg = (await get(q(ep.base, "page=-3&limit=5"))).body.data;
      assert.equal(pNeg.page, 1, "page=-3 clamps to 1");

      // --- page past the last -> empty, envelope intact ---
      const far = (await get(q(ep.base, "page=99999&limit=5"))).body.data;
      assert.deepEqual(far[ep.itemsKey], [], "page past last is empty");
      assert.equal(far.total, d1.total, "total unchanged on an out-of-range page");
      assert.equal(far.totalPages, d1.totalPages, "totalPages unchanged");

      // --- limit 0 -> clamped, not a crash, not "everything" ---
      const l0 = await get(q(ep.base, "page=1&limit=0"));
      assert.equal(l0.status, 200, "limit=0 does not 500");
      const l0d = l0.body.data;
      assert.ok(l0d[ep.itemsKey].length >= 1, "limit=0 falls back to a non-empty default");
      assert.ok(l0d[ep.itemsKey].length < Math.max(2, l0d.total), "limit=0 does not return the whole table");

      // --- limit 9999 -> capped where a cap exists ---
      const lBig = (await get(q(ep.base, "page=1&limit=9999"))).body.data;
      if (ep.limitCap !== null) {
        assert.ok(
          lBig[ep.itemsKey].length <= ep.limitCap,
          `limit=9999 capped at ${ep.limitCap} (got ${lBig[ep.itemsKey].length})`
        );
      } else {
        // listings: no cap today (C9). Document it — a future cap should trip this.
        assert.ok(
          lBig[ep.itemsKey].length <= lBig.total,
          "listings limit=9999 returns at most `total` (currently uncapped — C9)"
        );
      }

      // --- DISJOINTNESS: consecutive pages must not overlap ---
      if (d1.total > 5) {
        const p2 = (await get(q(ep.base, "page=2&limit=5"))).body.data;
        const s1 = new Set(ids(d1[ep.itemsKey]));
        const overlap = ids(p2[ep.itemsKey]).filter((id) => s1.has(id));
        assert.deepEqual(overlap, [], "page 1 and page 2 share no ids (stable ORDER BY)");
      }
    });
  }
});
