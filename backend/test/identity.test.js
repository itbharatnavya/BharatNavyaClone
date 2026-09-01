/**
 * identity.test.js — Phase 3 read-port guarantees (BACKEND-AUDIT.md).
 *
 * The load-bearing assertion: identity.getAuthUser(id) is byte-identical to
 * store.getById("users.json", id) — middleware/authGuard.js now loads req.user
 * through it, so any drift here changes every authenticated request.
 *
 * Runs against the frozen PG_URL_TEST DB (`npm run test:setup`).
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const store = require("../lib/store");
const identity = require("../modules/identity");
const { pool } = require("../modules/_shared");

const SEED_IDS = ["usr_admin", "usr_s007", "usr_emp4", "usr_000026"];

test("identity read-port", async (t) => {
  t.after(async () => {
    await pool.end().catch(() => {});
  });

  await t.test("getAuthUser is byte-identical to store.getById", async () => {
    for (const id of SEED_IDS) {
      const viaStore = await store.getById("users.json", id);
      assert.ok(viaStore, `seed user ${id} missing — run \`npm run test:setup\``);
      assert.deepEqual(await identity.getAuthUser(id), viaStore, `getAuthUser(${id})`);
    }
  });

  await t.test("getAuthUser(missing / null) returns null, never throws", async () => {
    assert.equal(await identity.getAuthUser(null), null);
    assert.equal(await identity.getAuthUser("usr_does_not_exist"), null);
  });

  await t.test("employer card: expected shape, no contact fields", async () => {
    const card = await identity.getEmployerCard("usr_emp4");
    assert.deepEqual(
      Object.keys(card).sort(),
      ["city", "companyName", "id", "isVerified", "logo", "slug", "state"]
    );
    for (const leak of ["contactMobile", "contactEmail", "phone", "email"]) {
      assert.ok(!(leak in card), `card must not expose ${leak}`);
    }
  });

  await t.test("seller / candidate cards resolve without contact leakage", async () => {
    const s = await identity.getSellerCard("usr_s007");
    const c = await identity.getCandidateCard("usr_000026");
    assert.equal(s.id, "usr_s007");
    assert.equal(c.id, "usr_000026");
    for (const card of [s, c]) {
      for (const leak of ["contactMobile", "contactEmail", "phone"]) {
        assert.ok(!(leak in card));
      }
    }
  });

  await t.test("batch card readers equal N single reads, and dedupe", async () => {
    const ids = ["usr_emp4", "usr_000026"];
    const batch = await identity.getEmployerCards(ids);
    const singles = await Promise.all(ids.map((id) => identity.getEmployerCard(id)));
    assert.deepEqual(batch, singles);

    const deduped = await identity.getEmployerCards(["usr_emp4", "usr_emp4"]);
    assert.equal(deduped.length, 1);
  });
});
