/**
 * admin-write-allowlist.test.js — the admin CRUD handlers that used to
 * `{...req.body}` straight into store.insert/update now pick a named field list
 * (BACKEND-AUDIT.md Phase 6a-sec / S1 1a-admin).
 *
 * Proves a caller can no longer inject `id` / `createdAt` / arbitrary keys through
 * POST|PUT /api/admin/plans, /api/admin/ad-slots, PUT /api/admin/payments/:id,
 * while the legitimate fields still round-trip.
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

test("admin write handlers ignore injected id/timestamps/unknown keys (Phase 6a-sec)", async (t) => {
  // Rows this test creates in the shared frozen DB — removed in t.after so the
  // `entitlements` golden (which reads subscription-plans.json) stays stable.
  const created = { "subscription-plans.json": [], "ad-slots.json": [], "payment-records.json": [] };
  t.after(async () => {
    for (const [coll, ids] of Object.entries(created)) {
      for (const id of ids) await store.remove(coll, id).catch(() => {});
    }
    await pool.end().catch(() => {});
  });

  const admin = await store.getById("users.json", "usr_admin");
  assert.ok(admin, "seed user usr_admin missing — run `npm run test:setup`");
  const AUTH = { Authorization: `Bearer ${auth.signToken(admin)}` };

  /* ---- POST /api/admin/plans -------------------------------------------- */
  const planPost = await request(app)
    .post("/api/admin/plans")
    .set(AUTH)
    .send({
      // a realistic full payload — verified_badge_included / analytics_enabled are
      // NOT NULL and the flat mapper always emits every mapped column, so a partial
      // body 500s on either code path (pre-existing; not what this test is about).
      name: "Allowlist Test Plan",
      tier: "gold",
      billingCycle: "monthly",
      listingLimit: 42,
      leadQuotaPerCycle: 100,
      featuredCreditsPerCycle: 5,
      rankBoostBaseline: 1.5,
      verifiedBadgeIncluded: true,
      analyticsEnabled: true,
      perLeadPrice: 0,
      tierRank: 7,
      id: "plan_INJECTED",
      createdAt: "1999-01-01T00:00:00.000Z",
      bogusKey: "should-not-persist",
    });
  assert.equal(planPost.status, 201);
  const plan = planPost.body.data;
  created["subscription-plans.json"].push(plan.id);
  assert.notEqual(plan.id, "plan_INJECTED", "injected id must be ignored");
  assert.match(plan.id, /^plan_/, "id is server-generated");
  assert.notEqual(plan.createdAt, "1999-01-01T00:00:00.000Z", "injected createdAt ignored");
  assert.equal(plan.bogusKey, undefined, "unknown key dropped");
  assert.equal(plan.listingLimit, 42, "legit field round-trips");
  assert.equal(plan.tierRank, 7, "legit field round-trips");
  assert.equal(plan.verifiedBadgeIncluded, true, "legit boolean round-trips");

  /* ---- PUT /api/admin/plans/:id --------------------------------------- */
  const planPut = await request(app)
    .put(`/api/admin/plans/${plan.id}`)
    .set(AUTH)
    .send({ id: "plan_OTHER", listingLimit: 99, bogusKey: 1 });
  assert.equal(planPut.status, 200);
  assert.equal(planPut.body.data.id, plan.id, "PK cannot be rewritten via body");
  assert.equal(planPut.body.data.listingLimit, 99);
  assert.equal(planPut.body.data.bogusKey, undefined);

  /* ---- POST /api/admin/ad-slots ------------------------------------- */
  const slotPost = await request(app)
    .post("/api/admin/ad-slots")
    .set(AUTH)
    .send({ name: "Allowlist Slot", placementType: "home_hero", isActive: false, id: "slot_INJECTED", junk: 2 });
  assert.equal(slotPost.status, 201);
  const slot = slotPost.body.data;
  created["ad-slots.json"].push(slot.id);
  assert.notEqual(slot.id, "slot_INJECTED");
  assert.match(slot.id, /^slot_/);
  assert.equal(slot.junk, undefined);
  assert.equal(slot.isActive, false, "explicit isActive:false honored (not the default true)");

  /* ---- PUT /api/admin/payments/:id --------------------------------- */
  const payPost = await request(app)
    .post("/api/admin/payments")
    .set(AUTH)
    .send({ sellerId: "usr_s002", amount: 500, paymentStatus: "pending" });
  assert.equal(payPost.status, 201);
  const payId = payPost.body.data.id;
  created["payment-records.json"].push(payId);
  const origCreatedAt = payPost.body.data.createdAt;

  const payPut = await request(app)
    .put(`/api/admin/payments/${payId}`)
    .set(AUTH)
    .send({ id: "pay_OTHER", createdAt: "1999-01-01T00:00:00.000Z", amount: 750, paymentStatus: "paid" });
  assert.equal(payPut.status, 200);
  assert.equal(payPut.body.data.id, payId, "PK cannot be rewritten");
  assert.equal(payPut.body.data.createdAt, origCreatedAt, "createdAt cannot be rewritten");
  assert.equal(payPut.body.data.amount, 750);
  assert.equal(payPut.body.data.paymentStatus, "paid");
  assert.ok(payPut.body.data.markedPaidDate, "settle still stamps markedPaidDate");
});
