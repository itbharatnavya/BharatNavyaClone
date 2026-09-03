/**
 * referral.querycount.test.js — routes/referral.js off lib/store (BACKEND-AUDIT.md
 * Phase 7 sweep-10, 7-monetization).
 *
 * Was: `store.withLock`/`readJson`/`writeJson`/`findOne`/`nextId` on
 * `referrals.json`. Now `repoForCollection("referrals.json")`: `ensureRow` =
 * findOne → insert (the `referrals.code` UNIQUE constraint is the real dup guard;
 * a lost insert race is swallowed + re-read); `redeem` = findOne(code) → updateById
 * (read-modify-write, as before — the old in-process lock never spanned processes).
 * Request/response shapes unchanged (frontend `getReferralCode`/`redeemReferral`).
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
const { repoForCollection } = require("../modules/_shared");
const { pool } = require("../modules/_shared/pool");

const referralsRepo = repoForCollection("referrals.json");

test("referral: repo swap, dup-safe ensureRow, redeem credits (Phase 7 sweep-10)", async (t) => {
  let rowId = null; // the row under test (id known once created/found)
  let weCreatedIt = false; // only delete rows this test inserted
  let restore = null; // { credits, invitedUserIds } to put back on a pre-existing seed row
  t.after(async () => {
    if (rowId && weCreatedIt) await referralsRepo.deleteById(rowId).catch(() => {});
    else if (rowId && restore) await referralsRepo.updateById(rowId, restore).catch(() => {});
    await pool.end().catch(() => {});
  });

  const src = fs.readFileSync(path.join(__dirname, "../routes/referral.js"), "utf8");
  assert.ok(
    !/require\(["']\.\.\/lib\/store["']\)/.test(src),
    "routes/referral.js must not require lib/store"
  );

  // A owns a referral code; B redeems it.
  const A = await store.getById("users.json", "usr_s001");
  const B = await store.getById("users.json", "usr_s002");
  assert.ok(A && B, "seed users usr_s001 / usr_s002 missing — run `npm run test:setup`");

  const pre = await referralsRepo.findOne({ where: { userId: A.id } });
  if (pre) {
    rowId = pre.id;
    restore = { credits: pre.credits, invitedUserIds: pre.invitedUserIds || [] };
  } else {
    const HA = { Authorization: `Bearer ${auth.signToken(A)}` };
    const mc = await request(app).get("/api/referral/my-code").set(HA);
    assert.equal(mc.status, 200);
    assert.match(mc.body.data.code, /^BS[A-Z0-9]{8}$/);
    assert.equal(mc.body.data.credits, 0);
    rowId = (await referralsRepo.findOne({ where: { userId: A.id } })).id;
    weCreatedIt = true;
  }

  // ensureRow is idempotent — a second call makes no second row.
  await request(app).get("/api/referral/my-code").set({ Authorization: `Bearer ${auth.signToken(A)}` });
  assert.equal((await referralsRepo.findMany({ where: { userId: A.id } })).length, 1);

  const code = (await referralsRepo.findById(rowId)).code;
  const creditsBefore = Number((await referralsRepo.findById(rowId)).credits) || 0;
  const HB = { Authorization: `Bearer ${auth.signToken(B)}` };

  const r1 = await request(app).post("/api/referral/redeem").set(HB).send({ code });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.data.ok, true);
  assert.equal(r1.body.data.referrer.userId, A.id);
  assert.equal(r1.body.data.referrer.credits, creditsBefore + 1);
  assert.equal(r1.body.data.referrer.invitedCount, 1);

  // Idempotent redeem — same user, no double credit.
  const r2 = await request(app).post("/api/referral/redeem").set(HB).send({ code });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.data.referrer.credits, creditsBefore + 1);

  const row = await referralsRepo.findById(rowId);
  assert.deepEqual(row.invitedUserIds, [B.id]);
  assert.equal(Number(row.credits), creditsBefore + 1);

  // reset credits/invited so the frozen row (if it pre-existed) is left as found
  // (t.after restores/deletes the row)
});
